---
layout: post
title: "インテルコンパイラの熱意が空回りする話"
tags: [programming, devtools, qiita]
permalink: intel_compiler
---

# インテルコンパイラの熱意が空回りする話

## はじめに

[GCCの最適化がインテルコンパイラより賢くて驚いた話](http://qiita.com/kaityo256/items/72c1bf93a210e450308c)でGCCとインテルコンパイラの比較をしたんだけど、これはちょっとフェアじゃないな、と思って、インテルコンパイラの方が賢くコンパイルできるサンプルを探したつもりが、そっちもGCCの方が早かったので驚いた話のメモ。

## ソース

参考にしたのは[みんな意外とauto vectorizationとか信用してて愕然とする](http://d.hatena.ne.jp/w_o/20150423#1429775436)に掲載されてたコード。ちょっと修正してこんな感じにする。

```c
#include <stdio.h>
void f(int *p, int *q, int n);

int a[7] ={1,2,3,4,5,6,7};
int b[7] ={7,6,5,4,3,2,1};

void
f(int *p, int *q, int n) {
  int i;
  for (i=0; i<n; i++) {
    p[i] *= q[i];
  }
}

int
main(){
  int t0, t1, i;
  for (i=0; i < 100000000; i++) {
    f(a, b, 7);
  }
  for(i=0;i<7;i++){
    printf("%d\n",a[i]);
  }
}
```

これを以下の環境でコンパイル、実行する。

* 石：Intel(R) Xeon(R) CPU E5-2680 v3 @ 2.50GHz
* インテルコンパイラ icc 16.0.1
* gcc 4.8.5

コンパイルオプションは

* icc: -O2 -xHOST
* gcc: -O2 -march=native
* gcc: -O3 -march=native

なお、このコードでは、iccは-O2でも-O3でも同じコードを吐く。

## 結果

perf statで測った実行時間。三回測って平均した。

| コンパイル方法 | 実行時間 [sec] |
|:-----------|------------:|
| icc -O2 -xHOST      |        0.37 |   
| gcc: -O2 -march=native     |      0.36 |   
| gcc: -O3 -march=native     |      0.25 |   

インテルコンパイラはgcc -O2とほぼ同じで、gcc -O3には負けてしまう。

## GCCが吐いたコード

まずGCCが吐いたコードを見てみる。出てくるコードは素直だ。まず-O2。

```
        movl    $100000000, %ecx
.L9:
        xorl    %eax, %eax
.L12:
        movl    a(%rax), %edx
        addq    $4, %rax
        imull   b-4(%rax), %edx
        movl    %edx, a-4(%rax)
        cmpq    $28, %rax
        jne     .L12
        subl    $1, %ecx
        jne     .L9
```

単に`f`をインライン展開し、素直に

```c
  for (i=0; i < 100000000; i++) {
    for(j =0; j<7;j++){ 
      a[j] *= b[j];
    }
  }
```

を計算している。-O3にするとこうなる。

```
        movl    a(%rip), %r10d
        movl    b(%rip), %r15d
        movl    a+4(%rip), %r9d
        movl    b+4(%rip), %r14d
        movl    a+8(%rip), %r8d
        movl    b+8(%rip), %r13d
        movl    a+12(%rip), %edi
        movl    b+12(%rip), %r12d
        movl    a+16(%rip), %esi
        movl    b+16(%rip), %ebp
        movl    a+20(%rip), %ecx
        movl    b+20(%rip), %ebx
        movl    a+24(%rip), %edx
        movl    b+24(%rip), %r11d
.L29:
        imull   %r15d, %r10d
        imull   %r14d, %r9d
        imull   %r13d, %r8d
        imull   %r12d, %edi
        imull   %ebp, %esi
        imull   %ebx, %ecx
        imull   %r11d, %edx
        subl    $1, %eax
        jne     .L29
```

擬似コードにするとこんな感じかな。

```c
  int a0 = a[0];int b0 = b[0];
  int a1 = a[1];int b1 = b[1];
  int a2 = a[2];int b2 = b[2];
  int a3 = a[3];int b3 = b[3];
  int a4 = a[4];int b4 = b[4];
  int a5 = a[5];int b5 = b[5];
  int a6 = a[6];int b6 = b[6];
  for (i=0; i < 100000000; i++) {
    a0 *= b0;
    a1 *= b1;
    a2 *= b2;
    a3 *= b3;
    a4 *= b4;
    a5 *= b5;
    a6 *= b6;
  }
  a[0] = a0; //書き戻し、以下省略
```

配列のサイズが7個ずつ、合計14個なので、全部レジスタに乗る。なのでa,bの要素を一度レジスタに載せて、100000000回掛け算してから配列に書き戻す。SIMD命令は使っていない。

## インテルコンパイラが吐いたコード

さて、インテルコンパイラの場合。インテルコンパイラは頑張ってSIMD命令を使おうとするので、こんなことになる。

```
        vmovdqu   .L_2il0floatpacket.0(%rip), %ymm0             #19.7
        orl       $32832, (%rsp)                                #16.7
        xorl      %edx, %edx                                    #19.5
        vldmxcsr  (%rsp)                                        #16.7
        xorl      %eax, %eax                                    #18.3
                                # LOE rdx rbx r13 r14 r15 eax ymm0
..B1.2:                         # Preds ..B1.4 ..B1.15
        movl      a(,%rdx,4), %esi                              #19.7
        movl      %eax, %ecx                                    #18.3
        vmovdqa   %ymm0, %ymm2                                  #19.7
        vpbroadcastd b(,%rdx,4), %ymm1                          #19.10
                                # LOE rdx rbx r13 r14 r15 eax ecx esi ymm0 ymm1 ymm2
..B1.3:                         # Preds ..B1.3 ..B1.2
        vpmulld   %ymm1, %ymm2, %ymm2                           #19.5
        addl      $32, %ecx                                     #18.3
        vpmulld   %ymm1, %ymm2, %ymm3                           #19.5
        vpmulld   %ymm1, %ymm3, %ymm4                           #19.5
        vpmulld   %ymm1, %ymm4, %ymm2                           #19.5
        cmpl      $100000000, %ecx                              #18.3
        jb        ..B1.3        # Prob 85%                      #18.3
                                # LOE rdx rbx r13 r14 r15 eax ecx esi ymm0 ymm1 ymm2
..B1.4:                         # Preds ..B1.3
        vextracti128 $1, %ymm2, %xmm1                           #19.7
        vpmulld   %xmm1, %xmm2, %xmm3                           #19.7
        vpshufd   $14, %xmm3, %xmm4                             #19.7
        vpmulld   %xmm4, %xmm3, %xmm5                           #19.7
        vpshufd   $57, %xmm5, %xmm6                             #19.7
        vpmulld   %xmm6, %xmm5, %xmm7                           #19.7
        vmovd     %xmm7, %ecx                                   #19.7
        imull     %esi, %ecx                                    #19.7
        movl      %ecx, a(,%rdx,4)                              #19.7
        incq      %rdx                                          #19.5
        cmpq      $7, %rdx                                      #19.5
        jb        ..B1.2        # Prob 100%                     #19.5

```

わりとごちゃごちゃしてるんだけど、たぶん以下のようなことをやっている。

まず、二重ループの内側と外側を交換する。

```c
  for(j =0; j<7;j++){ 
    for (i=0; i < 100000000; i++) {
      a[j] *= b[j];
    }
  }
```

で、ループ中ではb[j]が定数なので外に出す。

```c
  for(j =0; j<7;j++){ 
    int bt = b[j];
    for (i=0; i < 100000000; i++) {
      a[j] *= bt;
    }
  }
```

次、同じものを何度もかけるのだから、ベクトル命令で8個同時に実行させ、'bt**100000000'を計算してからa[j]にかけるよう変形する。

```c
  for(j =0; j<7;j++){ 
    int bt = b[j];
    ymm1 = {bt,bt,bt,bt,bt,bt,bt,bt}; // 乗数
    ymm2 = {1,1,1,1,1,1,1,1}; //初項
    for (i=0; i < 100000000/32; i++) {
       ymm2 = ymm2 * ymm1;
       ymm3 = ymm2 * ymm1;
       ymm4 = ymm3 * ymm1;
       ymm2 = ymm4 * ymm1; // ここで ymm2にbt**4がかかる
    }
    // ymm2 = {bt**(100000000/8), ...}をa[j]に書け戻す
  }
```

内側のループ一回で、`ymm2`に`bt**4`がかかる。8個同時にかけているので一度に32回の乗算をしたことになっている。最後に`ymm2`に入ってる8個の`bt**(100000000/8)`を全部かければ`bt**100000000`になるので、それを`a[j]`にかければ一個おしまい。これを7回繰り返せば計算完了となる。

で、ぱっと見で思うのは、最内ループでレイテンシが見えそうな気がする。4回の掛け算やってるけど、全部ひとつ前の演算に依存している。GCCが吐いたコードでは、最内ループに7回掛け算があるけど、全部独立。この辺にインテルコンパイラの吐いたコードが遅い原因がある気がする。

## まとめ

念のため言っておくと、僕の手元の実コードでは、ほとんどの場合GCCよりもインテルコンパイラの方が早いコードを吐く。だが、こういうベクトル化すると遅くなるようないじわるなコードを食わせると、インテルコンパイラの熱意が空回りして、GCCの素直なコードよりも遅いコードを吐いてしまう。っていうか、ベクトル化するなら、もっと賢くできそうな気が・・・？
