---
layout: post
title: "コンパイル時の条件により変数宣言の型を変える"
tags: [programming, qiita]
permalink: conditional_type
---

# コンパイル時の条件により変数宣言の型を変える

## TL;DR

コンパイル時に決まる条件`C`の真偽値により、型`A`か型`B`を選択して、その型の変数を宣言したい。疑似コードで書くとこんな感じ。

```cpp
if (C){
  A x;
}else{
  B x;
}

// 以降xを使う
```

これを実現するには`std::conditional`を使って

```cpp
typename std::conditional<C, A, B>::type x
```

とする。

## 利用例

乱数生成エンジンとして、32ビット版の`std::mt19937`と、64ビット版の`std::mt19937_64`が用意されている。テンプレートで`uint32_t`が指定されたか`uint64_t`が指定されたかにより、それらを同じ変数名で宣言したい。こんな時、`std::is_same`を使って、

```cpp
typename std::conditional<std::is_same<INT, uint32_t>::value, std::mt19937, std::mt19937_64>::type m;
```

と書ける。`typename`はコンパイラにこれが型だと教える。

例えば、こんな感じにラップできる。

```cpp
#include <iostream>
#include <random>

template <class INT>
struct Hoge {
  typename std::conditional<std::is_same<INT, uint32_t>::value, std::mt19937, std::mt19937_64>::type m;
  INT operator()() {
    return m();
  }
};

int main() {
  Hoge<uint32_t> h32; // 32ビット乱数 
  Hoge<uint64_t> h64; // 64ビット乱数
  for (int i = 0; i < 10; i++) {
    std::cout << h32() << " " << h64() << std::endl;
  }
}
```

```shell-session
$ g++ test.cpp
$ ./a.out
3499211612 14514284786278117030
581869302 4620546740167642908
3890346734 13109570281517897720
3586334585 17462938647148434322
545404204 355488278567739596
4161255391 7469126240319926998
3922919429 4635995468481642529
949333985 418970542659199878
2715962298 9604170989252516556
1323567403 6358044926049913402
```


## この記事について

上記のようなことをやりたくて結構調べたんだけれど、どうしてもやりかたがわからなくて最後は同僚さんに聞いて教えてもらった(他にもやり方があるっぽい)。似たようなことで苦労する人がいるかもしれないので検索にかかるようにしておきます[^1]。

[^1]: 調べ方として「コンパイル時　条件分岐 変数宣言」とか「コンパイル時　型 切り替え」みたいなキーワードで調べたんだけど、そうすると`constexpr if`とか`std::is_same`とかは出てきたんだけど、`std::conditional`にたどり着かなかった。`std::conditional`を知らない状態からこのキーワードにたどり着くにはどういうキーワードでググればよかったんですかね？
