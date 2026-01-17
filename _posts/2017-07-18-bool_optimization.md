---
layout: post
title: "bool型への演算結果とコンパイラの最適化"
tags: [programming, devtools, hpc, qiita]
permalink: bool_optimization
---

# bool型への演算結果とコンパイラの最適化

## はじめに

C++言語の`bool`型はインクリメントすることができ、結果必ず真になる。しかしデクリメントはできない・・・というのは知っていたのだけれど、ビットシフト`<<``>>`までできるとは知らなかった。それぞれ結果はこうなる。

* bool型に右ビットシフトすると、必ず偽になる
* bool型を左ビットシフトしても、真偽値は変わらない[^1]

ただし、bool型をビットシフトした値は、`false`を0、`true`を1だとした値をビットシフトした結果が入る。つまり、bool型をビットシフトすると整数にキャストされる。もっと言うなら、bool型に何か演算した場合、インクリメント以外は整数になる。

```cpp
#include <typeinfo>
#include <cxxabi.h>
#include <string>

template <class T>
void
show_type(T t){
  const std::type_info& id = typeid(t);
  int stat;
  char *type = abi::__cxa_demangle(id.name(),0,0,&stat);
  printf("%s\n",type);
  free(type);
}

int
main(void){
  bool b;
  show_type(b++); // bool
  show_type(false | true); // int
  show_type(false & true); // int
  show_type(true << 1); // int
  show_type(true >> 1); // int
}
```

`bool`型にビットシフトを許し、かつその結果を整数にするなら、なんとなく`bool`型をインクリメントした結果も整数型になって値が1か2になった方が自然だと思うし、過去にそういう処理系を見た記憶もある[^2]のだが、なぜかインクリメントだけ`bool`型で、残りは整数になる。

[^2]: かすかな記憶ではBorlandのC++処理系が昔こういう動作だった記憶があるのだが、今探してもソースが見当たらない・・・。

さて、ここまでは長い前フリである。`bool`型に何か演算して、整数にキャストした場合の結果は以下の通りとなる。

* `bool`をインクリメント => 常に1
* `bool`を1つ右シフト => 常に0
* `bool`を1つ左シフト => 1か2

これを知ってるか、コンパイラに出題してみましょう、というのが本稿の主題である。

## ソース

こんなコードを食わす。

```cpp
int
func1(bool a){
    return (++a) == 1 ? 1:2;
}

int
func2(bool a){
    return (a>>1) ==0 ? 1:2;
}

int
func3(bool a){
    return (a<<1) < 3 ? 1:2;
}
```

* `func1`は「`bool`をインクリメントしたら常に1になることを知っているか？」という問題
* `func2`は「`bool`を右に1つシフトしたら常に0になることを知っているか？」という問題
* `func3`は「`bool`を左に1つシフトしたら、1か2になるから、常に3より小さいことを知っているか？」という問題。

問一はまぁ、知っていて欲しい気がする。問ニもわかるはずだが、できるか微妙。問三ができたらわりとすごい気がする。

## 結果

上記を`g++ -O3 -S`に食わせた結果。


```nasm
func1(bool):
LFB4:
  movl  $1, %eax
  ret

func2(bool):
LFB1:
  movl  $1, %eax
  ret

func3(bool):
LFB2:
  movl  $1, %eax
  ret
```

おおー、全問正解。clang++も全問正解。インテルコンパイラは問一だけ正解したが、ビットシフトが絡むと即値を返せなかった。

## 感想

g++、clang++ともに「`bool`値をビットシフトした結果」を知っていた。特に最後を

```cpp
int
func3(bool a){
    return (a<<2) < 5 ? 1:2;
}
```

とかにしてもちゃんと即値で返し、

```cpp
int
func3(bool a){
    return (a<<2) < 4 ? 1:2;
}
```

とかにするとちゃんと比較命令吐いたので、「boolを整数にキャストすると0か1で、それを左にn個ビットシフトしてもたかだか1<<nである」ということを理解しているっぽい。たいしたもんだ。

## おまけ

`bool｀を整数にキャストすると0か1である、という条件をどこまで理解できるか、こんなのを食わせて見た。

```cpp
int
func4(bool a){
  return ((a -2)*2) >-5 ? 1:2;
}

int
func5(bool a){
  return ((a -2)*2) < -1 ? 1:2;
}
```

`a`は0か1なので`((a -2)*2)`は-4以上、-2以下となる。従って、上記は常に成立し、1を返せば良い。g++とclang++は問4と問5も解けたが、インテルコンパイラはなぜか問4しか解けなかった。問4が解けるんなら問5も解けてほしいが・・・

[^1]: ただし`<<32`とかするともちろんオーバーフローして偽になる。
