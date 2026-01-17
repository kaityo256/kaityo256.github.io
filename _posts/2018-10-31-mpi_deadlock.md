---
layout: post
title: "MPIにおけるデッドロックサンプル"
tags: [hpc, qiita]
permalink: mpi_deadlock
---

# MPIにおけるデッドロックサンプル

## はじめに

よく知られているように、以下のようなコードはデッドロックの可能性がある。

```cpp
  MPI_Status st;
  if (rank == 0) {
    MPI_Send(sendbuf.data(), size, MPI_INT, 1, 0, MPI_COMM_WORLD);
    MPI_Recv(recvbuf.data(), size, MPI_INT, 1, 0, MPI_COMM_WORLD, &st);
  } else {
    MPI_Send(sendbuf.data(), size, MPI_INT, 0, 0, MPI_COMM_WORLD);
    MPI_Recv(recvbuf.data(), size, MPI_INT, 0, 0, MPI_COMM_WORLD, &st);
  }
```

しかし、送るデータサイズが小さい時にはデッドロックしない。
これは、サイズが小さい場合にはEager(イーガー)プロトコルが選択されるため。
Eagerプロトコルは、送信側が受信側の応答を待たずにバッファにデータをコピーし、
データのコピーが完了したら次に進んでしまう。これにより、`MPI_Send`に対する相手からの応答がなくても、
次の`MPI_Recv`が実行され、データの送受信が完了する。
しかし、データサイズが大きい場合にはRendezvous(ランデブー)プロトコルが採用される。
こちらはデータの送受信に際して送信側と受信側のハンドシェイクをするため、上記のコードがデッドロックする。

簡単に図解するとこんな感じ？

![image0.png](/assets/images/mpi_deadlock/image0.png)

図は[一週間でなれる！スパコンプログラマ](https://github.com/kaityo256/sevendayshpc)より。

EagerプロトコルからRendezvousが切り替わるデータのサイズはシステムや処理系に依存する。
多くの場合マニュアル等に書いてあったり環境変数で参照できたりするのだろうが、ここでは
実際にデッドロックしたりしなかったりすることと、2つのプロトコルが切り替わるデータサイズを
調べてみる。

サンプルコードは以下に置いておく。

https://github.com/kaityo256/deadlock

## 試し方

必要に応じて`makefile.opt`を作成すること。
もしインテルコンパイラを使いたいなら、例えば以下のようにすれば良い。

```makefile
CC=icpc
CPPFLAGS=-lmpi -lmpi_cxx
```

`make`すると2つの実行バイナリができる。

```sh
$ make
mpic++ test.cpp -o a.out
mpic++ test2.cpp -o b.out
```

`a.out` はデッドロックする可能性のあるコードで、`b.out`はデッドロックしないもの。
引数にデータのサイズを指定する。

```sh
$ mpirun -np 2 ./a.out 1000
I am 1: Recieved 0
I am 0: Recieved 1

$ mpirun -np 2 ./a.out 2000 # デッドロックして処理が返ってこない
```

2つのプロトコルが切り替わるサイズを調べるには、`search.rb`を使う。
「デッドロックしてない場合には1秒以内に終了するだろう」と決め打ちして、

```rb
system("timeout 1 mpirun -np 2 ./a.out #{n} > /dev/null")
```

の結果が成功かどうかでデッドロックしているかどうか判定している。
Macで実行する際は`timeout`を`gtimeout`に修正するか、`timeout`で実行できるように環境設定すること。

手元のMac+OpenMPIで実行するとこんな感じになった。

```sh
$ ruby search.rb
500050 NG
250075 NG
125087 NG
62593 NG
31346 NG
15723 NG
7911 NG
4005 NG
2052 NG
1076 NG
588 OK
832 OK
954 OK
1015 NG
984 OK
999 OK
1007 OK
1011 NG
1009 OK
1010 OK
```

データの切り替えサイズが1010であることがわかる。`int`を送っているので、切り替えサイズは4040バイトになる。

ちなみに、`b.out`では、該当箇所がこうなっている。

```cpp
  MPI_Status st;
  if (rank == 0) {
    MPI_Send(sendbuf.data(), size, MPI_INT, 1, 0, MPI_COMM_WORLD);
    MPI_Recv(recvbuf.data(), size, MPI_INT, 1, 0, MPI_COMM_WORLD, &st);
  } else {
    MPI_Recv(recvbuf.data(), size, MPI_INT, 0, 0, MPI_COMM_WORLD, &st);
    MPI_Send(sendbuf.data(), size, MPI_INT, 0, 0, MPI_COMM_WORLD);
  }
```

片方が「先にSend、後でRecv」なのに対して、もう一方が「先にRecv、次にSend」なので、こちらはRendezvousプロトコルでもデッドロックしない。

## まとめ

MPIでよく出てくるデッドロックの例が、実際にやってみるとデッドロックしなかったりして、初心者は混乱するかもしれない。
ここで、EagerプロトコルとRendezvousの二種類が自動で切り替わっていることを知らないと、とりあえず小さい系では動くのに、大きな系ではデッドロックするような、分かりづらいバグを入れることになる。とりあえずこういうデッドロックを防ぐために、普段から`MPI_Sendrecv`を使うようにしておけば問題ない。著者の経験ではSend/Recvを使うより`Sendrecv`を使うほうが早いことがほとんどだった。
