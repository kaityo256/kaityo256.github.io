---
layout: post
title: "OpenMPのスケジューリングの確認"
tags: [programming, hpc, qiita]
permalink: openmp_schedule
---

# OpenMPのスケジューリングの確認

## はじめに

OpenMPのスケジューリングアルゴリズムにはstatic、dynamic、guidedなどがあるが、そのうちstaticとdynamicの動作を確認してみる。

## セットアップ

手元のマシンは4コア2ソケットのXeonが乗ったMac Pro。ハイパースレッド無しなので、普通にやると8スレッド立つ。使うコンパイラはg++ (MacPorts gcc49 4.9.3_0) 4.9.3。こいつに1つだけ重い処理がまざったタスクを渡す。タスクの重さはusleepでシミュレートする(だから石の動作周波数とか無関係)。ソースはこんな感じ。

```c++
#include <stdio.h>
#include <algorithm>
#include <unistd.h>
#include <omp.h>

const int N = 43;
useconds_t data[N];

int
main(void){
  std::fill_n(data,N,500000); 
  data[0] = 3000000;
#pragma omp parallel for schedule(static)
  for(int i=0;i<N;i++){
    const int id = omp_get_thread_num();
    printf("%d: sleep %d\n",id,data[i]);
    usleep(data[i]);
  }
}
```

43個のタスクがあり、ほとんど0.5秒で終わるのだが、一個だけ3秒かかる奴がある。これを8スレッドで分担するのだが、普通にタスクの数で等分割してしまうと、一つのスレッドが3秒のタスク一つと0.5秒のタスク5個が降ってきて、5.5秒かかる。残りのスレッドは0.5秒のタスクが5〜6個なので、2.5〜3秒。なので2.5秒くらい遊んでしまう。

うまくタスク分割できれば、一人が3秒のタスク一つ片付けているうちに、残りの7スレッドが0.5秒のタスクを6つ片付けて、全体が3秒で終わるはず。

## 実行結果

## static

```shell-session
$ g++ -fopenmp test.cc
$ time ./a.out | sort 
0: sleep 3000000
0: sleep 500000
0: sleep 500000
0: sleep 500000
0: sleep 500000
0: sleep 500000
(snip)
./a.out  0.00s user 0.00s system 0% cpu 5.515 total

```
確かに0番のスレッドが、3秒のタスク1個と0.5秒のタスク5個来て、全体で5.5秒かかっている。

## dynamic

```shell-session
$ time ./a.out |sort
0: sleep 500000
0: sleep 500000
0: sleep 500000
0: sleep 500000
0: sleep 500000
0: sleep 500000
1: sleep 3000000
2: sleep 500000
2: sleep 500000
2: sleep 500000
2: sleep 500000
2: sleep 500000
2: sleep 500000
(snip)
./a.out  0.00s user 0.00s system 0% cpu 3.025 total
```
1番に3秒のタスクが割り当てられたが、1番の仕事はそれだけ。残りの7スレッドで0.5秒のタスクを6つずつ片付けたので、全体としても3秒で終わった。

## まとめ

OpenMPのスケジューリングのデフォルトは多分staticだが、タスクごとに重さがばらついており、しかもその重さが事前に推定できない場合、スケジューリングをdynamicにするとロードバランスが取れて良いかも。ちなみにこのコード＆環境ではスケジューリングをguidedにしても結果はstaticと同じになった。
