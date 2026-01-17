---
layout: post
title: "関数ポインタと関数オブジェクトのインライン展開"
tags: [programming, devtools, qiita]
permalink: inline_function
---

# 関数ポインタと関数オブジェクトのインライン展開

## はじめに

たくさん呼び出す関数を動的に選びたい場合、その関数がインライン展開されないと困る。たくさん呼び出す関数を動的に渡す有名な例がソートで、関数ポインタを渡すよりも、関数オブジェクトを渡した方が早い、というのはよく知られている。

で、それは関数がインライン展開されるかどうかが効いてくると思われるんだけれど、実際にそれを確認しておきましょう、というのが本稿の趣旨。

っていうか[前の記事](http://qiita.com/kaityo256/items/b4dc66c92338c0b92552)は、関数のインライン展開について調べてて「あれ？」と思ったので勢いで書いたおまけで、こっちが調べたかったこと。

## 関数ポインタ

関数のエントリポイントを別の関数の引数として渡し、コールバック関数として使うみたいなことをする。こんな感じ。

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

一般に関数ポインタを使うと最適化が阻害されることが知られている。実際、古いGCC(例えば4.1.2)ではこれは最適化できず、-O2まででは`test`を呼び、-O3をつけても`func`を呼ぶ。

-O2の場合。

```nasm
main:
        subq    $8, %rsp
        xorl    %esi, %esi
        movl    $_Z4funci, %edi
        call    _Z4testPFiiEi
        movl    $.LC0, %edi
        movl    %eax, %esi
        xorl    %eax, %eax
        call    printf
        xorl    %eax, %eax
        addq    $8, %rsp
        ret
```

-O3の場合。

```nasm
main:
.LFB16:
        subq    $8, %rsp
        xorl    %edi, %edi
        call    _Z4funci
        movl    $.LC0, %edi
        movl    %eax, %esi
        xorl    %eax, %eax
        call    printf
        xorl    %eax, %eax
        addq    $8, %rsp
        ret
```

しかし、時代が下って g++ 4.4.7くらいになると、-O2で即値を返せるようになる。

```nasm
main:
.LFB14:
        subq    $8, %rsp
        movl    $1, %esi
        movl    $.LC0, %edi
        xorl    %eax, %eax
        call    printf
        xorl    %eax, %eax
        addq    $8, %rsp
        .cfi_def_cfa_offset 8
        ret
```

だが、インテルコンパイラは、-O3をつけてもこれを即値までは持っていけない。[^1]

```nasm
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

**注**: インテルコンパイラは18.0.0から`-O2`でこれを即値に持っていけるようになった。コメ欄参照。

## 関数オブジェクト

関数オブジェクトの場合。ソースはこんな感じになると思われる。

```cpp
#include <stdio.h>
class Inc{
  public:
    int operator() (int a){
      return a+1;
    }
};

int
test(Inc &inc, int a){
  return inc(a);
}

int
main(void){
  Inc inc;
  int a = 0;
  printf("%d\n",test(inc,a));
}
```

これは、g++, clang++はもちろん、インテルコンパイラも即値まで持っていけるようになる。[^2]

```nasm
        stmxcsr   (%rsp)
        movl      $.L_2__STRING.0, %edi
        movl      $1, %esi
        orl       $32832, (%rsp) 
        xorl      %eax, %eax
        ldmxcsr   (%rsp)
##       printf(const char *, ...)
        call      printf    
```

## 実測

関数ポインタがインライン展開できるかどうかは、それがたくさん呼ばれるような関数に渡した時に性能差として現れる。[この記事](http://d.hatena.ne.jp/mickey24/20110211/stl_algorithms_and_functors)に挙げられているような、でかい配列にtransformをかけるサンプルを書いてみる。

まず関数ポインタ版

```cpp
#include <algorithm>
#include <vector>

inline int inc(int n){
  return n + 1;
}

int
main(void){
std::vector<int> v(10000000, 1);
  for (int i = 0; i < 100; ++i) {
    std::transform(v.begin(), v.end(), v.begin(), inc);
  }
}
```

次、関数オブジェクト版。

```cpp
#include <algorithm>
#include <vector>

class Inc {
  public:
  int operator ()(int n) {
    return n + 1;
  }
};

int
main(void){
  std::vector<int> v(10000000, 1);
  Inc inc;
  for (int i = 0; i < 100; ++i) {
    std::transform(v.begin(), v.end(), v.begin(), inc);
  }
}
```

コンパイルオプションは全て-O3。石はIntel(R) Xeon(R) CPU E5-2680 v3 @ 2.50GHz。

| コンパイラ | 関数ポインタ | 関数オブジェクト |
|:-:|:-:|:-:|
| g++  | 0.451 [s]  | 0.452 [s] |
| icpc  | 1.292 [s]  | 0.434 [s]  |


g++では、関数ポインタもインライン展開できているので、関数オブジェクト版と同等な速度が出ている。しかし、インテルコンパイラは関数オブジェクトはインライン化できても、関数ポインタはインライン展開できないのを反映して、関数ポインタ版は大幅に遅くなっている。

## まとめ

g++もclang++も、簡単なものなら関数ポインタのインライン展開ができるようになっているが、未だにできない奴もいるので、まだ関数オブジェクト使った方が無難ですね。

[^1]: 覚書：某コンパイラもここまで。
[^2]: 覚書：某コンパイラもここまでいけるようになる。
