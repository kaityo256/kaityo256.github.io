---
layout: post
title: "条件分岐のヒントとしてlikelyやunlikelyを指定してみる"
tags: [programming, devtools, qiita]
permalink: branch_hint
---

# 条件分岐のヒントとしてlikelyやunlikelyを指定してみる

## はじめに

Linuxカーネルでは、分岐予測のヒントをコンパイラに与えているらしい。そのためには組み込み関数`__builtin_expect`を使うが、ほとんどはlikelyとunlikelyというマクロの形で使われているそうだ。[^1]

```cpp
#define likely(x)	__builtin_expect(!!(x), 1)
#define unlikely(x)	__builtin_expect(!!(x), 0)
```

これを指定した時、コンパイラがどのくらい吐くコードを変えて、それがどれくらい性能に効くか調べてみた。

## 環境

* Intel(R) Xeon(R) CPU E5-2680 v3 @ 2.50GHz
* icpc (ICC) 16.0.4
* g++ (GCC) 4.8.5

## コード

こんなコードを食わせる。

```cpp
#include <iostream>
#include <algorithm>

#define likely(x) __builtin_expect(!!(x), 1)
#define unlikely(x) __builtin_expect(!!(x), 0)

const int N = 100000;

int func(int *a){
  for (int i=0;i<N;i++){
    if (a[i] < 0)return i;
  }
  return -1;
}

int func_likely(int *a){
  for (int i=0;i<N;i++){
    if (likely(a[i] < 0))return i;
  }
  return -1;
}

int func_unlikely(int *a){
  for (int i=0;i<N;i++){
    if (unlikely(a[i] < 0))return i;
  }
  return -1;
}

int main(void){
  int *a = new int[N];
  std::fill(a,a+N,0);
  a[N-3] = -1;
  int sum = 0;
  for (int i=0;i<N;i++){
#ifdef LIKELY
    sum += func_likely(a);
#elif UNLIKELY
    sum += func_unlikely(a);
#else
    sum += func(a);
#endif
  }
  std::cout << sum << std::endl;
  delete [] a;
}
```

要するに要素数100000の配列を順番になめて、最初に負の要素があったインデックスを返す関数を100000回呼ぶ。配列はほとんどゼロだが、最後尾に近いところに負の要素がある。その状態で、無指定、likely、unlikelyを指定する。我々はこれがほとんどの場合において偽となることを知っているので、unlikelyを指定した場合が最速になることが期待される。

## 結果

|  | 無指定 [秒] | likely [秒] | unlikely [秒] |
|:-:|:-:|:-:|:-:|
| g++ -O3  | 6.90  | 7.46  | 3.47  |
| icpc -O3  | 1.84  | 2.77  | 1.88  |
| icpc -O3 -xHOST  |1.41   | 1.44  | 1.39  |

目論見通り、g++ではunlikelyを指定することで倍近く早くなり、かつlikelyで嘘をつくと若干遅くなる。つまり、無指定、likely指定、unlikely指定で全て異なるコードを吐いている。

インテルコンパイラは、嘘をつくと遅くなるが、そうでない場合は無指定とunlikelyはほとんど変わらない。

## アセンブリ

アセンブリを確認する。まずg++ -O3でコンパイルした場合。

```nasm
        xorl    %eax, %eax
        jmp     .L3
.L8:
        addq    $1, %rax
        cmpq    $100000, %rax
        je      .L7
.L3:
        movl    (%rdi,%rax,4), %edx
        testl   %edx, %edx
        jns     .L8
        rep ret
.L7:
        movl    $-1, %eax
        ret
```

```nasm
        xorl    %eax, %eax
.L3:
        movl    (%rdi,%rax,4), %edx
        testl   %edx, %edx
        jns     .L7
        rep ret
.L7:
        addq    $1, %rax
        cmpq    $100000, %rax
        jne     .L3
        orl     $-1, %eax
        ret
```

```nasm
        xorl    %eax, %eax
.L3:
        movl    (%rdi,%rax,4), %edx
        testl   %edx, %edx
        js      .L2
        addq    $1, %rax
        cmpq    $100000, %rax
        jne     .L3
        movl    $-1, %eax
.L2:
        rep ret
```

吐いてるコードは素直だ。無指定(normal.s)とlikely指定(likely.s)は若干構造が異なるものの、本質的には testl してjnsしている点では同じ。unlikelyを指定すると、testlの直後にjnsではなくjsを吐くようになる。これにより、ループ一回あたりのジャンプ命令が2回から1回に減るため、高速化される。

ちなみに`rep ret`というのは、AMD系の石の条件分岐予測のペナルティを防ぐためのイディオムなんだそうな。[^amd]

次、インテルコンパイラ。icpc -O3だと、xmmレジスタまでを利用する。ごちゃごちゃ出てきて長くて真面目に読む気がしないが、本質はこの部分だと思われる。

```nasm
        pxor      %xmm0, %xmm0
        pcmpgtd   (%rdi,%rdx,4), %xmm0
        movmskps  %xmm0, %eax
        testl     %eax, %eax
        jne       ..B1.20
```

```nasm
        pxor      %xmm0, %xmm0
        pcmpgtd   (%rdi,%rsi,4), %xmm0
        movmskps  %xmm0, %edx
        testl     %edx, %edx
        je        ..B1.19
```

```nasm
        movdqa    %xmm0, %xmm1
        pcmpgtd   (%rdi,%rdx,4), %xmm1
        movmskps  %xmm1, %eax
        testl     %eax, %eax
        jne       ..B1.20
```

つまり

* pcmpgtdで4つ同時に比較
* movmskpsで比較結果をeaxにまとめる
* testlで負の奴が一つでもいたかチェック
* もし見つかったら、4つのうちどれがひっかかったかをチェックするルーチンに飛ぶ。
* 無指定とunlikelyは jne (負の奴が見つからない方に賭ける)を、likelyはje(負の奴が見つかる方に賭ける)を呼ぶ

という感じなんだと思う。この部分もそうだけど、全体を見ても無指定とunlikelyはほとんど同じコードを吐いているので、コンパイラがこのコードを見て「unlikely」だと判断しているように見える。

-xHOSTをつけるとymmレジスタが解禁され、こんなコードになる。

```nasm
        vpcmpgtd  (%rdi,%rsi,4), %ymm0, %ymm1
        vmovmskps %ymm1, %edx
        testl     %edx, %edx
        je        ..B1.19
```

```nasm
        vpcmpgtd  (%rdi,%rdx,4), %ymm0, %ymm1
        vmovmskps %ymm1, %eax
        testl     %eax, %eax
        jne       ..B1.20
```

4つ同時が8つ同時になるだけで、やっていることは同じ。ちなみに8つのうちどれがひっかかったかはこうやって調べる。

```nasm
        bsf       %eax, %ecx
        addl      %ecx, %edx
        movl      %edx, %eax
        vzeroupper
        ret
```

まず、bsfでeaxの立っているビットの位置を調べる。これを現在のカウンタに足せば、欲しいインデックスになる。これは早そう。言われてみればなるほど、と思うが、これを僕は思いつけるだろうか・・・(x86系の最適化に慣れてる人にとっては頻出パターンなのかもしれないけど)。

## まとめ

GCC、インテルコンパイラともに、likely、unlikely指定は効果がある。特にGCCは倍くらい早くなった。条件分岐の確率が事前にわかっていて、かつコンパイラが判断できなそうな場合は指定した方が良さそう。

インテルコンパイラは、今回食わせたコードについては「unlikely」だとコンパイラが判断した雰囲気がある。特に、コンパイルオプションに-xHOSTを指定した場合は、無指定の場合ととunlikely指定の場合で(-Sでアセンブリを吐かせた範囲では)全く同じコードを吐く。にも関わらず、実行時間が有意に異なるのは、例によってリンク時最適化が行われているのだと思われる(が、実行バイナリを逆アセして解析するほどの熱意は僕には無い)。

しっかし、インテルコンパイラは頑張ってSIMD化するね・・・。並列比較した後の処理も手慣れた職人の仕事、という感じがする。

[^1]: https://cpplover.blogspot.jp/2016/11/c-p0471r0-p0479r0.html
[^amd]: http://repzret.org/p/repzret/
