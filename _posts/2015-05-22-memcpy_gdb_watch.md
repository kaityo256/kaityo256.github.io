---
layout: post
title: "構造体のコピーとmemcpyとgdbのウォッチポイント"
tags: [programming, devtools, qiita]
permalink: memcpy_gdb_watch
---

# 構造体のコピーとmemcpyとgdbのウォッチポイント

## はじめに

構造体のサイズがある程度大きくなると代入にmemcpyが呼ばれてgdbのウォッチポイントでソースの行数がわからなくなる話と、どのくらいのサイズでmemcpyを呼ぶかは処理系依存な話。

## gdbのウォッチポイントとmemcpy

そういうことはおきて欲しくないものだが、クソコードをデバッグしなければならないこともある。グローバル変数バリバリで、構造体とか定義しまくっていて、なおかつ**そのポインタを別のポインタに代入しまくってるからどこで変数が修正を受けているかコードを見ているだけじゃわからない**というコード。

で、不幸にしてそういうコードをいじることになった場合、強力な味方になるのがgdbのウォッチポイント。これで変数を監視すれば、ポインタとかを経由して変数の名前が変わっても変更を検知できる。

ところが、ある程度以上大きな構造体の代入はmemcpyが呼ばれるが、処理系によってはmemcpyによる変数書き換えそのものは検知できても、対応するソースの行を検出できないことがある。

たとえばこんなコードを書いてみる。ちなみにOSはCentOS、g++のバージョンはg++ (GCC) 4.4.7 20120313 (Red Hat 4.4.7-11)。

```cpp
#include <stdio.h>
struct Hoge{
  int x;
  int buf[N];
};
Hoge a,b;
int
main(void){
  b.x = 1;
  b.buf[0] = 1;
  a = b;
}
```
Nの定義が無いが、これはコンパイル時に与える。
で、N=2047にしてコンパイルし、a.xをwatchして見る。

```shell-session
$ g++ -DN=2047 -g test.cc 
$ gdb ./a.out
(gdb) watch a.x
Hardware watchpoint 1: a.x
(gdb) r
Starting program: ./a.out
Hardware watchpoint 1: a.x

Old value = 0
New value = 1
0x0000000000400585 in main () at test.cc:11
11	  a = b;
Missing separate debuginfos, use: debuginfo-install glibc-2.12-1.132.el6.x86_64 libgcc-4.4.7-11.el6.x86_64 libstdc++-4.4.7-11.el6.x86_64
```
ちゃんとtest.ccの11行目の「a=b;」で変数変化を検知した。

次に、N=2048で同じことをやってみる。

```shell-session
$ g++ -DN=2047 -g test.cc 
$ gdb ./a.out
(gdb) watch a.x
Hardware watchpoint 1: a.x
(gdb) r
Starting program: ./a.out
Hardware watchpoint 1: a.x

Old value = 0
New value = 1
0x0000003486089aab in memcpy () from /lib64/libc.so.6
Missing separate debuginfos, use: debuginfo-install glibc-2.12-1.132.el6.x86_64 libgcc-4.4.7-11.el6.x86_64 libstdc++-4.4.7-11.el6.x86_64
```
と、memcpyにより変化したので、行番号が検出できなかった。

ちなみにインテルコンパイラ(icpc)だと、memcpyされても行番号が検出できる。

```shell-session
$ icpc -DN=2048 -S test.cc; grep memcpy test.s 
        call      _intel_fast_memcpy                            #11.7

$ gdb ./a.out
(gdb) watch a.x
(gdb) r
Starting program: ./a.out 
Hardware watchpoint 1: a.x

Old value = 0
New value = 1
0x00000000004005a3 in main () at test.cc:11
11	  a = b;
```

## 構造体のサイズとmemcpy

構造体がどのくらいのサイズになったらmemcpyを呼ぶかは処理系やオプションに強く依存する。こんなコードを書いてみる。

```cpp
struct Hoge{
  int buf[N];
};
void
func(Hoge &a, Hoge &b){
  a = b;
}
```

いろんなNを与えてコンパイルし、memcpyが呼ばれているかを調べる。こんな感じ。

```shell-session
$ g++ -S -DN=32 test2.cc;grep memcpy test2.s 

$ g++ -S -DN=33 test2.cc;grep memcpy test2.s
	call	_memcpy
```

これをいくつかの処理系で試してみる。とりあえず手元のMacとCentOSで。おそらくOSというより処理系のバージョンの問題が大きいと思うが。

- (Mac) g++ (MacPorts gcc49 4.9.2_1) 4.9.2
- (Mac) clang++ Apple LLVM version 6.0 (clang-600.0.57) (based on LLVM 3.5svn)
- (CentOS) g++ (GCC) 4.4.7 20120313 (Red Hat 4.4.7-11)
- (CentOS) icpc (ICC) 12.1.4 20120410

|OS | 処理系 | オプション| memcpyが出るサイズ (N)|
|:-----------:|:-----------:|:------------:|:------------:|
|Mac OSX| g++  | なし, -O1, -O2, -O3 | 33|
|Mac OSX| clang++  | なし | 9|
|Mac OSX| clang++ | -O1 以上 | 33|
|CentOS | g++ | なし, -O1, -O2, -O3 | 2049|
|CentOS | icpc | -O0, -O1 | memcpy吐かない|
|CentOS | icpc | なし(-O2), -O3 | 33|

clang++とicpcはオプションにより挙動が変化する。clang++はmemcpyを呼ぶスレッショルドが変わり、icpcは-O1以下だとそもそもmemcpyを使わず、-O2以上だと N=33以上で _intel_fast_memcpyを呼ぶみたい。

## まとめ

memcpyが呼ばれるとgdbのウォッチポイントでソースの行数がわからなくなる場合があり、構造体のコピーでmemcpyが呼ばれるかどうかは処理系にもサイズにも依存する。
