---
layout: post
title: "インテルコンパイラのアセンブル時最適化"
tags: [programming, qiita]
permalink: icc_asm_opt
---

# インテルコンパイラのアセンブル時最適化

## はじめに

「あれ？インテルコンパイラの吐くコードがまたgccより遅いんじゃね？」と書こうとしたら、いろいろあって最終的にインテルコンパイラが圧倒的に速いコードを吐いた話。

## コンパイラのバージョンとか

使うコンパイラのバージョンは、g++が4.8.5、icpcが16.0.3。
実行環境はIntel(R) Xeon(R) CPU E5-2680 v3 @ 2.50GHz。

## 128ビット整数からboolへのキャスト (一個だけ)

訳あって128ビット整数をboolにキャストしたくなった。単純にキャストして正しい結果が得られるか確認するのと、どう実装されるか調べるため、こんなコードを書いた。

```cpp
#include <stdio.h>
#include <cstdint>
void
func32(__uint32_t m, bool &b){
  b = m;
}

void
func64(__uint64_t m, bool &b){
  b = m;
}

void
func128(__uint128_t m, bool &b){
  b = m;
}
```

これを`g++ -O3 -std=c++11 -S test.cpp`でコンパイルすると、こんなコードを吐く。

```nasm
func32(unsigned int, bool&):
        testl   %edi, %edi
        setne   (%rsi)
        ret
 
func64(unsigned long, bool&):
        testq   %rdi, %rdi
        setne   (%rsi)
        ret
 
func128(unsigned __int128, bool&):
        orq     %rsi, %rdi
        setne   (%rdx)
        ret
```

最初、「あれ？なんで128ビット整数のゼロ判定が64ビットのor一発でできるんだろ？」と悩んだが、128ビット整数の上位、下位64ビットのorとれば、上位下位ともに0の時にのみ0になって、その時ZFが立つのでこれでいいんだな。

さて、なんの気なしにインテルコンパイラにこれを食わせてみた。コンパイルオプションは`icpc -O3 -xHOST -std=c++11 -S test.cpp`。吐いたコードはこんな感じ。

```nasm
func32(unsigned int, bool&):
        movl      $1, %eax                                      #5.3
        testl     %edi, %edi                                    #5.3
        cmovne    %eax, %edi                                    #5.3
        movb      %dil, (%rsi)                                  #5.3
        ret 
 
func64(unsigned long, bool&):
        movl      $1, %eax                                      #10.3
        xorl      %edx, %edx                                    #10.3
        testq     %rdi, %rdi                                    #10.3
        cmovne    %eax, %edx                                    #10.3
        movb      %dl, (%rsi)                                   #10.3
        ret
 
func128(unsigned __int128, bool&):
        xorl      %eax, %eax                                    #15.7
        subq      %rax, %rdi                                    #15.7
        subq      %rax, %rsi                                    #15.7
        orq       %rsi, %rdi                                    #15.7
        je        ..B3.3        # Prob 50%                      #15.7
                                # LOE rdx rbx rbp r12 r13 r14 r15
..B3.2:                         # Preds ..B3.1
        movb      $1, %al                                       #15.7
        jmp       ..B3.4        # Prob 100%                     #15.7
                                # LOE rdx rbx rbp r12 r13 r14 r15 al
..B3.3:                         # Preds ..B3.1
        xorb      %al, %al                                      #15.7
                                # LOE rdx rbx rbp r12 r13 r14 r15 al
..B3.4:                         # Preds ..B3.2 ..B3.3
        movb      %al, (%rdx)                                   #15.3
        ret
```

なんだこりゃ？とりあえず32ビットと64ビットでやってることはわかる。`setne`(ZFが立っていない時に1を格納先オペランドに設定)を使うかわりに、eaxに1を入れておいて、edxは0にしておき、`cmovne`でZFを見てeaxを使うかedxを使うか決め、最後に下位8ビットを返り値に設定している。

で、奇怪なのは128ビット。上位/下位64ビットのorを取り、ZFを使うところまでは同じ。だが、その先がなぜかジャンプ命令で、ZFが立っている時には`xorb %al, %al`でalをゼロに、そうで無い時には`movb $1, %al`とalに1を即値で突っ込んで、それを返り値としている。なぜ`subq`を呼んでいるかは僕にはわからない。

とりあえずこれ、g++が`setne`一発でやってることを`cmovne`はともかく`je`とか使ってたらさすがに遅いんじゃないの？ということで、128ビット整数を大量にboolにキャストするコードを書くことにした。ここまでが長い前フリである。

## 128ビット整数からboolへのキャスト (配列版)

というわけで、こんなコードを書いてみた。

```cpp
#include <stdio.h>
#include <cstdint>

const int N = 1000000;
__uint128_t a[N];
bool b[N];

void
func(__uint128_t a[N], bool b[N]){
  for(int i=0;i<N;i++){
    b[i] = a[i];
  }
}

int
main(void){
  for(int i=0;i<N;i++){
    a[i] = i*(i%2);
    b[i] = false;
  }
  const int TRIAL = 10000;
  for(int i=0;i<TRIAL;i++){
    func(a,b);
  }
#ifdef A
  printf("%d\n",a[N/2+1]);
#else
  printf("%d\n",b[N/2+1]);
#endif
}
```

100万個の128ビット整数を適当に初期化しておき、それを100万個のboolにキャストすることを10000回繰り返す。途中のifdefは、後で最適化の確認のために使う。

後の便利のため、こんなmakefileを作る。

```mf
all: a.out b.out main_a.s main_b.s

CC=icpc -O3 -std=c++11

a.out: main.cpp
	$(CC) -DA main.cpp -o a.out

b.out: main.cpp
	$(CC) main.cpp -o b.out

main_a.s: main.cpp
	$(CC) -DA -S main.cpp -o $@

main_b.s: main.cpp
	$(CC)  -S main.cpp -o $@


clean:
	rm -f a.out b.out main_a.s main_b.s
```

さて、ビルドするとa.outとb.outができる。a.outは最後に配列aの値を、b.outは配列bの値を表示するもの。

それぞれ実行してみる。

```shell-session
$ time ./a.out
500001
./a.out  0.01s user 0.00s system 79% cpu 0.015 total

$ time ./b.out
1
./b.out  0.74s user 0.01s system 99% cpu 0.759 total
```

a.out、つまり最後に配列aの値しか表示しない版がありえないほど早い。当然、コンパイル時に配列bを使わないことがバレて関数funcの呼び出しが省略されたか？と疑って、それぞれを-Sでアセンブリを出力させる。先のmakefileでmakeすると、それぞれmain_a.sとmain_b.sとして出力されるので、そのdiffを取ればよい。

```shell-session
$ diff main_a.s main_b.s
3c3
< # mark_description "-O3 -std=c++11 -DA -S -o main_a.s";
---
> # mark_description "-O3 -std=c++11 -S -o main_b.s";
127,130c127,129
<         movl      $.L_2__STRING.0, %edi                         #26.3
<         xorl      %eax, %eax                                    #26.3
<         movq      8000016+a(%rip), %rsi                         #26.3
<         movq      8000024+a(%rip), %rdx                         #26.3
---
>         movl      $.L_2__STRING.0, %edi                         #28.3
>         xorl      %eax, %eax                                    #28.3
>         movzbl    500001+b(%rip), %esi                          #28.3
133c132
<         call      printf                                        #26.3
---
>         call      printf                                        #28.3
```

diffを見る限り、最後のprintfでの出力しか違わない。funcはmain関数内にインライン展開されており、特に飛ばされていない。ちなみに、できた*.sファイルをアセンブルして実行すると、どちらも似たような実行時間になる。

```shell-session
$ icpc main_a.s; time ./a.out
500001
./a.out  0.75s user 0.01s system 99% cpu 0.771 total

$ icpc main_b.s; time ./a.out  
1
./a.out  0.77s user 0.01s system 99% cpu 0.783 total
```

じゃーなんで実行時間に差がでるんだ？と思って、先にできたa.outとb.outをobjdumpしてみる。

```nasm
$ objdump -d a.out
;(snip)
0000000000400b80 <main>:
  400b80:       55                      push   %rbp
  400b81:       48 89 e5                mov    %rsp,%rbp
  400b84:       48 83 e4 80             and    $0xffffffffffffff80,%rsp
  400b88:       48 81 ec 80 00 00 00    sub    $0x80,%rsp
  400b8f:       33 f6                   xor    %esi,%esi
  400b91:       bf 03 00 00 00          mov    $0x3,%edi
  400b96:       e8 75 00 00 00          callq  400c10 <__intel_new_feature_proc_init>
  400b9b:       0f ae 1c 24             stmxcsr (%rsp)
  400b9f:       33 f6                   xor    %esi,%esi
  400ba1:       33 c9                   xor    %ecx,%ecx
  400ba3:       81 0c 24 40 80 00 00    orl    $0x8040,(%rsp)
  400baa:       0f ae 14 24             ldmxcsr (%rsp)
  400bae:       89 f0                   mov    %esi,%eax
  400bb0:       83 e0 01                and    $0x1,%eax
  400bb3:       0f af c6                imul   %esi,%eax
  400bb6:       ff c6                   inc    %esi
  400bb8:       48 99                   cqto   
  400bba:       48 89 81 e0 40 60 00    mov    %rax,0x6040e0(%rcx)
  400bc1:       48 89 91 e8 40 60 00    mov    %rdx,0x6040e8(%rcx)
  400bc8:       48 83 c1 10             add    $0x10,%rcx
  400bcc:       81 fe 40 42 0f 00       cmp    $0xf4240,%esi
  400bd2:       7c da                   jl     400bae <main+0x2e>
  400bd4:       bf 64 1d 40 00          mov    $0x401d64,%edi
  400bd9:       33 c0                   xor    %eax,%eax
  400bdb:       48 8b 35 0e 47 9a 00    mov    0x9a470e(%rip),%rsi        # da52f0 <a+0x7a1210>
  400be2:       48 8b 15 0f 47 9a 00    mov    0x9a470f(%rip),%rdx        # da52f8 <a+0x7a1218>
  400be9:       e8 42 fd ff ff          callq  400930 <printf@plt>
  400bee:       33 c0                   xor    %eax,%eax
  400bf0:       48 89 ec                mov    %rbp,%rsp
  400bf3:       5d                      pop    %rbp
  400bf4:       c3                      retq   
  400bf5:       0f 1f 40 00             nopl   0x0(%rax)
  400bf9:       0f 1f 80 00 00 00 00    nopl   0x0(%rax)
;(snip)
```

あら、配列bを触るところがバサっと根こそぎ削除されてしまっている。最後に配列ｂを出力するb.outの該当箇所は

```nasm
$ objdump -d b.out
;(snip)
0000000000400b80 <main>:
  400b80:       55                      push   %rbp
  400b81:       48 89 e5                mov    %rsp,%rbp
;(snip)
  400bcc:       81 fe 40 42 0f 00       cmp    $0xf4240,%esi
  400bd2:       72 da                   jb     400bae <main+0x2e>
; ここまで配列aを作るあたり
; ここが配列bの初期化
  400bd4:       33 c0                   xor    %eax,%eax
  400bd6:       66 0f ef d2             pxor   %xmm2,%xmm2
  400bda:       66 0f 7f 90 e0 64 54    movdqa %xmm2,0x15464e0(%rax)
  400be1:       01 
  400be2:       66 0f 7f 90 f0 64 54    movdqa %xmm2,0x15464f0(%rax)
  400be9:       01 
  400bea:       66 0f 7f 90 00 65 54    movdqa %xmm2,0x1546500(%rax)
  400bf1:       01 
  400bf2:       66 0f 7f 90 10 65 54    movdqa %xmm2,0x1546510(%rax)
  400bf9:       01 
  400bfa:       48 83 c0 40             add    $0x40,%rax
  400bfe:       48 3d 40 42 0f 00       cmp    $0xf4240,%rax
  400c04:       72 d4                   jb     400bda <main+0x5a>
;(snip) ここからSIMDを駆使してa→bへキャストするコードが延々続く
```

と、ちゃんとキャストのコードが含まれている。

ちなみに、同じコードをg++に食わすと、配列aを出力する方、bを出力する方ともに7.8秒近くかかった。アセンブリ見ると、素直にorしてsetneしてカウンタをインクリメントして・・・というのを1000000回繰り返している。SIMD化により10倍近い高速化が達成されている模様。

## まとめ

128ビット整数の扱いを調べている過程でインテルコンパイラのアセンブル時最適化(こういう言葉が正しいのか知らない。リンク時最適化(ipo)とは違う気がする？ 正しい呼び方求む)にちょっとびっくりしたのでそのあたりをざっくりまとめた。

コンパイルオプションで-Sを指定すると、コンパイルだけで止め、アセンブルはせず、その時のアセンブリを出力する。この時出力されたアセンブリは、実際にソースから直接a.outを作った時の機械語と異なる。おそらくインテルコンパイラは、コンパイルだけで止めた場合には配列bがグローバル変数であったために他で使われる可能性を考慮し、bをちゃんと触るコードを吐いたのだろう。しかし、ソースからa.outまで作る場合には、グローバル配列bが使われないことが確定するため、bにまつわる処理を(初期化も含めて)根こそぎバサッと落としてしまった。正直「グローバル変数にしとけば怖くて消せないだろ」と思ってたのでちょっと驚いた。

(2016年  7月 29日追記)
アセンブリ表示が全部灰色で見づらかったのでshell-sessionからnasmにしてみました。それでもobjdumpの表示はちょっと見づらいですが・・・
