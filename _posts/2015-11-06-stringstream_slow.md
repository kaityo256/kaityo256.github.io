---
layout: post
title: "clang++のstd::stringstreamが遅い？"
tags: [programming, devtools, qiita]
permalink: stringstream_slow
---

# clang++のstd::stringstreamが遅い？

## はじめに

あるコードの初期化が遅かったので調べてみたら、std::stringstreamが原因だった。さらに調べてみたら、gccとclangでだいぶ速度が違ったのでまとめてみた。

## コード

以下のようなベンチマークコードを書いた。100個の0-9の乱数を文字列にして、それをstd::stringとして500000回vectorにpush_backする。push_backする文字列の作り方を以下の三通り用意した。

1. std::stringstreamに<<していく(test_ss)
2. std::stringにcharとしてappendしていく(test_str)
3. 予め用意したcharの配列の中身を書き換える(test_char)


```cpp
//----------------------------------------------------------------------
#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <random>
#include <sys/time.h>
//----------------------------------------------------------------------
std::uniform_int_distribution<> rand9(0, 9);
const int TRIAL = 500000;
const int LEN = 100;
//----------------------------------------------------------------------
void
show(std::vector<std::string> &sv) {
  for (int i = 0; i < sv.size(); i++) {
    std::cout << sv[i] << std::endl;;
  }
}
//----------------------------------------------------------------------
double
myclock(void) {
  struct timeval t;
  gettimeofday(&t, NULL);
  return t.tv_sec + t.tv_usec * 1e-6;
}
//----------------------------------------------------------------------
void
test_ss(void) {
  std::mt19937 g((std::random_device())());
  g.seed(1);
  std::vector<std::string> sv;
  for (int j = 0; j < TRIAL; j++) {
    std::stringstream ss;
    for (int i = 0; i < LEN; i++) {
      ss << rand9(g);
    }
    sv.push_back(ss.str());
  }
  //show(sv);
}
//----------------------------------------------------------------------
void
test_str(void) {
  std::mt19937 g((std::random_device())());
  g.seed(1);
  std::vector<std::string> sv;
  for (int j = 0; j < TRIAL; j++) {
    std::string str;
    for (int i = 0; i < LEN; i++) {
      str.append(1, rand9(g) + '0');
    }
    sv.push_back(str);
  }
  //show(sv);
}
//----------------------------------------------------------------------
void
test_char(void) {
  std::mt19937 g((std::random_device())());
  g.seed(1);
  char str[LEN + 1];
  str[LEN] = 0;
  std::vector<std::string> sv;
  for (int j = 0; j < TRIAL; j++) {
    for (int i = 0; i < LEN; i++) {
      str[i] = rand9(g) + '0';
    }
    sv.push_back(str);
  }
  //show(sv);
}
//----------------------------------------------------------------------
void
measure(void(*pfunc)(), const char *name) {
  double st = myclock();
  pfunc();
  double t = myclock() - st;
  printf("%s %f [sec]\n", name, t);
}
//----------------------------------------------------------------------
int
main(void) {
  measure(&test_ss, "stringstream");
  measure(&test_str, "string");
  measure(&test_char, "char");
}
//----------------------------------------------------------------------

```

コンパイラのバージョンは、GCCがg++ (MacPorts gcc49 4.9.3_0) 4.9.3、clang++がApple LLVM version 7.0.0 (clang-700.1.76)。オプションはどちらも`-O3 -std=c++11`。環境はMac OS X (Yosemite, 10.10.5)。

## 結果

結果は以下の通り。単位は秒。

|            | g++ | clang++ |
|:-----------|-----| --------|
| std::stringstream|3.966758  |15.250005|
| std::string::append|1.826684 |2.800154|
| char |0.653535| 2.123492| 

g++はさほど変なことは無くて、まぁこんな速度だろうな、というもの。clang++も、std::string::appendとcharが、g++に比べてちょっと遅いな、という気はするけど、まぁこんなものでしょう。

特筆すべきはstd::stringstreamに<<する場合。これはg++の4倍近く遅い。

## まとめ

std::stringstreamに整数を<<で追加するコードは、clang++ではすごく遅い。原因はよくわからないが、clangの整数→文字列変換が遅いのかなぁ？

## 追記 (2015 11/6 18:00)

コメントにてコンパイラではなくライブラリの問題との指摘を受けたので、試してみた。なぜかclangに`-stdlib=libstdc++ -std=c++11`を食わせたら「random」ヘッダが見つからないとか言ってくるので、乱数発生をstdlibのrandomに変えた[sstest2.cc](https://gist.github.com/kaityo256/d2e876cf25dea0f83d04)を使った。面倒なのでシードも合わせてない。

以下は、結果。単位は秒。

|            | g++ | clang++ -stdlib=libc++ | clang++ -stdlib=libstdc++|
|:-----------|-----| --------|--------|
| std::stringstream| 4.122507|  11.832311| 3.413724|
| std::string::append| 1.76911 |1.335249|1.666287|
| char | 0.669501|0.713631|0.623669 |

`-stdlib=libstdc++`を指定したclang++は速度が大きく向上、というかg++よりも早くなった。何度か試したが、有意に早い。
