---
layout: post
title: "Mac上でg++でコンパイル、実行するとSIGILLが出るコード"
tags: [mac, devtools, qiita]
permalink: mac_sigill
---

# Mac上でg++でコンパイル、実行するとSIGILLが出るコード

## はじめに

Mac上でSIGSEGVが出そうなコードをg++でコンパイル、実行するとSIGILLが出たのでメモ。

再現コードはここに置いてある。

https://github.com/kaityo256/sigill_on_mac

## 現象

* 再現環境[^1]
  * macOS High Sierra 10.13.3
  * g++ (Homebrew GCC 7.2.0) 7.2.0
  * 3.3 GHz Intel Core i5

[^1]: 同じバージョンのOS、GCCで、石だけCore i7な環境でも再現した。


以下のコードを`g++ -march=native -O3`でコンパイル、実行するとSIGILLが出る(`a.out`)。

```test.cpp
//------------------------------------------------------------------------
#include <iostream>
#include <string>
#include <fstream>
//------------------------------------------------------------------------
#ifdef CASE_C
inline   // if activate this line, a program works
#endif
void func2(int a[81]) {
  int n[6][9][9] = {};
  for (int i = 0; i < 9; i++) {
    int i1 = a[i];
    int i2 = a[i + 9];
    n[0][i1][i2]++;
    n[0][i2][i1]++;
  }
  std::string s1[3];
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 6; i++) {
      s1[j][i] = '0' + n[j][0][i];
    }
  }
}
//------------------------------------------------------------------------
void
func(void){
#ifndef CASE_B
  std::ifstream ifs("test.dat");//with this, the program aborts with SIGILL
#endif
  int a[81];
  func2(a);
}
//------------------------------------------------------------------------
int
main(void) {
  func();
}
//------------------------------------------------------------------------
```

以下は実行結果

```
$  g++ -march=native -O3 test.cpp -o a.out
$ ./a.out
zsh: illegal hardware instruction  ./a.out
```

## 詳細

* コードの中に全く使われない`std::ifstream`の宣言があるが、これを削除するとSIGILLは出ない(`-DCASE_B`をつけてコンパイルするとできる`b.out`)。
* `main`関数から二回の関数呼び出しがあるが、最後に呼ばれる関数に`inline`指定をするとSIGILLがでない(`-DCASE_C`をつけてコンパイルするとできる`c.out`)。
* `-march=native`を外したり、最適化レベルを下げても発生しない。
* clang++では出ない。
* Linuxだと普通にSIGSEGVが出る
* gdbが言うには`addl   $0x1,0x60(%rsp,%rdx,4) `で止まっているらしい。普通にアクセス違反っぽいんだけど・・・

## 疑問点

* SIGSEGVが出るのはわかるけれど、なぜSIGILLが出るんだろう？
* Macのバグなの？GCCのバグなの？

## 追記

一行で再現するコードを作った。

```test.cpp
int main(void) {
  __asm__("movl  $0, 0(%rbp,%rdx,4)");
}
```

これをデフォルトオプションでコンパイル、実行すると、g++でもclang++でもSIGILLが出る。

```shell-session
$ g++ --version 
g++ (Homebrew GCC 7.2.0) 7.2.0
Copyright (C) 2017 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
$ g++ test.cpp
$ ./a.out
zsh: illegal hardware instruction  ./a.out

$ clang++ --version 
Apple LLVM version 9.0.0 (clang-900.0.39.2)
Target: x86_64-apple-darwin17.4.0
Thread model: posix
InstalledDir: /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin
$ clang++ test.cpp
$ ./a.out
zsh: illegal hardware instruction  ./a.out
```

というわけで、

* g++の問題ではない(clang++でも出る)。
* コンパイルオプションや、`std::string`や`std::ifstream`の問題ではない(不適切なmovlを出すための条件)
* LinuxではSIGBUSが、Windows (CYGWIN)ではSIGSEGVが出るのに、MacではSIGILLが出る

ということがわかった。

・・・なぜ？
