---
layout: post
title: "over-aligned newとGCC7の警告"
tags: [programming, devtools, qiita]
permalink: overaligned_new
---

# over-aligned newとGCC7の警告

## はじめに

これまでGCC6で警告を出さなかったコードがGCC7で警告を出した。調べてみるとover-aligned newの問題だった。関連する日本語の記事が少ないように感じたので簡単にまとめておく。

## 概要

以下のようなソースを考える。

```cpp
#include <iostream>
const int ALIGN=128;
class Hoge{
  public:
    alignas(ALIGN) double d[10];
};

alignas(ALIGN) double f[10];

int
main(void){
  std::cout << long(&f) % ALIGN << std::endl;
  Hoge h1;
  std::cout << long(&(h1.d)) % ALIGN << std::endl;
  Hoge *h2 = new Hoge();
  std::cout << long(&(h2->d)) % ALIGN << std::endl;
  delete h2;
}
```

`double f[10]`や`double Hoge::d[10]`は128バイトアラインされていることが期待されている。しかし、このコードでは、`new`した時にはアラインが保証されない。

```shell-session
$ g++ -std=c++11  test.cpp; ./a.out   
0
0
48

$ clang++ -std=c++11  test.cpp; ./a.out
0
0
48
```

最後の一個だけアラインメントがおかしいことがわかる。

## GCC7での警告とオプション

GCC7では、このようなover-alignedでnewする場合においても正しくアラインされるオプションが追加された。それに伴い、`-Waligned-new`という警告が追加され、`-Wall`に入った。これで、`-Wall`をつけてコンパイルすると、以下のように「意図しないアラインになっているよ」と警告される。

```shell-session
$ g++ -std=c++11 -Wall test.cpp
test.cpp:15:23: warning: 'new' of type 'Hoge' with extended alignment 64 [-Waligned-new=]
   Hoge *h2 = new Hoge();
                       ^
test.cpp:15:23: note: uses 'void* operator new(std::size_t)', which does not have an alignment parameter
test.cpp:15:23: note: use '-faligned-new' to enable C++17 over-aligned new support
```

ここで教えられたとおり`-faligned-new`をつけるか、`-std=c++1z`オプションをつけると、所望のアラインメントになる。

```shell-session
$ g++ -std=c++11 -faligned-new -Wall test.cpp;./a.out
0
0
0

$ g++ -std=c++1z -Wall test.cpp;./a.out
0
0
0
```

現時点ではclang++はまだ対応していない模様。

```shell-session
$ clang++ -std=c++1z -Wall test.cpp;./a.out
0
0
48
```
## まとめ

* GCC6+`-Wall`で警告出さなかったコードが、GCC7+`-Wall`で`[-Waligned-new=]`がどうこうという警告が出たら、それはover-aligned newの問題
* GCC7では`-std=c++1z`もしくは`-faligned-new`をつけると所望のアラインメントになる。
* っていうかGCC7でこの警告が出るってことは、これまでアラインメント間違えたままコードを使っていたということに・・・

## 参考

* [光成さんの日記(2017年3月14日)](http://herumi.in.coocan.jp/diary/1703.html#14)
* [C++17つまみぐい](http://qiita.com/kazatsuyu/items/b9bde80d79d0cb26be7d)
* [GCC7のリリースノート](https://gcc.gnu.org/gcc-7/changes.html)
