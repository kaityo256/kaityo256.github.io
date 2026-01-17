---
layout: post
title: "OpenMPでゆらぎの大きいタスクを分担"
tags: [programming, hpc, qiita]
permalink: openmp_imbalanced
---

# OpenMPでゆらぎの大きいタスクを分担

## はじめに

一連のタスクがある。このタスクは、例えば「ある初期値をもらって、その初期値からある終了条件まで探索する」というもの。初期値によって探索の時間は大きくゆらぎ、かつ実行前にその時間がわからない。こういうタスクを並列処理したい。

以前同様なことを[MPIで実装](http://qiita.com/kaityo256/items/fafae987032f8b0fa778)してみた。それをスレッド並列でやることを考えたい。最初、MPIでの実装をそのままスレッド並列に移植しようとして、pthreadとセマフォでなんとかしようと思ったんだけど、「あれ？OpenMPのスケジューリングに任せればいいんじゃ？」と思って、やってみたらできたので、その覚書。

コードは

https://gist.github.com/kaityo256/210f9abcd3cd7696e2d19ab32ca2aa28

においておく。

## 実装方針

メインスレッドであらかじめタスクリストを作っておき、あとはスレッド並列でそのタスクをばらまく。単にそのタスクを処理する関数を呼んでも良いのだが、将来ややこしいことをするので、探索用のワーカークラスをスレッド数分だけ作っておき、そいつに委ねる。[MPIでの実装](http://qiita.com/kaityo256/items/fafae987032f8b0fa778)では「いまどのプロセスの手が空いているか」をメインプロセスからポーリングで調べていたが、これをコンパイラに任せる。具体的には、forループの中で`omp_get_thread_num()`を呼ぶのだが、これが返す番号=手が開いているスレッド番号のはずなので、それをそのまま使う。

## 実装

## メイン処理

タスクリスト`tasks`があり、その総数が`N`とする。ワーカークラス`Worker`の配列`workers`があって、手が開いている奴のidを使って`workers[id]->work()`みたいに呼びたい。つまり、メイン処理はこんな感じになっていてほしい。

```cpp
#pragma omp parallel for 
  for (int i = 0; i < N; i++) {
    int id = omp_get_thread_num();
    workers[id]->work(tasks[i]);
  }
```

その為には、まずワーカークラスをスレッド数分だけ作っておかないといけない。まず

```cpp
  int nthreads = 0;
  #pragma omp parallel
  {
    nthreads = omp_get_num_threads();
  }
```

とやって、スレッド数を取得する。そして、スレッド数分だけワーカーを作るために、ワーカーのvectorを作っておく。とりあえずスマートポインタのvectorにするのがいいんですかね。

```cpp
  std::vector <std::unique_ptr<Worker> > workers(nthreads);
  #pragma omp parallel for
  for (int i = 0; i < nthreads; i++) {
    workers[i].reset(new Worker(i));
  }
```

タスクは単純に整数の配列にして、その数字(ミリ秒)だけ処理に時間がかかるものとしよう。とりあえず0から1000までの一様乱数にするが、タスクのロードインバランスを表現するため、10%の確率でタスクの重さを3倍にしてみる。

```cpp
  std::mt19937 mt;
  std::uniform_int_distribution<int> ud(0, 1000);
  std::vector<int> tasks;
  const int N = 20;
  for (int i = 0; i < N; i++) {
    int task = ud(mt);
    if (task > 900) {
      task *= 3;
    }
    tasks.push_back(task);
  }
```

あと、最後に「理想的にタスクが分散できた場合にどれくらいの時間で終わるべきか」も表示しておきたい。こんな感じかな。

```cpp
  auto end = std::chrono::system_clock::now();
  int sum = std::accumulate(tasks.begin(), tasks.end(), 0);
  double ideal_task = static_cast<double>(sum) / static_cast<double>(nthreads);
  auto diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
  printf("Total Tasks: %d\n", sum);
  printf("Ideal Tasks per thread: %d\n", static_cast<int>(ideal_task));
  printf("Elapsed time [ms]: %d\n", diff);
  printf("------------\n");
```

## ワーカーの実装

実装っていってもいろんな重さのタスクを受け取って処理するルーチンのエミュレートに過ぎないからアレだけど、とりあえずコンストラクタでidを受け取って、`Worker::work`がタスクを実行する処理(単に受け取った時間だけsleepするだけ）という感じ。後、終わった時に自分がどれくらいのタスクを実行したのかのレポート機能もつけておく[^printf]。

[^printf]: どうでもいいけど、プロセス並列でもスレッド並列でもなんでも、並列コード書いてると`std::cout`より`printf`の方が便利だったりしません？ `std::cout`だと`<<`のところで処理が割り込まれるからデバッグ用の表示が乱れちゃうんだよね。いちいち`stringstream`に書いて・・・とかやるくらいなら、と`printf`使っちゃう・・・。

```cpp
class Worker {
private:
  std::vector<double> mytask;
  const int id;
public:
  Worker(int i) : id(i) {}
  void work(int task) {
    mytask.push_back(task);
    printf("%d: %d\n", id, task);
    auto start = std::chrono::system_clock::now();
    while (true) {
      auto end = std::chrono::system_clock::now();
      auto diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
      if (diff > task)break;
    }
  }
  void show_summary(void) {
    int sum = std::accumulate(mytask.begin(), mytask.end(), 0);
    printf("%d: total num = %d, total tasks = %d\n", id, mytask.size(), sum);
  }
};
```

メイン処理が終わったあたりに、レポートを表示させよう。

```cpp
  printf("------------\n");
  for (int i = 0; i < nthreads; i++) {
    workers[i]->show_summary();
  }
```

## 実行結果

まずはシングルスレッド実行。

```shell-session
$ OMP_NUM_THREADS=1 ./a.out
(snip)
------------
0: total num = 20, total tasks = 27740
------------
Total Tasks: 27740
Ideal Tasks per thread: 27740
Elapsed time [ms]: 27760
------------
```

全部で20個のタスクがあり、その総量は「27740」で、それを「27760」の時間で実行したよ、ということ。

次はデフォルトのスケジューリングで4スレッド並列。

```shell-session
$ OMP_NUM_THREADS=4 ./a.out 
(snip)
------------
0: total num = 5, total tasks = 4630
1: total num = 5, total tasks = 6810
2: total num = 5, total tasks = 1657
3: total num = 5, total tasks = 14643
------------
Total Tasks: 27740
Ideal Tasks per thread: 6935
Elapsed time [ms]: 14648
------------
```

20個のタスクを5つずつ4つに分割しているので、おそらく`schedule(static)`が適用されているんだと思う[^schedule]。
理想的には6935ミリ秒で終わってほしいが、実際には14648ミリ秒かかっている。

[^schedule]: 僕が[OpenMPの仕様](http://www.openmp.org/wp-content/uploads/OpenMP30spec-ja.pdf)を読んで理解した限りにおいては、`schedule`を指定しない場合は内部制御変数`def-sched-var`の`schedule kind`を使用するとあるが、`def-sched-var`の値の参照方法はなく、かつその値は実装依存とあるので、デフォルトスケジューリングは実装依存なんだと思う。

次はdynamicスケジューリング。`omp parallel for`に`schedule(dynamic)`を指示する。

```cpp
  #pragma omp parallel for schedule(dynamic)
  for (int i = 0; i < N; i++) {
    int id = omp_get_thread_num();
    workers[id]->work(tasks[i]);
  }
```

```shell-session
$ OMP_NUM_THREADS=4 ./a.out 
(snip)
0: total num = 9, total tasks = 8801
1: total num = 4, total tasks = 6043
2: total num = 4, total tasks = 6444
3: total num = 3, total tasks = 6452
------------
Total Tasks: 27740
Ideal Tasks per thread: 6935
Elapsed time [ms]: 8822
------------
```

20個のタスクを[9,4,4,3]個に分割し、理想的に6935ミリ秒で終わってほしいところ、8822秒で終わっている。これは、たまたま最後にスレッド0番が重いタスク(2904)を引いてしまったからで、許容範囲だろう。

## まとめ

スレッド並列によるパラメータ自明並列を実装してみた。パラメータにより実行時間にゆらぎがあるので、「手があいた奴が次の処理を取りに行く」という処理を書かないといけないのかなぁと思い、実際[MPIでそう実装](http://qiita.com/kaityo256/items/fafae987032f8b0fa778)したのだが、スレッド並列でよければOpenMPのスケジューラに任せれば一発だった。

もともとMPIでの実装があったので、フラットMPIで同じことができるんだけど、今回は「各スレッド間で探索のためのハッシュ(メモ)を共有させたい」というニーズがあって、そのためにスレッドで同じことをやらせる必要があった。スレッド並列部分はハッシュを共有し、プロセス並列部分はハッシュを個別に持つハイブリッド実装は、全部ハッシュを個別に持つフラットMPIよりも探索効率が良いと思われるわけでこういうことをしているのだが・・・いつも思うけど、二種類の並列パラダイムを別々に扱うのは面倒くさいなぁ。でもハッシュをプロセス間で共有するためにMPIで同期とってたら流石に遅いだろうし・・・

## 追記

Twitterで「TLSをうまく使えば`Worker`クラスの配列が不要になる」という指摘をうけ、`thread_local`指定を組んでみた。

https://gist.github.com/kaityo256/b369fe31beccee239f922cb0ff5589bd

実行結果は同じ。
