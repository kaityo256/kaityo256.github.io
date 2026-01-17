---
layout: post
title: "MPIでいんちきクライアント・サーバ型自明並列"
tags: [programming, hpc, qiita]
permalink: mpi_fake_cs
---

# MPIでいんちきクライアント・サーバ型自明並列

## はじめに

MPIでパラメータの自明並列をやりたい。ただし、パラメータごとにかなりタスクの重さが違い、かつその重さは事前にはわからないものとする。タスクを数で均等に分けると、かなりロードバランスが悪くなる。そこでクライアント・サーバっぽく、ルートプロセスがサーバに、各プロセスがクライアントとなり、クライアントからサーバに仕事をもらってくるようにしたい。

## 方針

## ポーリング

まず、どのプロセスが通信準備が整っているか(=以前渡した仕事が終わっているか)をルートプロセスが知る手段が必要になる。それにはMPI_Iprobeを使う。使い方はこんな感じ。

```cpp
int flag;
MPI_Status st;
MPI_Iprobe(source, tag, MPI_COMM_WORLD, &flag, &st);
```

sourceで指定されたプロセスから、自分宛てに通信が届いているかを確認する。もし通信が来ていたらflagに1が、そうでなければ0が返ってくる。同じ通信に何度でも問い合わせることができ、MPI_Waitなどは呼ばなくても良い(多分)。 ただし、MPI_Iprobeでプローブできるのは、「自分宛ての通信が届いているか？」なので、 最初はクライアント側から通信を送る必要がある。 なので、

- 自分のタスクが終わったクライアントは、サーバ(ルートプロセス)にダミーデータの送信をする。
- サーバは、MPI_Iprobeで各プロセスをチェックし、データの送信を検出したら、通信準備ができていると判断。 データを送信する。 

と、一度ダミーデータの送受信をかませる必要がある。 これを使ってポーリングし、flag=1になったら、そのプロセスに仕事を渡す。

## 終了通知

ルートプロセスが管理しているタスクが全て終了したら、その旨を各ワーカーに伝えないといけない。これもポーリングで行う。各ワーカーは先ほどと同様に通信を試みているので、ルートプロセスは同様にポーリングし、仕事が終わったワーカーに「仕事はおしまいですよ」と伝える必要がある。それは、「仕事」と同じデータ形式でなければならない。ここでは整数を送り、1以上なら仕事、0なら終了通知としている。ちゃんとしたプログラムでは構造体か何か送って、そのフラグか何かチェックさせるのがまっとうだと思う。

## コード

という方針で作ったのが以下のコード。タスクはとりあえず整数。タスクの重さを表現するため、各ワーカーは受け取った整数に比例してusleepする。

```cpp
//------------------------------------------------------------------------
#include <mpi.h>
#include <unistd.h>
#include <vector>
#include <stdio.h>
//------------------------------------------------------------------------
const int DATA = 7;  //タスクの総数
int data[DATA] = {3,1,1,1,1,1,1}; //タスクの重さ
//------------------------------------------------------------------------
// ルートプロセスのお仕事
//------------------------------------------------------------------------
void
manager(const int procs){
  int count = 0;
  //仕事バラマキルーチン
  while(count < DATA){
    MPI_Request req;
    MPI_Status st;
    int dummy = 0;
    int flag = 0;
    for(int i=1;i<procs && count < DATA;i++){
      //ポーリング
      MPI_Iprobe(i, 0, MPI_COMM_WORLD, &flag, &st);
      if(flag == 1){
        // プロセスiが通信準備完了しているので、ダミーデータを受信してから仕事を割り当てる。
        MPI_Recv(&dummy, 1, MPI_INT, i,0,MPI_COMM_WORLD, &st);
        MPI_Send(&data[count], 1, MPI_INT, i,0,MPI_COMM_WORLD);
        count++;
      }
    }
    usleep(100);
  }
  // 終了通知ルーチン
  std::vector<bool> vf;
  for(int i=0;i<procs;i++){
    vf.push_back(false);
  }
  int finish_check = procs-1;

  while(finish_check>0){
    MPI_Status st;
    int dummy = 0;
    int recv = 0;
    int flag = 0;
    for(int i=1;i<procs;i++){
      if(vf[i])break;
      flag = false;
      MPI_Iprobe(i, 0, MPI_COMM_WORLD, &flag, &st);
      if(flag){
        MPI_Recv(&recv, 1, MPI_INT, i,0,MPI_COMM_WORLD, &st);
        MPI_Send(&dummy, 1, MPI_INT, i,0,MPI_COMM_WORLD);
        finish_check--;
        vf[i] = false;
      }
      usleep(100);
    }
  }
}
//------------------------------------------------------------------------
// クライアント(ワーカ)のお仕事
//------------------------------------------------------------------------
void
worker(const int rank){
  while(true){
    int send = 10;
    int recv = 0;
    MPI_Status st;
    //通信準備完了を知らせるため、ダミーデータを送信
    MPI_Send(&send, 1, MPI_INT, 0,0, MPI_COMM_WORLD);
    //お仕事データを受け取る
    MPI_Recv(&recv, 1, MPI_INT, 0,0,MPI_COMM_WORLD, &st);
    if (recv ==0){
	  // 0を受け取ったら、お仕事終了と判断
      printf("Finish OK: %d\n",rank);
      break;
    }
    printf("%d: Recieved %d\n",rank, recv);
    usleep(recv*100000);
  }
}
//------------------------------------------------------------------------
int
main(int argc, char **argv){
  MPI_Init(&argc, &argv);
  int rank;
  int procs;
  MPI_Comm_rank(MPI_COMM_WORLD, &rank);
  MPI_Comm_size(MPI_COMM_WORLD, &procs);
  if(rank==0){
    manager(procs);
  }else{
    worker(rank);
  }
  MPI_Finalize();
}
//------------------------------------------------------------------------
```

## 実行結果

上記のプログラムでは、タスク総数は7つ、そのうち一つだけ、他の3倍の重さがある。これを4プロセスで実行すると、ワーカーは3プロセス。そのうち1プロセスが重さ3の仕事を一つ、残り2プロセスが重さ1の仕事を3つやることでロードバランスが取れる。以下が実行結果。

```shell-session
$ mpicxx main.cc -o a.out
$ mpiexec -np 4 ./a.out  | sort 
1: Recieved 1
1: Recieved 1
1: Recieved 1
2: Recieved 3
3: Recieved 1
3: Recieved 1
3: Recieved 1
Finish OK: 1
Finish OK: 2
Finish OK: 3
```

ランク2が重い仕事を一つやっている間、ランク1とランク3が軽い仕事を3つずつこなしており、予想通りの動作となっている。実行するたびに、重い仕事を引き受けるランクが変わる。

## まとめ

MPIを使っていんちきクライアント・サーバっぽいプログラムを作った。MPI_Iprobeを使うことで、通信準備完了しているプロセスをポーリングで調べ、通信準備ができているプロセスに仕事を渡す。これにより、タスクの重さにばらつきが大きい場合の自明並列を効率良く実行できる、かもしれない。なお、非同期通信は実装に依存するところが多く、環境によってはうまく動かないかもしれない。

また、ルートプロセスでポーリングしている時、あまり高速に何度もポーリングするのが怖かったのでウェイトが入っているが、実装によっては必要ないかもしれない。いずれにぜよ、動作は保証しないので、やる場合は自己責任で。
