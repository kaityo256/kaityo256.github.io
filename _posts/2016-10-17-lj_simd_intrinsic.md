---
layout: post
title: "LJの力計算を組み込み関数で書いて馬鹿SIMD化"
tags: [programming, qiita]
permalink: lj_simd_intrinsic
---

# LJの力計算を組み込み関数で書いて馬鹿SIMD化

## はじめに

[LJの力計算を組み込み関数で書いてみる](http://qiita.com/kaityo256/items/0d3094de324f0e63d1f4)の続き。組み込み関数で書いたところを4倍にループアンロールして馬鹿SIMD化してみる。

## 思想

4倍にアンロールして、距離の自乗が(a,a,a,0),(b,b,b,0)・・・の形になってるのをunpackloとshuffleで(a,b,c,d)にして力を計算。力が(a,b,c,d)になってるのを、permute4x64を4回やってまた(a,a,a,a),(b,b,b,b)...にして力積を計算して書き戻す。


## 計算環境

* Intel(R) Xeon(R) CPU E5-2680 v3 @ 2.50GHz
* icpc (ICC) 16.0.3
* g++ (GCC) 4.8.5

## コード

```cpp
//------------------------------------------------------------------------
#include <immintrin.h>
#include <stdio.h>
//------------------------------------------------------------------------
enum {X, Y, Z};
const int N = 20000;
const double dt = 0.01;
double __attribute__((aligned(32))) q[N][4] = {};
double __attribute__((aligned(32))) p[N][4] = {};
double __attribute__((aligned(32))) c24[4] = {24 * dt, 24 * dt, 24 * dt, 24 * dt};
double __attribute__((aligned(32))) c48[4] = { -48 * dt, -48 * dt, -48 * dt, -48 * dt};
typedef double v4df __attribute__((vector_size(32)));
//------------------------------------------------------------------------
#ifdef MYINTRIN
void
print256(v4df r) {
  double *a = (double*)(&r);
  printf("%.10f %.10f %.10f %.10f\n", a[0], a[1], a[2], a[3]);
}
//------------------------------------------------------------------------
void
calc_intrin(void) {
  const double c24[4] = {24 * dt, 24 * dt, 24 * dt, 24 * dt};
  const double c48[4] = {48 * dt, 48 * dt, 48 * dt, 48 * dt};
  const v4df vc24 = _mm256_load_pd((double*)(c24));
  const v4df vc48 = _mm256_load_pd((double*)(c48));
  for (int i = 0; i < N - 1; i++) {
    const v4df vqi = _mm256_load_pd((double*)(q + i));
    v4df vpi = _mm256_load_pd((double*)(p + i));
    for (int j = i + 1; j < N - 3; j += 4) {
      v4df vqj_a = _mm256_load_pd((double*)(q + j));
      v4df vdq_a = (vqj_a - vqi);
      v4df vd1_a = vdq_a * vdq_a;
      v4df vd2_a = _mm256_permute4x64_pd(vd1_a, 201);
      v4df vd3_a = _mm256_permute4x64_pd(vd1_a, 210);
      v4df vr2_a = vd1_a + vd2_a + vd3_a;

      v4df vqj_b = _mm256_load_pd((double*)(q + j + 1));
      v4df vdq_b = (vqj_b - vqi);
      v4df vd1_b = vdq_b * vdq_b;
      v4df vd2_b = _mm256_permute4x64_pd(vd1_b, 201);
      v4df vd3_b = _mm256_permute4x64_pd(vd1_b, 210);
      v4df vr2_b = vd1_b + vd2_b + vd3_b;

      v4df vqj_c = _mm256_load_pd((double*)(q + j + 2));
      v4df vdq_c = (vqj_c - vqi);
      v4df vd1_c = vdq_c * vdq_c;
      v4df vd2_c = _mm256_permute4x64_pd(vd1_c, 201);
      v4df vd3_c = _mm256_permute4x64_pd(vd1_c, 210);
      v4df vr2_c = vd1_c + vd2_c + vd3_c;

      v4df vqj_d = _mm256_load_pd((double*)(q + j + 3));
      v4df vdq_d = (vqj_d - vqi);
      v4df vd1_d = vdq_d * vdq_d;
      v4df vd2_d = _mm256_permute4x64_pd(vd1_d, 201);
      v4df vd3_d = _mm256_permute4x64_pd(vd1_d, 210);
      v4df vr2_d = vd1_d + vd2_d + vd3_d;

      v4df vr2_ac = _mm256_unpacklo_pd(vr2_a, vr2_c);
      v4df vr2_bd = _mm256_unpacklo_pd(vr2_b, vr2_d);
      v4df vr2 = _mm256_shuffle_pd(vr2_ac, vr2_bd, 12);
      v4df vr6 = vr2 * vr2 * vr2;
      v4df vdf = (vc24 * vr6 - vc48) / (vr6 * vr6 * vr2);

      v4df vdf_a = _mm256_permute4x64_pd(vdf, 0);
      v4df vdf_b = _mm256_permute4x64_pd(vdf, 85);
      v4df vdf_c = _mm256_permute4x64_pd(vdf, 170);
      v4df vdf_d = _mm256_permute4x64_pd(vdf, 255);

      v4df vpj_a = _mm256_load_pd((double*)(p + j));
      vpi += vdq_a * vdf_a;
      vpj_a -= vdq_a * vdf_a;
      _mm256_store_pd((double*)(p + j), vpj_a);

      v4df vpj_b = _mm256_load_pd((double*)(p + j + 1));
      vpi += vdq_b * vdf_b;
      vpj_b -= vdq_b * vdf_b;
      _mm256_store_pd((double*)(p + j + 1), vpj_b);

      v4df vpj_c = _mm256_load_pd((double*)(p + j + 2));
      vpi += vdq_c * vdf_c;
      vpj_c -= vdq_c * vdf_c;
      _mm256_store_pd((double*)(p + j + 2), vpj_c);

      v4df vpj_d = _mm256_load_pd((double*)(p + j + 3));
      vpi += vdq_d * vdf_d;
      vpj_d -= vdq_d * vdf_d;
      _mm256_store_pd((double*)(p + j + 3), vpj_d);
    }
    _mm256_store_pd((double*)(p + i), vpi);
    for (int j = N - (5 - i) % 4; j < N; j++) {
      const double dx = q[j][X] - q[i][X];
      const double dy = q[j][Y] - q[i][Y];
      const double dz = q[j][Z] - q[i][Z];
      const double r2 = (dx * dx + dy * dy + dz * dz);
      double r6 = r2 * r2 * r2;
      double df = (24.0 * r6 - 48.0) / (r6 * r6 * r2) * dt;
      p[i][X] += df * dx;
      p[i][Y] += df * dy;
      p[i][Z] += df * dz;
      p[j][X] -= df * dx;
      p[j][Y] -= df * dy;
      p[j][Z] -= df * dz;
    }
  }
}
#endif
//------------------------------------------------------------------------
#ifdef MYASM
static void
calc_asm(void) {
  __asm__ (
    "xor %r10, %r10\n\t" // r10 = i = 0
    "mov $q, %ecx\n\t"
    "mov $p, %edx\n\t"
    "vmovapd c24(%rip), %ymm8\n\t" // ymm4 = (24,24,24,0)
    "vmovapd c48(%rip), %ymm9\n\t" // ymm5 = (48,48,48,0)
    "I.LOOP:\n\t"
    "vmovapd (%ecx), %ymm7\n\t" // qi
    "vmovapd (%edx), %ymm6\n\t" // pi
    "mov %ecx, %ebx\n\t"
    "mov %edx, %eax\n\t"
    "mov %r10, %r11\n\t" // r11 = j = i
    "inc %r11\n\t"
    "J.LOOP:\n\t"
    "add $32,%ebx\n\t"
    "add $32,%eax\n\t"
    "vmovapd (%ebx), %ymm1\n\t" // qj
    "vsubpd %ymm1, %ymm7, %ymm0\n\t" // ymm0 = (dx, dy, dz,0 )
    "vmulpd %ymm0, %ymm0, %ymm1\n\t" // ymm1 = (dx**2, dy**2, dz**2,0)
    "vpermpd $201, %ymm1, %ymm2\n\t" // ymm2 = (dy**2, dz**2, dx**2,0)
    "vpermpd $210, %ymm1, %ymm3\n\t" // ymm3 = (dz**2, dx**2, dy**2,0)
    "vaddpd %ymm1, %ymm2, %ymm1\n\t" // ymm1 = (xy,yz,zx,0)
    "vaddpd %ymm1, %ymm3, %ymm1\n\t" // ymm1 = (r2,r2,r2,0)
    "vmulpd %ymm1, %ymm1, %ymm2\n\t" // ymm2 = (r4,r4,r4,0)
    "vmulpd %ymm1, %ymm2, %ymm2\n\t" // ymm2 = (r6,r6,r6,0)
    "vmulpd %ymm2, %ymm2, %ymm3\n\t" // ymm3 = (r12,r12,r12,0)
    "vmulpd %ymm1, %ymm3, %ymm3\n\t" // ymm3 = (r14,r14,r14,0)
    "vfmadd132pd %ymm8, %ymm9, %ymm2\n\t" // ymm2 = (24.0*r6-48)*dt
    "vdivpd %ymm3, %ymm2, %ymm1\n\t" //ymm1 = (24.0*r6-48)/r14*dt =df
    "vmulpd %ymm1, %ymm0, %ymm0\n\t" // ymm0 = (df*dx, df*dy, df*dz, 0)
    "vaddpd (%eax), %ymm0, %ymm5\n\t"// pj -= df*dt;
    "vsubpd %ymm0, %ymm6, %ymm6\n\t"// pi += df*dt;
    "vmovapd %ymm5, (%eax)\n\t" // ymm5 -> pj
    "inc %r11\n\t" //j++
    "cmp $20000,%r11\n\t"
    "jl J.LOOP\n\t"
    "vmovapd %ymm6, (%edx)\n\t" // ymm6 -> pi
    "add $32,%ecx\n\t"
    "add $32,%edx\n\t"
    "inc %r10\n\t" //i++
    "cmp $19999,%r10\n\t"
    "jl I.LOOP\n\t"
  );
}
#endif
//------------------------------------------------------------------------
void
init(void) {
  for (int i = 0; i < N; i++) {
    q[i][X] = 1.0 + 0.4 * i;
    q[i][Y] = 2.0 + 0.5 * i;
    q[i][Z] = 3.0 + 0.6 * i;
    p[i][X] = 0.0;
    p[i][Y] = 0.0;
    p[i][Z] = 0.0;
  }
}
//------------------------------------------------------------------------
void
check(void) {
  for (int i = 0; i < N - 1; i++) {
    for (int j = i + 1; j < N; j++) {
      const double dx = q[j][X] - q[i][X];
      const double dy = q[j][Y] - q[i][Y];
      const double dz = q[j][Z] - q[i][Z];
      const double r2 = (dx * dx + dy * dy + dz * dz);
      double r6 = r2 * r2 * r2;
      double df = (24.0 * r6 - 48.0) / (r6 * r6 * r2) * dt;
      p[i][X] += df * dx;
      p[i][Y] += df * dy;
      p[i][Z] += df * dz;
      p[j][X] -= df * dx;
      p[j][Y] -= df * dy;
      p[j][Z] -= df * dz;
    }
  }
}
//------------------------------------------------------------------------
void
check_opt(void) {
  for (int i = 0; i < N; i++) {
    const double qix = q[i][X];
    const double qiy = q[i][Y];
    const double qiz = q[i][Z];
    double pix = p[i][X];
    double piy = p[i][Y];
    double piz = p[i][Z];
    for (int j = i + 1; j < N; j++) {
      const double dx = q[j][X] - qix;
      const double dy = q[j][Y] - qiy;
      const double dz = q[j][Z] - qiz;
      const double r2 = (dx * dx + dy * dy + dz * dz);
      double r6 = r2 * r2 * r2;
      double df = (24.0 * r6 - 48.0) / (r6 * r6 * r2) * dt;
      pix += df * dx;
      piy += df * dy;
      piz += df * dz;
      p[j][X] -= df * dx;
      p[j][Y] -= df * dy;
      p[j][Z] -= df * dz;
    }
    p[i][X] = pix;
    p[i][Y] = piy;
    p[i][Z] = piz;
  }
}
//------------------------------------------------------------------------
int
main(void) {
  init();
#ifdef MYINTRIN
  calc_intrin();
#elif MYASM
  calc_asm();
#elif GCC
  check_opt();
#else
  check();
#endif
  for (int i = 0; i < 10; i++) {
    printf("%f %f %f\n", p[i][X], p[i][Y], p[i][Z]);
  }
}
//------------------------------------------------------------------------
```

## 結果

| コンパイルオプション | 速度 [s] | 備考 |
|:--|:-:|:-:|
|  icpc -O3 -xHOST -DMYINTRIN | 0.764  | intrinsic使った奴  |
|  g++ -O3 -DMYASM test.cpp | 2.004  | アセンブラで書いた奴  |
|  icpc -O3 -xHOST -O3 | 0.912  | インテルコンパイラに任せた奴  |
|  g++ -O3 -mavx -DGCC |  1.740 | g++に任せた奴  |

## まとめ

インテルコンパイラに勝った？　微妙に結果が違うのが、誤差なのかミスなのかまだ調査中・・・。

(2016年10月18日追記):

微妙に結果が違ってたのは、ループアンロールの端の処理を間違えてたから。そこを修正し、かつアンロールの端数をちゃんと処理するように修正した上で再計測した時間を結果に反映。確実にインテルコンパイラに勝った。
