---
layout: post
title: "モンテカルロ法における境界条件の扱いについて"
tags: [programming, physics, qiita]
permalink: mc_bounday
---

# モンテカルロ法における境界条件の扱いについて

## はじめに

古典スピン系では、もしクラスターアルゴリズムが使えるならその方が良いが、フラストレート系などではうまく使えない。その場合はメトロポリス法などのSingle Spin Flip Algorithmを使うことになる。この時、周期境界条件をどうやって補正すれば良いかずっと気になっていたので調べてみた。

コードは以下に置いておく。

https://github.com/kaityo256/mc/tree/master/pbc_test

## 問題意識

例えば正方格子上の、強磁性イジング模型を考えよう。普通にメトロポリス法でアップデートするとこんな感じのコードになると思う。

```cpp
  for (int i = 0; i < N; i++) {
    int ns = 0;
    ns += spin[i + 1];
    ns += spin[i - 1];
    ns += spin[i + L];
    ns += spin[i - L];
    ns *= spin[i];
    if (ns < 0 || exp(-2.0 * ns * beta) > ud(mt)) {
      spin[i] = -spin[i];
    }
  }
```

上記のコードは境界をちゃんと扱っていないため、このままでは変なところを触ってしまう。

で、周期境界条件を貸すなら、こんな感じに補正しなければならない。

```cpp
  if (ix < 0) ix += L;
  if (ix >= L) ix -= L;
  if (iy < 0) iy += L;
  if (iy >= L) iy -= L;
```

で、全スピンについて周期境界条件補正をするとこんな感じのコードになる。

```cpp
int pos2index_if(int ix, int iy) {
  if (ix < 0) ix += L;
  if (ix >= L) ix -= L;
  if (iy < 0) iy += L;
  if (iy >= L) iy -= L;
  return ix + iy * L;
}

void single_flip_calc_if(double beta) {
  for (int i = 0; i < N; i++) {
    int ix = i % L;
    int iy = i / L;
    int ns = 0;
    ns += spin[pos2index_if(ix + 1, iy)];
    ns += spin[pos2index_if(ix - 1, iy)];
    ns += spin[pos2index_if(ix, iy + 1)];
    ns += spin[pos2index_if(ix, iy - 1)];
    ns *= spin[i];
    if (ns < 0 || exp(-2.0 * ns * beta) > ud(mt)) {
      spin[i] = -spin[i];
    }
  }
}
```

で、これ見ると「遅そうだな」と思えてくる。なのでここからコードを工夫するのだが、どの工夫がどれくらい効果的なのかいつも気になっていた。なので、一度真面目にコードの高速化の効果をまとめておこうと思う。

以下、このコードを`calc+if`と呼び、ベースラインとする。64x64の正方格子上で、全てのスピンを一回ずつ更新したら1モンテカルロステップ(MCs)とし、イジング模型の臨界点直上で100000 MCs計算するのにかかった時間を計る。計算はLinux+Xeonで行った(詳細は一番下に)。で、ベースラインの計算時間は16151 [msec]だった。ここから高速化してみよう。

## 高速化

## `calc + mod`

まず思うのは、if文が遅いんじゃないか、ということだ。これをmodによる計算に置き換えてみよう。こんな感じになる。

```cpp
int pos2index_mod(int ix, int iy) {
  ix = (ix + L) % L;
  iy = (iy + L) % L;
  return ix + iy * L;
}

void single_flip_calc_mod(double beta) {
  for (int i = 0; i < N; i++) {
    int ix = i % L;
    int iy = i / L;
    int ns = 0;
    ns += spin[pos2index_mod(ix + 1, iy)];
    ns += spin[pos2index_mod(ix - 1, iy)];
    ns += spin[pos2index_mod(ix, iy + 1)];
    ns += spin[pos2index_mod(ix, iy - 1)];
    ns *= spin[i];
    if (ns < 0 || exp(-2.0 * ns * beta) > ud(mt)) {
      spin[i] = -spin[i];
    }
  }
}
```

計算時間は 16064 [msec]となり、思ったより早くならなかった。

## `table + mod`

現在、毎回指数関数の計算をしているが、イジング模型で出現する可能性のあるエネルギー差は数種類しかないので、これをテーブルに入れてしまおう。

```cpp
void make_table(double beta) {
  for (int i = 0; i < 5; i++) {
    int ns = (i - 2) * 4;
    e_table[i] = exp(-ns * beta);
  }
}

```cpp
void single_flip_table_mod(double beta) {
  for (int i = 0; i < N; i++) {
    int ix = i % L;
    int iy = i / L;
    int ns = 0;
    ns += spin[pos2index_mod(ix + 1, iy)];
    ns += spin[pos2index_mod(ix - 1, iy)];
    ns += spin[pos2index_mod(ix, iy + 1)];
    ns += spin[pos2index_mod(ix, iy - 1)];
    ns *= spin[i];
    if (ns < 0 || e_table[ns / 2 + 2] > ud(mt)) {
      spin[i] = -spin[i];
    }
  }
}
```

こうすると 7488 [msec]となり、倍近く早くなった。

## `tableonly + mod`

メトロポリス法では、まわりのスピンの和(局所磁場)との内積`ns`が負の場合、ひっくり返ったほうがエネルギーが下がるので必ずひっくり返し、エネルギーが増える向きには確率的にひっくり返す。

ここで、`ns < 0`の時には、`exp(-2.0 * ns * beta)`は常に1より大きい。そこで、`if`文の中身を

```cpp
    if (ns < 0 || exp(-2.0 * ns * beta) > ud(mt)) {
```

から

```cpp
    if (e_table[ns / 2 + 2] > ud(mt)) {
```

と簡略化することができる。条件分岐が簡単になるので少し早くなるかと思ったのだが、結果は8009 [msec]と若干遅くなってしまった。

## `table + list`

毎回隣接するスピンを計算で得るのではなく、最初に隣接リストを作ってみよう。

```cpp
std::vector<std::array<int, 4>> neighbor(N);

void init_neighbors() {
  for (int i = 0; i < N; i++) {
    int ix = i % L;
    int iy = i / L;
    neighbor[i][0] = pos2index_mod(ix + 1, iy);
    neighbor[i][1] = pos2index_mod(ix - 1, iy);
    neighbor[i][2] = pos2index_mod(ix, iy + 1);
    neighbor[i][3] = pos2index_mod(ix, iy - 1);
  }
}
```

隣接リストを使うと、スピンの更新はこんな感じに書ける。

```cpp
void single_flip_table_list(double beta) {
  for (int i = 0; i < N; i++) {
    int ns = 0;
    ns += spin[neighbor[i][0]];
    ns += spin[neighbor[i][1]];
    ns += spin[neighbor[i][2]];
    ns += spin[neighbor[i][3]];
    ns *= spin[i];
    if (ns < 0 || e_table[ns / 2 + 2] > ud(mt)) {
      spin[i] = -spin[i];
    }
  }
}
```

結果は 6815 [msec]となり、若干早くなった。

## `bulk + border`

さて、これが本命である。境界条件補正は端にあるスピンのみに必要であり、バルク、つまり 1 < x < L-1 かつ 1 < y < L-1であるようなスピンに補正は不要である。

したがって、バルクにあるスピンと、端(border)にあるスピンに分けてループをまわすと、不必要な境界補正コードが減る分、早くなることが期待される。というわけでバルクは補正なし、端は隣接リストを使って更新してみる。コードはかなり長くなる。

```cpp
void single_flip_bulk(double beta) {

  // Bulk
  for (int iy = 1; iy < L - 1; iy++) {
    for (int ix = 1; ix < L - 1; ix++) {
      int i = ix + iy * L;
      int ns = 0;
      ns += spin[i + 1];
      ns += spin[i - 1];
      ns += spin[i + L];
      ns += spin[i - L];
      ns *= spin[i];
      if (ns < 0 || e_table[ns / 2 + 2] > ud(mt)) {
        spin[i] = -spin[i];
      }
    }
  }

  // site_i = (j, 0)
  for (int j = 0; j < L; j++) {
    int i = j;
    int ns = 0;
    ns += spin[neighbor[i][0]];
    ns += spin[neighbor[i][1]];
    ns += spin[neighbor[i][2]];
    ns += spin[neighbor[i][3]];
    ns *= spin[i];
    if (ns < 0 || e_table[ns / 2 + 2] > ud(mt)) {
      spin[i] = -spin[i];
    }
  }

  // site_i = (j, L-1)
  for (int j = 0; j < L; j++) {
    int i = j + (L - 1) * L;
    int ns = 0;
    ns += spin[neighbor[i][0]];
    ns += spin[neighbor[i][1]];
    ns += spin[neighbor[i][2]];
    ns += spin[neighbor[i][3]];
    ns *= spin[i];
    if (ns < 0 || e_table[ns / 2 + 2] > ud(mt)) {
      spin[i] = -spin[i];
    }
  }
  // site_i = (0, j)
  for (int j = 1; j < L - 1; j++) {
    int i = j * L;
    int ns = 0;
    ns += spin[neighbor[i][0]];
    ns += spin[neighbor[i][1]];
    ns += spin[neighbor[i][2]];
    ns += spin[neighbor[i][3]];
    ns *= spin[i];
    if (ns < 0 || e_table[ns / 2 + 2] > ud(mt)) {
      spin[i] = -spin[i];
    }
  }

  // site_i = (L-1, j)
  for (int j = 1; j < L - 1; j++) {
    int i = L - 1 + j * L;
    int ns = 0;
    ns += spin[neighbor[i][0]];
    ns += spin[neighbor[i][1]];
    ns += spin[neighbor[i][2]];
    ns += spin[neighbor[i][3]];
    ns *= spin[i];
    if (ns < 0 || e_table[ns / 2 + 2] > ud(mt)) {
      spin[i] = -spin[i];
    }
  }
}
```

結果は 6595 [msec]となり、わずかではあるが最も早かった。

## 結果のまとめ

上記の結果も含め、いくつかの環境、コンパイラで行ったベンチマークの結果を貼っておく。

それぞれ名前、自発磁化、経過時間である。

## Linux + GCC

* g++ (GCC) 7.2.0
* Intel(R) Xeon(R) Gold 6148 CPU @ 2.40GHz
* `-O3 -std=c++11 -march=native`
* Red Hat Enterprise Linux Server release 7.4 (Maipo)

```txt
calc      + if  	0.3537	16151[msec]
calc      + mod 	0.3537	16064[msec]
table     + mod 	0.3537	7488[msec]
tableonly + mod 	0.2853	8009[msec]
table     + list	0.3537	6815[msec]
bulk + border   	0.5839	6595[msec]
```

## Linux + Intel Compiler

* icpc (ICC) 18.0.5 20180823
* Intel(R) Xeon(R) Gold 6148 CPU @ 2.40GHz
* `-O3 -std=c++11 -xHOST`
* Red Hat Enterprise Linux Server release 7.4 (Maipo)

```txt
calc      + if  	0.3537	33342[msec]
calc      + mod 	0.3537	32431[msec]
table     + mod 	0.3537	6152[msec]
tableonly + mod 	0.2853	6458[msec]
table     + list	0.3537	30158[msec]
bulk + border   	0.5839	29927[msec]
```

## Mac + Clang

* Apple clang version 11.0.0 (clang-1100.0.33.8)
* Intel Core i5 3.3 GHz
* macOS Mojave 10.14.6
* `-O3 -std=c++11 -march=native`

```txt
calc      + if  	0.3537	8778[msec]
calc      + mod 	0.3537	7553[msec]
table     + mod 	0.3537	5622[msec]
tableonly + mod 	0.2853	5980[msec]
table     + list	0.3537	5574[msec]
bulk + border   	0.5839	5398[msec]
```

## まとめ

周期境界条件補正について、隣接リストを使うのと、バルクと端で分けてループでまわすのとどっちがどれくらい早いか確認した。大昔、おそらくAlpha 21164だったと思うが、隣接リストを使った間接アクセスがかなり遅く、またmod演算もまぁまぁ遅かったので、バルクと端で分けたループを書くのがデフォルトだった記憶があった。しかし時は流れ、x86を使うようになると、間接アクセスやmodが早いので、ループを分けると早くはなるが、コードが複雑にするコストをかけるだけのメリットは得られない。

個人的に以外だったのは、mod演算より隣接リストを使った間接アクセスの方が早かったこと。しかし、インテルコンパイラを使うとなぜか間接アクセスが相当遅くなる。このあたり、アセンブリ見ていないので何が起きてるのかはわからない。まぁ、x86でGCC/Clang使うなら、「テーブルと隣接リストを使う」のがいまのところベストプラクティスではないかな、と思う。
