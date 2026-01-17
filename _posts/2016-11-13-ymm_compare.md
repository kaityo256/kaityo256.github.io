---
layout: post
title: "二つの__m256i型変数(YMMレジスタ)が等しいか調べる"
tags: [programming, qiita]
permalink: ymm_compare
---

# 二つの__m256i型変数(YMMレジスタ)が等しいか調べる

## __m256i型変数の比較

`__m256i`型の変数`v1`と`v2`が等しいかどうか調べるのに、`==`を使いたくなるが、

```cpp
  __m256i v1 = _mm256_set_epi32(0,1,2,3,4,5,6,7);
  __m256i v2 = _mm256_set_epi32(0,1,2,3,4,5,6,8);
  if(v1==v2){
    printf("Equal\n");
  }
```

みたいなコードを書くと、コンパイラに

```shell-session
test.cpp(22): error: expression must have bool type (or be convertible to bool)
    if(v1==v2){
       ^
```

とか、

```shell-session
test.cpp: In function ‘int main()’:
test.cpp:22:8: error: could not convert ‘(v1 == v2)’ from ‘__vector(4) long int’ to ‘bool’
   if(v1==v2){
        ^
```

とか言われて怒られてしまう。

二つの__m256i型変数'v1'と'v2'が等しいか調べるには、`_mm256_testz_si256`の二つの引数に`v1-v2`を入れて、その返り値が1かどうか調べれば良い。

## サンプルコード

```cpp
#include <immintrin.h>
#include <stdio.h>
void
print256i(__m256i &y){
  int *x = (int*)(&y);
  printf("%d %d %d %d %d %d %d %d\n",x[7],x[6],x[5],x[4],x[3],x[2],x[1],x[0]);
}
void
cmp(__m256i a, __m256i b){
  print256i(a);
  print256i(b);
  if(_mm256_testz_si256(a-b,a-b)){
    printf("Equal\n");
  }else{
    printf("Not Equal\n");
  }
}
int
main(void){
  __m256i v1 = _mm256_set_epi32(0,1,2,3,4,5,6,7);
  __m256i v2 = _mm256_set_epi32(0,1,2,3,4,5,6,8);
  __m256i v3 = _mm256_set_epi32(0,1,2,3,4,5,6,7);
  cmp(v1,v1);
  cmp(v1,v2);
  cmp(v1,v3);
}
```

実行結果はこんな感じ。

```shell-session
$ g++ -mavx test.cpp    
$ ./a.out
0 1 2 3 4 5 6 7
0 1 2 3 4 5 6 7
Equal
0 1 2 3 4 5 6 7
0 1 2 3 4 5 6 8
Not Equal
0 1 2 3 4 5 6 7
0 1 2 3 4 5 6 7
Equal
```

## 動作原理

`_mm256_testz_si256`に対応する命令は`vptest`で、これは二つのYMMレジスタの全ビットのANDを取って、結果が全部ゼロならZF(ゼロフラグ)を立てる。組み込み関数`_mm256_testz_si256`は、ZFが立っていたら1を、そうでなければ0を返す関数になっている。

なので、`_mm256_testz_si256(x,x)`は、'x'のビットが全て0の時にのみ1を、そうでなければ0を返す。というわけで、`_mm256_testz_si256(v1-v2,v1-v2)`は、'v1'と'v2'の差が全て0、つまり等しい時に1を返す関数になる。

## アセンブリ

一応、どうコンパイルされているか確認してみる。

```cpp
#include <immintrin.h>
int
func(__m256i a, __m256i b){
  return _mm256_testz_si256(a-b,a-b);
}
```

##「icpc -O3 -S」の場合

```nasm
        movl      $1, %edx
        vpsubq    %ymm1, %ymm0, %ymm2
        xorl      %eax, %eax
        vptest    %ymm2, %ymm2
        cmove     %edx, %eax
        ret  
```

うん、まぁそうだよね、という感じ。ちなみに実コード(test.cpp)の組み込み関数のところ

```cpp
if(_mm256_testz_si256(a-b,a-b)){
```
は、ちゃんと'jne'を使うように、つまりいちいち関数の返り値を調べてとかやらないで、直接ZF見るコードを吐いている。

##「g++ -mavx -O3 -S」の場合

```nasm
        .cfi_startproc
        vpextrq $0, %xmm1, %rax
        pushq   %rbp
        .cfi_def_cfa_offset 16
        .cfi_offset 6, -16
        vpextrq $0, %xmm0, %rdx
        vpextrq $1, %xmm1, %rcx
        movq    %rsp, %rbp
        .cfi_def_cfa_register 6
        andq    $-32, %rsp
        vextractf128    $0x1, %ymm1, %xmm1
        addq    $16, %rsp
        subq    %rax, %rdx
        vpextrq $1, %xmm0, %rax
        vextractf128    $0x1, %ymm0, %xmm0
        subq    %rcx, %rax
        vpextrq $0, %xmm1, %rcx
        vpextrq $0, %xmm0, %rsi
        vpextrq $1, %xmm1, %rdi
        subq    %rcx, %rsi
        vpextrq $1, %xmm0, %rcx
        movq    %rsi, -24(%rsp)
        vmovq   -24(%rsp), %xmm4
        movq    %rdx, -24(%rsp)
        subq    %rdi, %rcx
        vmovq   -24(%rsp), %xmm5
        vpinsrq $1, %rax, %xmm5, %xmm1
        xorl    %eax, %eax
        vpinsrq $1, %rcx, %xmm4, %xmm0
        vinsertf128     $0x1, %xmm0, %ymm1, %ymm0
        vptest  %ymm0, %ymm0
        sete    %al
        vzeroupper
        leave
        .cfi_def_cfa 7, 8
        ret
```

なんだ？なんでこんなごちゃごちゃやる必要あるんだ？'__m256i'の関数への渡し方が違うのかと思ったが、普通に'ymm0'、'ymm1'に入れて呼び出しているっぽい。謎。
