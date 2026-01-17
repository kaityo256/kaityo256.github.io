---
layout: post
title: "Macのg++でifstream::readが2GB以上のファイルを一度に読めない"
tags: [programming, mac, devtools, qiita]
permalink: ifstream_2gb
---

# Macのg++でifstream::readが2GB以上のファイルを一度に読めない

## はじめに

Linuxでちゃんと走るコードがMacでバグったので調べたところ、`std::ifstream::read`で2GB以上のファイルを読み込もうとすると読めないことが理由だったのでメモ。

うちの環境。

* 再現環境[^1]
  * macOS High Sierra 10.13.3
  * g++ (Homebrew GCC 7.2.0) 7.2.0
  * clang++ (Apple LLVM version 9.0.0 (clang-900.0.39.2))

## 再現手順

まず2GBのファイルを作る。

```shell-session
$ gdd if=/dev/zero of=test.dat bs=1G count=2
2+0 records in
2+0 records out
2147483648 bytes (2.1 GB, 2.0 GiB) copied, 3.37816 s, 636 MB/s
$ gstat -c "%s" test.dat 
2147483648
```

2GB(2147483648バイト)のファイルが作成された。

これを`std::ifstream`で一括で読み込んで見る。

```test.cpp
#include <iostream>
#include <cstdlib>
#include <fstream>

int
main(int argc, char** argv){
  const char *filename=argv[1];
  long len = atol(argv[2]);
  char *buf = new char[len];
  std::cout << len << std::endl;
  std::ifstream ifs(filename);
  ifs.read(buf,len);
  if(ifs){
    std::cout << "OK" << std::endl;
  }else{
    std::cout << "NG" << std::endl;
  }
  delete [] buf;
}
```

後でいじるため、コマンドラインからファイル名とファイルサイズを与えている。

コンパイル、実行してみる。

```shell-session
$ g++ test.cpp
$ ./a.out test.dat 2147483648
2147483648
NG
```

失敗した。

## その他の条件

## clang

clang++で同じことをするとちゃんと読める。

```shell-session
$ clang++ test.cpp
$ ./a.out test.dat 2147483648
2147483648
OK
```

## 2GB -1 

2GBより1バイトだけ小さく読み込むとg++でも読める。

```shell-session
$ g++ test.cpp
$ ./a.out test.dat 2147483648
2147483648
NG

$ ./a.out test.dat 2147483647 # ← 1バイト減らした
2147483647
OK
```
## Linux

Linuxでは同じバージョンのg++でもうまくいく。

```shell-session
$ dd if=/dev/zero of=test.dat bs=1G count=2
2+0 records in
2+0 records out
2147483648 bytes (2.1 GB, 2.0 GiB) copied, 1.69692 s, 1.3 GB/s

$ g++ --version
g++ (GCC) 7.2.0
Copyright (C) 2017 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

$ g++ test.cpp

$ ./a.out test.dat 2147483648
2147483648
OK
```

SUSEとRedhatで試した。

## まとめ

Macとg++の組み合わせでは`std::ifstream`で一度に2GB以上のファイルを読み込もうとすると失敗する。Macでもclang++なら大丈夫だし、Linuxなら同じバージョンのg++でも大丈夫。

## 追記

clangでも、以下のようにしてlibstdc++を使わせると同じことがおきる。

```shell-session
$ clang++ -stdlib=libstdc++ test.cpp 
clang: warning: libstdc++ is deprecated; move to libc++ [-Wdeprecated]

$ ./a.out test.dat 2147483648
2147483648
NG

$ ./a.out test.dat 2147483647 
2147483647
OK
```

libc++　なら大丈夫なので、処理系ではなく、ライブラリの問題なのは間違いないっぽい。
