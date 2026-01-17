---
layout: post
title: "コンパイラは関数のインライン展開を☓☓段で力尽きる"
tags: [programming, devtools, qiita]
permalink: inline_limit
---

# コンパイラは関数のインライン展開を☓☓段で力尽きる

## はじめに

「コンパイラって、関数のインライン展開を何段までやってくれるんでしょうか？これってトリビアになりませんか？」

このトリビアの種、つまりこういうことになります。

「コンパイラに多段呼び出しの関数を食わせてインライン展開させた時、☓☓段で力尽きる」

実際に調べてみた。

## ソース

関数の多段呼び出しをするコードを吐くRubyコードを書いた。

```rb
num = ARGV[0].to_i

puts <<EOS
#include <stdio.h>
int
func0(int a){
  return a + 1;
}
EOS

num.times do |i|
  puts "int func#{i+1}(int a){return func#{i}(a);}"
end

puts <<EOS
int
main(void){
  int a = 0;
  printf("%d\\n",func#{num}(a));
}
EOS
```

例えば10段ならこんなの。

```shell-session
$ ruby test.rb 10 > test10.cpp
```

```cpp
#include <stdio.h>
int
func0(int a){
  return a + 1;
}
int func1(int a){return func0(a);}
int func2(int a){return func1(a);}
int func3(int a){return func2(a);}
int func4(int a){return func3(a);}
int func5(int a){return func4(a);}
int func6(int a){return func5(a);}
int func7(int a){return func6(a);}
int func8(int a){return func7(a);}
int func9(int a){return func8(a);}
int func10(int a){return func9(a);}
int
main(void){
  int a = 0;
  printf("%d\n",func10(a));
}
```

## コンパイラのバージョンとオプション

* g++  6.3.0 (-O2)
* clang++ Apple LLVM version 8.0.0 (-O2)
* icpc 16.0.4 (-O2)

## 検証

アセンブリを見て、printfの直前でfuncをcallするかどうかで判定。とりあえず100段くらいまで。

* g++ (Linux)

```nasm
main:
        subq    $8, %rsp
        movl    $1, %esi
        movl    $.LC0, %edi
        xorl    %eax, %eax
        call    printf
```

* clang++ (MacOS)

```nasm
_main:
  pushq %rbp
  movq  %rsp, %rbp
  leaq  L_.str(%rip), %rdi
  movl  $1, %esi
  xorl  %eax, %eax
  callq _printf
```

* icpc

```nasm
main:
        movl      $.L_2__STRING.0, %edi
        movl      $1, %esi
        orl       $32832, (%rsp) 
        xorl      %eax, %eax
        ldmxcsr   (%rsp)
        call      printf
```

うん、全部即値で返せてる。

次、1000段。

* g++(Linux)

```nasm
main:
        subq    $8, %rsp
        movl    $1, %esi
        movl    $.LC0, %edi
        xorl    %eax, %eax
        call    printf
```

* clang++ (MacOS)

```nasm
_main:
  pushq %rbp
  movq  %rsp, %rbp
  leaq  L_.str(%rip), %rdi
  movl  $1, %esi
  xorl  %eax, %eax
  callq _printf
```

* icpc

```nasm
        stmxcsr   (%rsp)
        xorl      %edi, %edi
        orl       $32832, (%rsp)
        ldmxcsr   (%rsp)
##       func3(int)
        call      _Z5func3i
        movl      $.L_2__STRING.0, %edi
        movl      %eax, %esi
        xorl      %eax, %eax
##       printf(const char *, ...)
        call      printf
```

あ、関数呼び出しになっている。しかも`func3`を呼んでいる。それぞれの関数の中身はこうなっている。

```nasm
func4(int):
        incl      %edi
        movl      %edi, %eax
        ret


func5(int):
##       func3(int)
        jmp       func3(int)
```

うん、`func4`までは`incl`呼んでるけど、`func5`からなぜか`func3`を呼んでる。

ちなみに、997段の展開では最後まで行く。

```shell-session
$ ruby test.rb 997 > test997.cpp
$ icpc -O2 -S test997.cpp
```

```nasm
main:
(snip)
        stmxcsr   (%rsp)
        movl      $.L_2__STRING.0, %edi
        movl      $1, %esi 
        orl       $32832, (%rsp)
        xorl      %eax, %eax
        ldmxcsr   (%rsp)
##       printf(const char *, ...)
        call      printf 
(snip)
func997(int):
        incl      %edi 
        movl      %edi, %eax
        ret
```

998段では途中でインライン展開をやめ、なぜか奇数番の関数だけ`jmp`命令を出す。

```nasm
main:
(snip)
        stmxcsr   (%rsp)
        xorl      %edi, %edi  
        orl       $32832, (%rsp)
        ldmxcsr   (%rsp)  
        call      func3(int)      
        movl      $.L_2__STRING.0, %edi 
        movl      %eax, %esi 
        xorl      %eax, %eax 
##       printf(const char *, ...)
        call      printf

func5(int):
##       func3(int)
        jmp       func3(int)  

func6(int):
        incl      %edi 
        movl      %edi, %eax 
        ret 
```

具体的には、func5,7,9,...,func249だけ`jmp`命令となり、それ以外は`inc`になっている。

ちなみにg++やclang++は5000段でも最後までインライン展開して即値にした。

## まとめ

こうしてこの世界にまた一つ
新たなトリビアが生まれた。

インテルコンパイラは、関数のインライン展開を998段で力尽きる。

## おまけ：関数ポインタの場合

関数ポインタを関数の引数に渡した場合を考える。こんなの。

```cpp
#include <stdio.h>

int
func(int a){
  return a+1;
}

int
test(int (*p)(int),int a){
  return p(a);
}

int
main(void){
  int a = 0;
  printf("%d\n",test(func,a));
}
```

g++やclang++では、これを即値にもっていける。

```nasm
_main:
  subq  $8, %rsp
  movl  $1, %esi
  xorl  %eax, %eax
  leaq  lC0(%rip), %rdi
  call  _printf
```

icpcは、`test`はインライン展開するが、`func`の展開はできない。

```nasm
..B1.6:
        stmxcsr   (%rsp)
        xorl      %edi, %edi
        orl       $32832, (%rsp)
        ldmxcsr   (%rsp)
        call      func(int)
        movl      $.L_2__STRING.0, %edi
        movl      %eax, %esi
        xorl      %eax, %eax
        call      printf
```
