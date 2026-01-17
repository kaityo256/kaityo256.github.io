---
layout: post
title: "std::fillとrange-based forを比較"
tags: [programming, qiita]
permalink: fill_vs_rangefor
---

# std::fillとrange-based forを比較

## はじめに

配列とかのクリアをする際、なんとなくstd::fillの書き方が好きじゃなくて、range-based forで書いてたんだけど、それだと速度的にどうなんだろ？と思ってアセンブリ見てみた話。

## コード

int, char, doubleの固定長配列を0クリアするのに、range-based forとstd::fillを使ってみる。

```cpp
#include <vector>
#include <algorithm>
const int N = 100000;
int a[N];
char c[N];
double d[N];

#define VALUE 0

void func_i1(){
  for(auto &v: a)v = VALUE;
}
void func_i2(){
  std::fill(a,a+N,VALUE);
}
void func_c1(){
  for(auto &v: c)v = VALUE;
}
void func_c2(){
  std::fill(c,c+N,VALUE);
}
void func_d1(){
  for(auto &v: d)v = VALUE;
}
void func_d2(){
  std::fill(d,d+N,VALUE);
}

```

0クリアするだけなら

```cpp
int a[N} = {};
```

でいいんだけど、まぁそれはそれ。

コンパイラはIntelコンパイラ16.0.1とGCC 4.8.5。コンパイルオプションはそれぞれ以下のとおり。

```shell-session
$ g++ -std=c++11 -O3 -S test.cpp 
$ icpc -std=c++11 -O3 -xHOST -S test.cpp 
```

## 結果: 0クリアの場合

まずg++。型によらず、全部memset呼ぶだけ。

```
        movl    $400000, %edx
        xorl    %esi, %esi
        movl    $a, %edi
        jmp     memset
```

次にインテルコンパイラ。全部同じコードを吐くが、gccと違って、サイズのチェックをしている。

```
        movl      $a+400000, %eax                               #8.17
        movl      $a, %edi                                      #8.16
        cmpq      %rax, %rdi                                    #8.3
        je        ..B1.4        # Prob 1%                       #8.3
                                # LOE rbx rdi r12 r13 r14 r15
..B1.3:                         # Preds ..B1.1
        xorl      %esi, %esi                                    #8.18
        movl      $400000, %edx                                 #8.18
        call      __intel_avx_rep_memset                        #8.18
```

__intel_avx_rep_memsetは、おそらくAVX命令を使ったmemsetの実装であろう。memsetの引数の最初(edi)と最後(eax)のアドレスを比較し、もし等しければ命令をスキップしている。この場合は必ず等しく無いのだが、どうせチェックにはたいして時間かからないので良しとしているのであろう。コンパイラも、これが等しい確率は低い(Prob 1%)と予想している。

インテルコンパイラでstd::fillの場合も同じコードを吐くが、条件分岐の確率予測値が異なる。

```
        movl      $a+400000, %eax                               #13.15
        movl      $a, %edi                                      #13.13
        cmpq      %rax, %rdi                                    #13.3
        je        ..B2.4        # Prob 50%                      #13.3
                                # LOE rbx rdi r12 r13 r14 r15
..B2.3:                         # Preds ..B2.1
        xorl      %esi, %esi                                    #13.3
        movl      $400000, %edx              
```

なぜかこっちの分岐予測は50%、つまり予測不能となっている。理由は不明。

なお、gccはサイズにかかわらずmemsetを呼ぶが、icpcではサイズが小さい時にはmemsetを呼ばず、その場でループを回していた。


## 結果: 任意の値でfill

0クリアだとmemsetで良いが、それ以外の値でクリアしようとすると、char以外はmemsetできない。というわけでVALUEを1にしてみる。

まずg++。charはmemset呼ぶだけ。それ以外は全部ループ回すだけ。

```
        movdqa  .LC0(%rip), %xmm0
        movl    $25000, %edx
        xorl    %eax, %eax
.L7:
        movq    %rax, %rcx
        addq    $1, %rax
        salq    $4, %rcx
        cmpq    %rax, %rdx
        movdqa  %xmm0, a(%rcx)
        ja      .L7
```

次、icpc。intとdoubleはループで、range-based forとstd::fillは同じコード。相変わらず最初にサイズチェックしてる。あと、gccとの違いはループを4倍展開してるところ。

```
        movl      $a+400000, %edx                               #11.17
        movl      $a, %eax                                      #11.16
        cmpq      %rdx, %rax                                    #11.3
        je        ..B1.14       # Prob 1%                       #11.3
                                # LOE rbx rbp r12 r13 r14 r15
..B1.3:                         # Preds ..B1.1
        vmovdqu   .L_2il0floatpacket.0(%rip), %ymm0             #11.22
        xorl      %eax, %eax                                    #11.3
                                # LOE rax rbx rbp r12 r13 r14 r15 ymm0
..B1.4:                         # Preds ..B1.4 ..B1.3
        vmovdqu   %ymm0, a(,%rax,4)                             #11.18
        vmovdqu   %ymm0, 32+a(,%rax,4)                          #11.18
        vmovdqu   %ymm0, 64+a(,%rax,4)                          #11.18
        vmovdqu   %ymm0, 96+a(,%rax,4)                          #11.18
        addq      $32, %rax                                     #11.3
        cmpq      $100000, %rax                                 #11.3

```

で、charだけど、range-based forはmemset呼んでる。

```
        movl      $1, %esi                                      #17.18
        movl      $100000, %edx                                 #17.18
        call      __intel_avx_rep_memset                        #17.18
```

しかし、std::fillはループに展開された。

```
        vmovdqu   %ymm0, c(%rax)                                #20.3
        vmovdqu   %ymm0, 32+c(%rax)                             #20.3
        vmovdqu   %ymm0, 64+c(%rax)                             #20.3
        vmovdqu   %ymm0, 96+c(%rax)                             #20.3
        addq      $128, %rax                                    #20.3
        cmpq      $99968, %rax                                  #20.3
        jb        ..B4.4        # Prob 82%                      #20.3
```

原因不明。

## まとめ

生配列を初期化したい時、基本的にはrange-based forも、std::fillも同じコードを吐く。だけどインテルコンパイラは、分岐予測確率が異なったり、片方はmemset呼んでもう片方がループになったりと、ちょこっとだけ違う。
