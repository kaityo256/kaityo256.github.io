---
layout: post
title: "MPIでstd::vectorをやりとりする"
tags: [programming, hpc, qiita]
permalink: mpi_vector
---

# MPIでstd::vectorをやりとりする


これはなんとなく[MPI Advent Calendar 2017](https://adventar.org/calendars/2548)の14日目の記事である気がします。

## はじめに

どうも、[kaityo256](https://twitter.com/kaityo256)といいます。SEのようなものをやってます。趣味は他人のアドベントカレンダーを乗っ取ることです(乗っ取るとは言ってない)。並列計算とかMPIとかあまり詳しくないですが、せっかくこのAdCが空いてるので埋めてみましょうか。

## MPIで可変長のデータのやりとり

通信で、可変長データをやりとりしたいことが結構あります。現在行われている非自明並列計算の多くは領域分割を採用していると思いますが、領域分割では「のりしろ」のデータを隣とやりとりする必要があります。格子系だと毎回同じ量のデータを送受信しますが、粒子系だと毎ステップ送受信サイズが変わるため、ちょっと面倒です。

というわけで、`std::vector`をSendrecvするテンプレートがあるとたまに便利です。ナイーブに実装するとこんな感じでしょうか。

```cpp-objdump
template <class C>
void SendrecvVector(C &send_buffer, int dest_rank, C &recv_buffer, int src_rank) {
  MPI_Status st;
  int sendcount = send_buffer.size();
  int recvcount;
  MPI_Sendrecv(&sendcount, 1, MPI_INT, dest_rank, 0, &recvcount, 1, MPI_INT, src_rank, 0, MPI_COMM_WORLD, &st);
  recv_buffer.resize(recvcount);
  MPI_Sendrecv(&send_buffer[0], sendcount * sizeof(send_buffer[0]), MPI_BYTE, dest_rank, 0, &recv_buffer[0], recvcount * sizeof(recv_buffer[0]), MPI_BYTE, src_rank, 0, MPI_COMM_WORLD, &st);
}
```

要するに送信バッファと受信バッファ用の`std::vector`を参照で受け取り、まず送受信サイズをSendrecvしてから、データを送受信します。

サンプルコードとして、プロセスが一次元的に周期境界で繋がってるとして、各プロセスごとに異なるサイズの`std::vector`を用意し、左からデータを受け取り、自分のデータを右に送信するコードを書いてみましょう。

```cpp
#include <cstdio>
#include <vector>
#include <mpi.h>

template <class C>
void SendrecvVector(C &send_buffer, int dest_rank, C &recv_buffer, int src_rank) {
  MPI_Status st;
  int sendcount = send_buffer.size();
  int recvcount;
  MPI_Sendrecv(&sendcount, 1, MPI_INT, dest_rank, 0, &recvcount, 1, MPI_INT, src_rank, 0, MPI_COMM_WORLD, &st);
  recv_buffer.resize(recvcount);
  MPI_Sendrecv(&send_buffer[0], sendcount * sizeof(send_buffer[0]), MPI_BYTE, dest_rank, 0, &recv_buffer[0], recvcount * sizeof(recv_buffer[0]), MPI_BYTE, src_rank, 0, MPI_COMM_WORLD, &st);
}

int
main(int argc, char **argv){
  MPI_Init(&argc, &argv);
  int rank, size;
  MPI_Comm_rank(MPI_COMM_WORLD, &rank);
  MPI_Comm_size(MPI_COMM_WORLD, &size);
  std::vector<double> send_buffer, recv_buffer;
  const int n = rank+1;
  for(int i=0;i<n;i++){
    send_buffer.push_back(rank);
  }
  const int dest_rank = (rank+1+size) %size;
  const int src_rank = (rank-1+size) %size;
  SendrecvVector(send_buffer, dest_rank, recv_buffer, src_rank);
  for(int i=0;i<size;i++){
    MPI_Barrier(MPI_COMM_WORLD);
    if(rank != i)continue;
    printf("myrank = %d\n",rank);
    for(unsigned int j=0;j<recv_buffer.size();j++){
      printf("%u:%f\n",j,recv_buffer[j]);
    }
  }
  MPI_Finalize();
}
```

各プロセスは、それぞれ自分のrank番号で初期化されたrank+1個のサイズの`double`のデータを保持します。それを送受信してから、受け取ったデータを順番に出力させています。実行してみましょう。

```shell-session
$ mpic++ test.cpp 
$ mpirun -np 4 ./a.out
myrank = 0
0:3.000000
1:3.000000
2:3.000000
3:3.000000
myrank = 1
0:0.000000
myrank = 2
0:1.000000
1:1.000000
myrank = 3
0:2.000000
1:2.000000
2:2.000000
```

できてるみたいですね。

## まとめ

`std::vector`を送受信するコードを作ってみました。こういうのはboost.mpiを使ったほうがいいという意見もあると思いますが、そういうものがインストールされておらず、かつインストールする権限もない環境でMPIを使わないといけないことは多々あります。
本当ならばこういうのを「ちゃんと」やるのはMPIのC++バインディングだったはずなのですが、ご存知のようにMPI-3から外されてしまいました。Ciscoの「MPI Guy」ことJeff Squyresさんは「そもそもちゃんとアプリ書いてる奴でC++バインディング使ってるやつなんてほとんどいないし、C++言語そのものに起因する微妙な問題にもうウンザリだし(意訳)」みたいなこと[書いて](https://blogs.cisco.com/performance/the-mpi-c-bindings-what-happened-and-why)ます。

そんなわけで現在でもMPIは非常にCライクに使われており、C++使いは今日も生のMPIをラップした関数を再生産していくわけですね。

まぁ、本気で「C++っぽくMPIを使うとしたらどうするべきか？」を考えるとこれは難しい問題ですね。そもそも「C++らしさとは何か？」を考え、さらに「MPIという哲学とC++の哲学はマッチするのか」とか考え出すと、それだけでストロングゼロが10本くらいは必要な気がします。

そのうち「ちゃんとした並列計算用言語/ライブラリ」は出現するのでしょうか・・・？[^1]

[^1]: これを書いている筆者自身も「ちゃんとした並列計算用言語」の定義ができないので、議論のしようがないですが・・・。
