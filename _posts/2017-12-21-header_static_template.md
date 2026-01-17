---
layout: post
title: "ヘッダでstaticな関数をテンプレート関数から呼ぶ"
tags: [programming, devtools, qiita]
permalink: header_static_template
---

# ヘッダでstaticな関数をテンプレート関数から呼ぶ

## はじめに

VimにALEを入れてたら不可思議な警告が出たのでメモ。とあるシングルヘッダライブラリ内で`static inline`宣言された関数にALEが文句をつけたのが発端だが、以下の例では`inline`は外してある。

## 現象

こんなコードを書く。

```test.hpp
static int func(int a){
  return a;
}

template <class T>
int hoge(T a){
  return func(sizeof(a));
}
```

ヘッダファイル`test.hpp`内に、static関数`func`とテンプレート関数`hoge`が定義されている。これを、`clang++`で`-Wall`つきでシンタックスチェックしてみる。

```shell-session
$ clang++ -fsyntax-only -Wall test.hpp 
test.hpp:1:12: warning: function 'func' is not needed and will not be emitted
      [-Wunneeded-internal-declaration]
static int func(int a){
           ^
1 warning generated.
```

「関数`func`はどこからも呼ばれないから必要ないんじゃね？」という警告(`-Wunneeded-internal-declaration`)が出る。

g++は何も言わない。

```shell-session
$ g++ -fsyntax-only -Wall test.hpp 

```

`static`宣言を外すと`clang++`も何も言わなくなる。

```test2.hpp
int func(int a){
  return a;
}

template <class T>
int hoge(T a){
  return func(sizeof(a));
}
```

```shell-session
$ clang++ -fsyntax-only -Wall test2.hpp  

```

テンプレート関数`hoge`を実体化させても文句は言わない。

```cpp
static int func(int a){
  return a;
}

template <class T>
int hoge(T a){
  return func(sizeof(a));
}

void hoge2(void){
  hoge(1);
}
```

もちろん、普通のプログラムにインクルードして実行させることはできるし、文句も言われない。

```cpp
#include <iostream>
#include "test.hpp"

int
main(void){
  std::cout << hoge(1) << std::endl; // => 4
}
```

## なぜこんなことが起きた？

`static`宣言をした関数`func`は、そのファイルスコープローカルな関数になる。従ってそのファイルスコープ外から呼ばれることはないはずである。さて、テンプレート関数`hoge`は、`test.hpp`の段階では実体化されない。従って、このヘッダファイル単体だけを見ると、この関数`func`はまだ呼ばれていないように見える。実際には別のファイルにインクルードされて、`hoge`が実体化したら呼ばれる可能性があるのだが、`clang++`はその可能性を考えず(チェックしているのがヘッダであることを考慮せず)、警告を出した。・・・本当かな？

## clang++の警告は妥当なの？間違ってるの？

そもそもこういう、テンプレート関数から同一ファイルスコープにstatic宣言された関数を呼ぶ、というのは、C++的にやっていいことなんだろうか？[^1] `static`をつけたということは内部リンケージしか無いという宣言で、たしかに内部の関数からしか呼ばれないのだが、呼んでいる関数がテンプレート関数で、そのファイルスコープ中では実体化されない時にもこれを「内部リンケージ」と言っていいのかな？

[^1]: 僕が書いたライブラリじゃないから「そもそも`static inline`とか指定しなくていいんじゃない？」みたいなことは言わないでね。
