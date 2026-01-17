---
layout: post
title: "GCCで大きな配列を初期化するコードを-gつきでコンパイルすると遅い"
tags: [programming, devtools, qiita]
permalink: gcc_debug_array
---

# GCCで大きな配列を初期化するコードを-gつきでコンパイルすると遅い


## はじめに

配列の初期化について調べてたら変な現象を見つけたのでメモ。

## 現象

以下の二種類のコード、`test.cpp`、`test2.cpp`を考える。


```cpp
#include <stdio.h>
const int N = 100000000;

int
main(void){
  static int a[N] = {};
  printf("%d\n",a[0]);
}
```

```cpp
#include <stdio.h>
const int N = 100000000;
int a[N] = {};

int
main(void){
  printf("%d\n",a[0]);
}
```

* `test.cpp` でかい配列をmain関数内でstatic宣言+初期化。
* `test2.cpp` でかい配列をmain関数の外で宣言+初期化。

これを`g++ -O3 -g test.cpp/test2.cpp`と、最適化オプション＋デバッグ情報付きでコンパイルするとえらく時間がかかったりかからなかったりする。この現象は環境(おそらくGCCのバージョン)に依存する。

## MacやCygwinで試した場合


まず、Mac+GCCの場合。環境はiMac Late 2015で、石は3.3 GHz Intel Core i5である。


```shell-session
$ g++ --version 
g++ (Homebrew GCC 6.3.0_1) 6.3.0
Copyright (C) 2016 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

$ time g++ -O3 -g test.cpp
g++ -O3 -g test.cpp  188.53s user 41.20s system 92% cpu 4:08.32 total
```

たった数行(実質一行)のコードのコンパイルに、なんと4分もかかる。

clang++はすぐに終わる。

```shell-session
$ clang++ --version 
Apple LLVM version 8.1.0 (clang-802.0.42)
Target: x86_64-apple-darwin16.6.0
Thread model: posix
InstalledDir: /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin

$ time clang++ -O3 -g test.cpp 
clang++ -O3 -g test.cpp  0.04s user 0.02s system 85% cpu 0.064 total
```

デバッグオプションをつけなかったり、最適化オプションを消しても早く終る。

```shell-session
$ time g++ -g test.cpp   # 最適化オプションなし
g++ -g test.cpp  0.53s user 0.03s system 97% cpu 0.570 total

$ time g++ -O3 test.cpp # デバッグオプションを消した
g++ -O3 test.cpp  0.54s user 0.02s system 97% cpu 0.575 total
```

main関数内にある配列宣言を外に出した奴(`test2.cpp`)を食わすとコンパイルはすぐ終わる。

```shell-session
$ time g++ -O3 -g test2.cpp 
g++ -O3 -g test2.cpp  0.53s user 0.03s system 97% cpu 0.568 total
```

Cygwinでも同様な振る舞い、つまり関数内に宣言した`test.cpp`は遅く、関数の外に出した`test2.cpp`は早い、という現象が起きる。

```shell-session
$ g++ --version
g++ (GCC) 5.4.0
Copyright (C) 2015 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.


$ time g++ -O3 -g test.cpp
g++ -O3 -g test.cpp  382.31s user 6.91s system 81% cpu 8:00.41 total

$ time g++ -O3 -g test2.cpp
g++ -O3 -g test2.cpp  1.28s user 0.23s system 97% cpu 1.552 total
```

たった数行のファイルに、コンパイル時間8分!


## Linuxの場合

Linux + g++ (GCC) 5.1.0とかでも2分くらいかかる。

```shell-session
$ g++ --version
g++ (GCC) 5.1.0
Copyright (C) 2015 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

$ time g++ -O3 -g test.cpp
g++ -O3 -g test.cpp  116.28s user 4.30s system 99% cpu 2:00.82 total
```

また、Linuxの場合は配列宣言を関数の外に出しても時間かかる。

```shell-session
$ time g++ -O3 -g test2.cpp
g++ -O3 -g test2.cpp  115.31s user 4.87s system 96% cpu 2:04.01 total
```

手元に超古いGCC(4.1.2)があったので試すと、どちらのケースでもさほど時間がかからない。

```shell-session
$ g++ --version
g++ (GCC) 4.1.2 20080704 (Red Hat 4.1.2-55)
Copyright (C) 2006 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

$ time g++ -O3 -g test.cpp  
g++ -O3 -g test.cpp  0.23s user 2.01s system 59% cpu 3.762 total

$ time g++ -O3 -g test2.cpp
g++ -O3 -g test2.cpp  0.04s user 0.10s system 100% cpu 0.141 total
```


## 実行バイナリのファイルサイズ

コンパイルに時間がかかっている時、実行バイナリのサイズが大きくなる。

まず、Linux+GCCの場合、

```shell-session
$ du -h a.out
382M	a.out
```

とファイルサイズが382MBになっている。

Linux+icpcだと短時間で終わり、バイナリも小さい。

```shell-session
$ time icpc -O3 -g test.cpp  
icpc -O3 -g test.cpp  0.10s user 0.18s system 57% cpu 0.473 total

$ du -h a.out
512	a.out
```

Macの場合はa.out自体は大きくならないが、別の場所に保存されている情報が大きくなる。

```shell-session
$ du -h a.out
 12K	a.out

$ du -h a.out.dSYM/Contents/Resources/DWARF/a.out
381M	a.out.dSYM/Contents/Resources/DWARF/a.out
```

ここまでだと、「時間がかかってる時にはバイナリサイズが大きくなる」と結論付けたくなるが、Linux+古いGCCでは、時間がかからず、かつバイナリもでかい。

```shell-session
$ time g++ -O3 -g test.cpp
g++ -O3 -g test.cpp  0.18s user 2.06s system 66% cpu 3.382 total

$ du -h a.out
382M	a.out
```

ただし、`-c`でコンパイルしてもでかいオブジェクトファイルを吐くが、`-S`つけると吐くasmは小さい。

```shell-session
$ g++ -O3 -g -c test.cpp 
$ du -h test.o 
382M	test.o

$ g++ -O3 -g -S test.cpp 
$ wc test.s
  971  1902 13591 test.s
```

他のケースでは、`-S`つけると馬鹿でかいasmを吐く。


## まとめ

以上をまとめると、馬鹿でかい配列＋初期化というソースをGCCでコンパイルした際、

* GCCのバージョンが古い(4.1.2)場合は、関数の中、外どちらで配列を初期化してもコンパイル時間はかからない
* GCCのバージョンが新しい(>5.4.0)場合は、関数の中でstatic宣言＋初期化をすると時間かかるが、関数の外に出すと時間がかからない
* GCCのバージョンが中くらい(5.1.0とか)の場合は、関数の中、外どちらで配列を初期化してもコンパイル時間が長くなる

ということのようだ。最初、ファイルサイズ(=オブジェクトファイルサイズ)との関連を疑ったが、GCC 4.1.2の場合はそこそこコンパイルは早く、実行バイナリは大きい。ただし、時間がかかる場合は、`g++ -O3 -g -S`で馬鹿でかいasmを吐く、というのは共通の模様。GCC 4.1.2の場合、実行バイナリは大きくなるが、吐くasmは小さい。
