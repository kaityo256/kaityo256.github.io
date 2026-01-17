---
layout: post
title: "メモ化のための要素数上限付きmap"
tags: [programming, qiita]
permalink: bounded_memo_map
---

# メモ化のための要素数上限付きmap

## はじめに

何かのキーに対して値を計算するのだが、その計算が重いのでキャッシュしたい。 しかし、大量に計算するため、際限なくキャッシュはできない。 そこで計算が重いものだけ残しつつ、指定の要素数を超えないようなハッシュが欲しい。そういうニーズがわりとあったので作った。

ソースは

https://github.com/kaityo256/memo_map

においてある。

#　使い方

`memo_map.hpp`をインクルードするだけで使える。普通のメモ化と同様に、何か`key`に対する値を計算する関数`calculate_value_of`を、以下のようにラップして使う。

```cpp
memo_map<int, int> m(100000);

int
func(int key){
  if(m.has_key(key))return m[key];
  else return calculate_value_of(key);
}
```

使い方は`std::unordered_map`と全く同じだが、コンストラクタで最大サイズを取り、そのサイズを超えて要素を保持しない。最大サイズに到達すると、保持するデータを半分にする。その時、値の大きさでソートし、値が大きいものだけ半分残す。

## 背景

ある入力(`std::string`)に対して、ある値(`double`)を計算する関数がある。ただし、結果となる値が大きいほど計算が重くなるのでキャッシュしたい。計算が重いかどうかは実際に計算してみないとわからない。同じ入力に対しては同じ値を返すので、入力をキー、返り値を値としてメモ化すれば良いが、膨大な入力に対して計算するので、全てをキャッシュすることはできない。「値が大きいほど計算が重い」という性質があるので、ある程度以上の要素数になったら、値でソートして、上位半分だけ残して、あとのデータを破棄するようなハッシュを作ることにした。

## 実装

とりあえず何も考えないなら、`std::unordered_map`の`operator []`をオーバーライドして、そこで要素数チェックをして、最大値に到達してたらデータの半減処理をする、みたいな組み方が安直かと思う。こんな感じなる。

```cpp
#pragma once
#include <unordered_map>
#include <string>
#include <vector>
#include <algorithm>

template<class Key, class Value>
class memo_map : public std::unordered_map<Key, Value> {
private:
  size_t max_size;
  void halves_data(void) {
    typedef std::pair<Key, Value> ptype;
    std::vector< ptype >v;
    for (auto &i : *this) {
      v.push_back(i);
    }
    std::sort(v.begin(), v.end(),
    [](const ptype & x, const ptype  & y) {return x.second > y.second;});
    this->clear();
    for (size_t j = 0; j < max_size / 2; j++) {
      auto i = v[j];
      (*this)[i.first] = i.second;
    }
  }
public:
  memo_map(size_t m) : max_size(m) {
  }
  Value& operator[] (const Key& key) {
    if (this->size() == max_size) {
      halves_data();
    }
    return std::unordered_map<Key, Value>::operator[](key);
  }
};
```

こういうことをやっている。

* コンストラクタで`max_size`を受け取る
* `operator []`で、サイズのチェックをして、最大値に到達していたら半減処理`halves_data`を呼ぶ
* 半減処理は、一度`std::vector`にデータを吐き出しておいて、値でソートし、上位半分だけ残す。

特に難しいところはないと思う。

## 実行結果

使い方はこんな感じ。

```cpp
#include <iostream>
#include <string>
#include <sstream>
#include <iomanip>
#include <random>
#include "memo_map.hpp"

int
main(void) {
  const size_t size = 20;
  memo_map<std::string, double> m(size);
  std::mt19937 mt;
  std::uniform_real_distribution<double> ud(0.0, 1.0);
  typedef std::pair<std::string, int> pair_si;
  std::vector< pair_si >v;
  std::cout << "Input Data" << std::endl;
  for (size_t i = 0; i < size; i++) {
    std::stringstream ss;
    ss << "test" << std::setfill('0') << std::setw(3) << i;
    std::string key = ss.str();
    m[key] = ud(mt);
    std::cout << key << "->";
    std::cout << std::setprecision(4) << std::fixed;
    std::cout << m[key] << std::endl;
  }
  std::cout << "Cached Data" << std::endl;
  for (auto &i : m) {
    std::cout << i.first << "->";
    std::cout << std::setprecision(4) << std::fixed;
    std::cout << i.second << std::endl;
  }
}
```

実行結果はこんな感じ。

```shell-session
$ ./test_double.out
Input Data
test000->0.1355
test001->0.8350
test002->0.9689
test003->0.2210
test004->0.3082
test005->0.5472
test006->0.1884
test007->0.9929
test008->0.9965
test009->0.9677
test010->0.7258
test011->0.9811
test012->0.1099
test013->0.7981
test014->0.2970
test015->0.0048
test016->0.1125
test017->0.6398
test018->0.8784
test019->0.0000
Cached Data
test019->0.0000
test010->0.7258
test013->0.7981
test001->0.8350
test018->0.8784
test009->0.9677
test002->0.9689
test011->0.9811
test017->0.6398
test007->0.9929
test008->0.9965
```

最大値を20に設定しているため、20個目のデータが設定された時にデータの半減処理が走る。半減処理が走った後に20個目のデータが追加されるため、上記の`test019->0.000`のペアが`Cached Data`に残っており、`Cached Data`の要素数は11個になっている。

## TODO

* `operator[]`をオーバーライドしているので、単に値を参照するだけのときにもサイズチェックが入るのが美しくない。
* 実用上全く問題ないけど半減処理が走った後に要素が追加されるのが美しく無い。でも、要素が追加された後に半減処理をしようとすると、処理が複雑になる気がする。[^1]
* ここでは安直に「指定のサイズになったら半減」という処理にしたけど、「指定のサイズになるまでは普通のハッシュ、それ以降は常に値が大きなものをキャッシュする」方式の方がメモリ効率は良い気がする。でもそれやろうとすると、キーも値も別々の二分木で管理しないといけない？ついでに複数のキーで値がぶつかった時にわりとややこしい気がする。
* 今回はたまたま「値が大きい場合は計算が重い」という性質があったのでそれを使ったけど、もともと「計算が重い」のでキャッシュしたいのだから、「その値の計算にかかった時間」を記録して、計算が重い順にキャッシュするようにすると、もっと普遍的に使える気がする。

まぁ、いろいろ不備がある気がするけど、自分の用途にはこれで足りるからいいか・・・

[^1]: `operator []`の中で処理しているので、追加処理の後に半減処理をすると、処理の結果、指定されたキーに対応する値が消えた時の処理がちょっと面倒になる。
