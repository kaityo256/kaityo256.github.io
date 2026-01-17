---
layout: post
title: "MPIプログラムからMPIプログラムをstd::systemで呼び出すと問題を起こす"
tags: [hpc, qiita]
permalink: mpi_system
---

# MPIプログラムからMPIプログラムをstd::systemで呼び出すと問題を起こす

## はじめに

これは[MPI Advent Calendar 2017](https://adventar.org/calendars/2548)の7日目の記事です。「[この辺でもう遠慮しようと思います](https://qiita.com/kaityo256/items/59a12abc48883bfefd62)」とか書いた気がしますがあれは嘘です。

並列コードを書くまでもない自明並列、いわゆる「バカパラ」をしたいときが結構あります。例えば大量のデータを処理したい、多数のフレームのレンダリングをしたい、などです。こんな要望に例えば「バルクジョブ」という形でシステム側で対応してくれているサイトもありますが、単純並列の場合は、MPIのラッパーを書いて、実行したいプログラムを`std::system`で呼び出す、ということをよくやります。

しかし、この子プロセスとして呼び出されるコードが、普通のシリアルプログラムではなく、MPIがリンクされた並列コードだと問題を起こすため、それについて紹介します。サンプルコードは

https://github.com/kaityo256/mpisystem

に置いておきます。

## サンプルコード

まず、親プロセス側(呼び出し側)としてこんなコードを書きます。

```a.cpp
#include <cstdio>
#include <cstdlib>
#include <mpi.h>

int main(int argc, char **argv) {
  MPI_Init(&argc, &argv);
  std::system("./b.out");
  MPI_Finalize();
}
```

単に`std::system`で`b.out`を実行するだけのコードです。

子プロセス側(呼び出され側)としてこんなコードを書いてみます。

```b.cpp
#include <cstdio>
#include <mpi.h>

int main(int argc, char **argv) {
  MPI_Init(&argc, &argv);
  printf("Hello World\n");
  MPI_Finalize();
}
```

何もせず、"Hello World"と表示するだけのコードです。ただし`MPI_Init`と`MPI_Finalize`は呼び出します。

さて、これをコンパイル、実行します。以下はMac上のOpen MPIの場合です。

```shell
$ mpicxx a.cpp -o a.out 
$ mpicxx b.cpp -o b.out
$ mpiexec -np 2 ./a.out
Hello World
Hello World # ← ここでプログラム実行が止まり、正常終了しない
```

一応コードは実行できますが、最後で止まってしまいます。ここでCtrl+Cを押すとSIGSEGVを吐いて異常終了します。

別サイトでIntel MPIで実行してみると、やはり実行はできますが最後に

```
===================================================================================
=   BAD TERMINATION OF ONE OF YOUR APPLICATION PROCESSES
=   PID XXXX RUNNING AT hostname
=   EXIT CODE: 13
=   CLEANING UP REMAINING PROCESSES
=   YOU CAN IGNORE THE BELOW CLEANUP MESSAGES
===================================================================================
```

みたいなエラーを吐いて死にます。

## まとめ

MPIプログラムからstd::systemを使って子プロセスを大量に実行する、というのはよくやっていたのですが、子プロセスとしてMPIプログラムを実行すると異常終了する、というのは知らなかったのでシェアしてみました。よく考えると、MPIを多段実行していることになり、MPI_Finalizeがおかしくなるのはわかる気がしますが、実際そう言われるまでは気が付きませんでした。
