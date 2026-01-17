---
layout: post
title: "インテルコンパイラと使われないグローバル変数"
tags: [programming, qiita]
permalink: icc_unused_global
---

# インテルコンパイラと使われないグローバル変数

## はじめに

グローバル変数が絡む最適化は難しい。どこでどういうタイミングで使われているかわからないため、最適化のためにはコード全体を知る必要があるから。で、グローバル定数の定数伝播とかはよく見かけるけど、グローバル変数については基本的に最適化の対象外だと思ってた。しかし、[インテルコンパイラのアセンブル時最適化](http://qiita.com/kaityo256/items/e7b05eb9c2bfbbd434a7)で、インテルコンパイラが使わないグローバル変数に関する処理を最後に消してるのを見て、「あれ？こんなの昔からやってたっけ？」と思ったので調べてみた。

## 動作環境

* インテルコンパイラ
  * 9.1 20070215 
  * 16.0.3 20160415
* gcc
  * 4.8.5
* clang
  * Apple LLVM version 7.0.2 (clang-700.1.81)

clangだけMacで、それ以外はLinux。

## ソースコード

使うソースはこんな感じ。

```cpp
#include <stdio.h>
const int N = 1000000;
int a[N];
bool b[N];

int
main(void){
  for(int i=0;i<N;i++){
    a[i] = i*(i%2);
    b[i] = false;
  }
  for(int i=0;i<N;i++){
    b[i] = a[i];
  }
}
```

intの配列aとboolの配列bがあるが、どちらも使われないので、main関数の中身は空にできる。これをコンパイラは見抜けるか、という話。

## インテルコンパイラ

まず、手元にあるなかで一番新しい奴(Ver. 16.0.3)を使ってみる。`icpc -O1 -S`でコンパイルする。最適化レベルを下げているのはコードを見やすくするため。吐くアセンブリはこんな感じ。

```nasm
main:
;(snip)
..B1.2: ; 配列aの初期化
        movl      %ecx, %edx                                    #13.5
        movl      %edx, %eax                                    #13.17
        andl      $1, %eax                                      #13.17
        imull     %eax, %edx                                    #13.17
        movl      %edx, a(,%rcx,4)                              #13.5
        movb      $0, b(%rcx)                                   #14.5
        incq      %rcx                                          #12.19
        cmpq      $1000000, %rcx                                #12.17
        jl        ..B1.2        # Prob 99%                      #12.17

..B1.4: ; 配列bへのキャストと代入
        xorl      %edx, %edx                                    #17.5
        cmpl      $0, a(,%rsi,4)                                #17.5
        setne     %dl                                           #17.5
        movb      %dl, b(%rsi)                                  #17.5
        incq      %rsi                                          #16.19
        cmpq      $1000000, %rsi                                #16.17
        jl        ..B1.4        # Prob 99%                      #16.17
;(snip)
```

で、今度は`icpc -O1 -ipo -S`でコンパイルしてみる。出てくるアセンブリは同じだが、冒頭の__ildataセクションに中間コードの情報がどさっと入るので、*.sファイルがでかくなる。


```shell-session
$ icpc -O1 -S test.cpp; wc test.s
  86  278 3489 test.s

$ icpc -O1 -ipo -S test.cpp; wc test.s 
 3960  8028 42592 test.s
```

-ipoをつけて作ったtest.sを、-ipoをつけてアセンブルする。

```shell-session
$ icpc -O1 -ipo -S test.cpp; icpc -ipo test.s 
```

できたa.outを見てみる。

```nasm
;Dump of assembler code for function main:
   0x0000000000400b40 <+0>:	push   %rsi
   0x0000000000400b41 <+1>:	xor    %esi,%esi
   0x0000000000400b43 <+3>:	pushq  $0x3
   0x0000000000400b45 <+5>:	pop    %rdi
   0x0000000000400b46 <+6>:	callq  0x400b80 <__intel_new_feature_proc_init>
   0x0000000000400b4b <+11>:	stmxcsr (%rsp)
; ここから配列aの初期化
   0x0000000000400b4f <+15>:	xor    %ecx,%ecx
   0x0000000000400b51 <+17>:	orl    $0x8040,(%rsp)
   0x0000000000400b58 <+24>:	ldmxcsr (%rsp)
   0x0000000000400b5c <+28>:	mov    %ecx,%edx
   0x0000000000400b5e <+30>:	mov    %edx,%eax
   0x0000000000400b60 <+32>:	and    $0x1,%eax
   0x0000000000400b63 <+35>:	imul   %eax,%edx
   0x0000000000400b66 <+38>:	mov    %edx,0x6040c0(,%rcx,4)
   0x0000000000400b6d <+45>:	inc    %rcx
   0x0000000000400b70 <+48>:	cmp    $0xf4240,%rcx
   0x0000000000400b77 <+55>:	jl     0x400b5c <main+28>

; この後にあった配列bへのキャスト＋代入処理がごそっと消えてる。

   0x0000000000400b79 <+57>:	xor    %eax,%eax
   0x0000000000400b7b <+59>:	pop    %rcx
   0x0000000000400b7c <+60>:	retq   
```

で、古いバージョンのコンパイラ(icpc Ver. 9.1)では、このコンパイルオプション(-O1 -ipo)だけではできないが、コンパイル時に-xPも指定すると -ipoが効いて配列bにまつわる処理が削除される。

**(注) -ipoオプションを指定しなくてもコードが削除されるようです。後述の追記参照。**

グローバルな配列aもbも、値は代入されるもの、その後使われないので、aに関する処理も削除できるのだが、インテルコンパイラはaへの代入処理は残している。おそらく「使われたかどうか」を「代入の右辺に出てくるか」で判断しているのだろう。そういう意味では、bにまつわる処理が消えた時点で、aも右辺には出現せず、aにまつわる処理も消せるのだが、この処理を再帰的には実行していないものと思われる。やればできるのだろうが、これはコンパイル時間との兼ね合いであろう。

## GCC

インテルコンパイラがグローバル変数にまつわる処理を消しているのは、おそらくリンク時最適化(-ipo)が効いているのだと思われる。なので、GCCの-fltoでも試してみる。`g++ -O3 -flto test.cpp`でコンパイルしてgdbでmainをdisasしたが、`g++ -O3 -S`の結果と同じだったので、そっちを表示する。

```nasm
; 配列 aの初期化
.L8:
        movdqa  %xmm4, %xmm0
.L3:
        movdqa  %xmm0, %xmm2
        movdqa  %xmm0, %xmm4
        addq    $16, %rax
        pand    %xmm3, %xmm2
        paddd   %xmm5, %xmm4
        movdqa  %xmm2, %xmm6
        psrlq   $32, %xmm2
        pmuludq %xmm0, %xmm6
        psrlq   $32, %xmm0
        pshufd  $8, %xmm6, %xmm1
        pmuludq %xmm2, %xmm0
        pshufd  $8, %xmm0, %xmm0
        punpckldq       %xmm0, %xmm1
        movdqa  %xmm1, -16(%rax)
        cmpq    $a+4000000, %rax
        jne     .L8
; 配列ｂの初期化
        subq    $24, %rsp
        .cfi_def_cfa_offset 32
        movl    $1000000, %edx
        xorl    %esi, %esi
        movl    $b, %edi
        movdqa  %xmm3, (%rsp)
        call    memset
; ここからキャスト処理
        pxor    %xmm4, %xmm4
        movl    $b, %edx
        movl    $a, %eax
        movdqa  (%rsp), %xmm3
        .p2align 4,,10
        .p2align 3
.L5: ; キャスト処理のメインループ
        addq    $64, %rax
        addq    $16, %rdx
;(snip)
        punpcklbw       %xmm1, %xmm0
        punpckhbw       %xmm1, %xmm2
        punpcklbw       %xmm2, %xmm0
        movdqa  %xmm0, -16(%rdx)
        cmpq    $a+4000000, %rax
        jne     .L5
```

なんかSIMD化を頑張ってるな、という気はするが、どの処理も削除できていない。.gnu.lto_main.hogehogeというセクションができているので、リンク時最適化をしようとはしているのだろうが、使わないグローバル変数に絡む処理を落とすまでには至らないようだ。

## clang

clangにも-fltoは実装されている。同じコードをclangにくわせてみる。まず、`clang++ -O3 -flto -S test.cpp`とすると、吐くのはアセンブリではなくLLVM中間言語になる。

```llvm
; ModuleID = 'test.cpp'
target datalayout = "e-m:o-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-apple-macosx10.10.0"

@a = global [1000000 x i32] zeroinitializer, align 16
@b = global [1000000 x i8] zeroinitializer, align 16

;(snip)

  store <4 x i8> %31, <4 x i8>* %34, align 4, !tbaa !9
  %index.next23.1 = add nuw nsw i64 %index.next23, 8
  %35 = icmp eq i64 %index.next23.1, 1000000
  br i1 %35, label %middle.block14, label %vector.body13, !llvm.loop !11

middle.block14:                                   ; preds = %vector.body13
  ret i32 0
}
```

僕には読めないので、`clang++ -O3 -flto test.cpp`でa.outを作ってgdbでdisasしてみると、結局`clang++ -O3 -S`と同じアセンブリを吐いており、処理は削除されない。

```nasm
Ltmp3:
        .cfi_offset %rbx, -24
        leaq    _b(%rip), %rbx
        movl    $1000000, %esi 
        movq    %rbx, %rdi
        callq   ___bzero           ; bの初期化
        xorl    %edx, %edx
        leaq    _a(%rip), %rax
        movl    $12, %ecx

LBB0_1:                            ; aの初期化ループ(4倍展開)                                           
        leal    1(%rdx), %esi
        movl    %esi, %edi
        shrl    $31, %edi
        leal    1(%rdx,%rdi), %edi
        andl    $-2, %edi
        negl    %edi
        leal    1(%rdx,%rdi), %edi
        imull   %esi, %edi
        movl    $0, (%rax,%rdx,4)
        movl    %edi, 4(%rax,%rdx,4)
        leal    3(%rdx), %esi
        movl    %esi, %edi
        shrl    $31, %edi
        leal    3(%rdx,%rdi), %edi
        andl    $-2, %edi
        negl    %edi
        leal    3(%rdx,%rdi), %edi
        imull   %esi, %edi
        movl    $0, 8(%rax,%rdx,4)
        movl    %edi, 12(%rax,%rdx,4)
        addq    $4, %rdx
        cmpq    $1000000, %rdx          ## imm = 0xF4240
        jne     LBB0_1

        pxor    %xmm0, %xmm0
        movdqa  LCPI0_0(%rip), %xmm1    ## xmm1 = [1,1,1,1]
        movdqa  LCPI0_1(%rip), %xmm2    ## xmm2 = <0,4,8,12,u,u,u,u,u,u,u,u,u,u,u,u>
        .align  4, 0x90

LBB0_3: ;キャスト処理
        movdqa  -48(%rax,%rcx,4), %xmm3
        pcmpeqd %xmm0, %xmm3
        pandn   %xmm1, %xmm3
        movdqa  -32(%rax,%rcx,4), %xmm4
        pcmpeqd %xmm0, %xmm4
; (snip)
        pshufb  %xmm2, %xmm4
        movd    %xmm4, (%rcx,%rbx)
        addq    $16, %rcx
        cmpq    $1000012, %rcx          ## imm = 0xF424C
        jne     LBB0_3

```

ちょっとおもしろいのは、aの初期化処理。適当に偶数インデックスはゼロ、奇数インデックスはインデックスと同じ`a[i] = i*(i%2)`としたのだが、icpcやg++がそのままループを書いているのに対し、clang++はループを四倍展開しており、そうすると(たまたまかもしれないが)掛け算や論理積が半分不要であることに気がついた。

## まとめ

インテルコンパイラは、かなり昔(少なくとも2007年!)から、リンク時最適化で使われないグローバル変数にからむ処理を削除できていた。ただし、コンパイル時には消しておらず、リンク時最適化で落とすため、-Sでアセンブリを出力すると、そこでは削除されていない。なので当時僕はそれに気が付かなかったようだ。

GCC、clangにもリンク時最適化機能はあるが、少なくとも手元の環境ではグローバル変数が絡む処理は落とせなかった。っていうか、今のところ僕が触ったことがあるコンパイラでは、グローバル変数が絡む処理を積極的に最適化する奴はインテルコンパイラしか知らない。

## おまけ

GCCもclangも、もちろんローカル変数にすると全部消すことができる。
配列a,bをローカル変数にする。


```cpp
#include <stdio.h>
const int N = 1000000;

int
main(void){
  int a[N];
  bool b[N];
  for(int i=0;i<N;i++){
    a[i] = i*(i%2);
    b[i] = false;
  }
  for(int i=0;i<N;i++){
    b[i] = a[i];
  }
}
```

g++の出力。

```nasm
_main:
LFB1:
        xorl    %eax, %eax
        ret
```

clang++の出力。

```nasm
_main:
        pushq   %rbp
        movq    %rsp, %rbp
        xorl    %eax, %eax
        popq    %rbp
        retq
```

要するにぜーんぶバッサリカット。しかし、インテルコンパイラは、なぜか空ループだけ残す。

```nasm
main:
..B1.1:
; (snip)
..B1.2: 
        incl      %edx                                          #12.19
        incq      %rax                                          #12.19
        cmpl      $1000000, %edx                                #12.17
        jl        ..B1.2 
..B1.3:  
        xorl      %eax, %eax                                    #19.1
        movq      %rbp, %rsp                                    #19.1
        popq      %rbp                                          #19.1
        .cfi_def_cfa 7, 8
        .cfi_restore 6
        ret           
```

## 追記：ipoをつけなくても最適化されていた

もともと、「-ipが効いているのでは？」という指摘を受けて調べたので「-ip」と「-ipo」をつけて調べてみて、-ipでは削除されず、-ipoなら削除されたので、これは「-ipo」の効果だ、と思ったのだが、そもそも「-O1」だけで削除されることがわかったので追記。

`-O1`では、boolへのキャストに`setne`命令を使うので、これの有無でグローバル変数関連の最適化が行われているかどうか判定できる(もちろん個別のケースでちゃんと中身を見て、setneの有無と最適化の有無が一致していることは確認済み)。以下、いろんなケースでテスト。

* -Sをつけるとsetneを含むアセンブリを吐く

```shell-session
$ icpc -O1 -S test.cpp;grep setne test.s # 
        setne     %dl                                           #13.5
```

* -Sをつけないで作ったバイナリはsetneを含まない。

```shell-session
$ icpc -O1 test.cpp; objdump -d a.out  |grep setne

$ 
```

* -ipをつけると実行バイナリはsetneを含む

```shell-session
$ icpc -O1 -ip test.cpp; objdump -d a.out  |grep setne
  400b8c:	0f 95 c2             	setne  %dl
```

* -ipoをつけるとsetneを含まない。

```shell-session
$ icpc -O1 -ipo test.cpp; objdump -d a.out  |grep setne 

$
```

また、`-ipo-S`というオプションを教えていただいた。これを使うと、ipo_out.sという単一のアセンブリができる・・・が、これにはsetne命令が含まれる。

```shell-session
$ icpc -O1 -ipo-S test.cpp; grep setne ipo_out.s 
icpc: warning #10015: multi-file optimization .s file produced; no link
        setne     %dl                                           #13.5
```

デフォルト(-O2)でもそうだし、-O1でさえ、-Sをつけたアセンブリと実行バイナリの機械語は異なるので、-Sの出力は参考程度にとどめ、ちゃんとバイナリを逆アセしたものをチェックする癖つけたほうが良さそう(少なくともインテルコンパイラの場合は)。

## さらに追記

バージョンが古いと、-O1だけでは削除されない。

インテルコンパイラ Ver. 9.1で・・・

* グローバル変数最適化がされるオプションの組み合わせ。
  *  -ipo -xP
  *  -fast
* 最適化されない組み合わせ (要するに-ipoと-xPが同時に指定されない奴全部)
  *  -ip 
  *  -ipo
  *  -xP
  *  -ip -xP
  *  -O3 -ipo (-O3つけてもダメ)
 
手元にあった、中間のバージョン、12.1.4 20120410の動作は16.0.3と同じ(-O1で最適化、-ipで無し、-ipoであり、-Sとか-ipo-Sは最適化無しのアセンブリを吐く)だった。

よくわからん。
