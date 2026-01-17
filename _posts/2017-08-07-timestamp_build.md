---
layout: post
title: "ファイルのタイムスタンプに依存してコンパイル結果が変わるコード"
tags: [programming, devtools, qiita]
permalink: timestamp_build
---

# ファイルのタイムスタンプに依存してコンパイル結果が変わるコード

## はじめに

インクルードガードに#pragma once使っていいのか、それともダメなのかがよくわからなかったのでいろいろ試して見た。

ちなみに以下で使うGCCとclangのバージョンはそれぞれ以下の通り。

* g++ (Homebrew GCC 6.3.0_1) 6.3.0
* Apple LLVM version 8.1.0 (clang-802.0.42)

## 実験1

こんななんの変哲もないソースを書く。

```cpp
#include <iostream>
int
main(void){
#include "test1.hpp"
#include "test2.hpp"
#include "test3.hpp"
}
```

次に`test1.hpp`を書く。

```cpp
#pragma once
std::cout << "Hello" << std::endl;
```

これをコピーする。

```shell-session
$ cp test1.hpp test2.hpp
$ cp test1.hpp test3.hpp
```

これをこのままコンパイル、実行してみよう。

```shell-session
$ g++ test.cpp; ./a.out
Hello
Hello
Hello

$ clang++ test.cpp; ./a.out  
Hello
Hello
Hello
```

それぞれ別のヘッダだと認識され、３回実行された。ここまでは想定の動作である。

次に、これらのヘッダファイルのタイムスタンプを一致させてみよう。

```shell-session
$ touch test*.hpp 
```

この状態で、同じことをやると・・・

```shell-session
$ g++ test.cpp; ./a.out  
Hello

$ clang++ test.cpp; ./a.out
Hello
Hello
Hello
```

GCCの方は一度しか表示されない。つまり「ファイル名が異なっていても、中身が同じでタイムスタンプも同じファイルは同一のファイルである」とみなしている。clangの方は「ファイル名が異なっていれば、中身に関わらず異なるファイルである」と認識している。ちなみにインテルコンパイラも後者の立場を取る。


## 実験2

一応ディレクトリも変えてやってみよう。

```cpp
#include <iostream>
int
main(void){
#include "test1.hpp"
#include "dir1/dir1.hpp"
#include "dir2/dir2.hpp"
}
```

```shell-session
$ mkdir dir1; cp test1.hpp dir1/dir1.hpp
$ mkdir dir2; cp test1.hpp dir2/dir2.hpp
$ touch test1.hpp dir1/dir1.hpp dir2/dir2.hpp

$ g++ test2.cpp; ./a.out 
Hello

$ clang++ test2.cpp; ./a.out 
Hello
Hello
Hello
```

ディレクトリが違っても「同じファイル」と認識するようですね。

## 実験3

GCCでは「同じ内容、同じタイムスタンプ」であれば「#pragma once的に同じファイル」とみなされてしまう。なので、すっげーわざとらしいコードだけど、こんなコードを書いてみる。

```cpp
#include <iostream>
#include "hoge.hpp"
#include "hoge1.hpp"
#include "hoge2.hpp"

int
main(void){
  Hoge1 h1("hoge1");
  h1.sayhello();

  Hoge2 h2("hoge2");
  h2.sayhello();
}
```

```cpp
#pragma once
struct Hoge{
  virtual void sayhello(){};
};
```

```cpp
#pragma once
struct Hoge1 : public Hoge{
  std::string name;
  Hoge1(std::string n) : name(n) {};
  #include "sayhello1.hpp"
};
```

```cpp
#pragma once
struct Hoge2 : public Hoge{
  std::string name;
  Hoge1(std::string n) : name(n) {};
  #include "sayhello2.hpp"
};
```

```cpp
#pragma once
void sayhello(void){
  std::cout << "My name is " << name << std::endl;
}
```

```cpp
#pragma once
void sayhello(void){
  std::cout << "My name is " << name << std::endl;
}
```

どうしてこういうコードを書こうと思ったかはどうかはともかく、何か超自然的な力が働いて、`#pragma once`がついているヘッダファイルの中身が一語一句同じものが二つ(`sayhello1.hpp`と`sayhello2.hpp`)存在してしまったとしよう。プログラマは、これら二つのヘッダファイルは別のものだと思ってるし、最初に実行すると意図どおりの実行結果を得る。

```shell-session
$ g++ hoge.cpp
$ ./a.out
My name is hoge1
My name is hoge2
```

さて、このあと、なんか理由があって、彼は全部のファイルを`touch`した。そのあとコンパイルすると実行結果が変わる。

```shell-session
$ touch *.cpp *.hpp
$ g++ hoge.cpp
$ ./a.out
My name is hoge1
```

## まとめ

GCCは「ファイル内容とタイムスタンプが同じであれば、たとえファイル名が異なっていても#pragma once的に同じファイルとみなす」が、それ以外のだいたいのコンパイラはファイル名が異なっていれば違うファイルとみなす。

特にファイルスタンプを見るというのは微妙で、touchをするかしないかで実行結果が変わるようなコードを書くことができる。

・・・で、結局`#pragma once`は積極的に使っていいの？いけないの？
