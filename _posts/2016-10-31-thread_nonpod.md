---
layout: post
title: "g++における__threadキーワードとnon-POD型変数の初期化"
tags: [devtools, qiita]
permalink: thread_nonpod
---

# g++における__threadキーワードとnon-POD型変数の初期化

#はじめに 

GCCにはスレッド局所記憶のためのキーワードとして`__thread`がある。これはPOD(Plain Old Data)型のみ受け付け、non-POD型は対応していない。しかし、あるバージョンから対応したように見えるので覚書。

## 実行環境

* g++ 4.4.7
* g++ 4.8.5
* g++ 5.1.0

## 現象

以下のようなコードを書く。

```cpp
#include <vector>

void func2(std::vector<int> &v);

int
func(int index){
  static __thread std::vector<int> v;
  func2(v);
  return v[index];
}
```

これをg++ 4.4.7でコンパイルすると、non-POD型はthread-localにできない旨を怒られる。

```shell-session
$ g++ -c test.cpp
test.cpp: In function ‘int func(int)’:
test.cpp:7: error: ‘v’ cannot be thread-local because it has non-POD type ‘std::vector<int, std::allocator<int> >’
test.cpp:7: error: ‘v’ is thread-local and so cannot be dynamically initialized
```

要するに`__thread`指定できるのは、自明なコンストラクタを持つ場合のみに限られる・・・はずだった。

しかしこのコード、g++ 4.8.5や、5.1.0では問題なくコンパイルできる。

```shell-session
$ g++ -c test.cpp

$  # コンパイル成功
```

これに関連することを某ベンダーさんに問い合わせたら調べてくれて、どうやらGCC 4.8でC++11のthread_localキーワードに対応したのだが、このタイミングでnon-POD型に__threadを指定可能になったらしい。

こんなコードを書いてみる。

```cpp
#include <vector>

void func2(std::vector<int> &v);

int
func(int index){
  thread_local static std::vector<int> v;
  func2(v);
  return v[index];
}
```

さっきの`__thread`を、`thread_local`に書き換えただけのコード。`thread_local`キーワードはnon-POD型にも使えるので、これは問題なくコンパイルできる。

```shell-session
$ g++ -std=c++11 -c test2.cpp 

$ # コンパイル成功
```

で、これもその方に教えてもらったのだが、g++ 4.8以降では、`__thread`指定したものと、`thread_local`指定したものが、全く同じコードを吐く(-Sで見てみるとわかる)。

## まとめ

g++ 4.8以前ではnon-POD型な変数に`__thread`キーワードは指定できなかったが、g++ 4.8以降では指定できるようになった上に、`thread_local`指定した場合と全く同じコードを吐く。

ベンダーの人はそうとは明言しなかったが、おそらくthread_localが実装された段階で、`__thread`がthread_localのエイリアス扱いになったのではないか？それで、本来non-POD型は許されないはずの`__thread`キーワードにnon-POD型が許されるようになったのか？

ただし、[GCC4.8 Changes](https://gcc.gnu.org/gcc-4.8/changes.html)には、

> g++に`thread_local`が実装されたが、これはGNUの`__thread`キーワードとは違うもので、ちょっと遅くなる場合があるからそういう時には`__thread`使ってね

みたいなことが書いてあって、どういうことになっているのかまだよくわかってない。
