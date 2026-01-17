---
layout: post
title: "Swendsen-Wangアルゴリズムのサンプルコード"
tags: [programming, qiita]
permalink: swendsen_wang
---

# Swendsen-Wangアルゴリズムのサンプルコード


## はじめに

スピン系をモンテカルロシミュレーションする際に広く使われる[Swendsen–Wangアルゴリズム](https://ja.wikipedia.org/wiki/%E3%82%B9%E3%83%B4%E3%82%A7%E3%83%B3%E3%82%BB%E3%83%B3%E3%83%BB%E3%83%AF%E3%83%B3%E3%81%AE%E3%82%A2%E3%83%AB%E3%82%B4%E3%83%AA%E3%82%BA%E3%83%A0)を、イジングモデルに適用するサンプルコードの解説。

コードは
https://github.com/kaityo256/mc/tree/master/ising_sw
においてあります。


## 原理

## Single-spin-flip

イジングモデル(Ising Model)を考えます。スピンには通し番号$i$がついており、それを$\sigma_i$で表現します。スピンが取れる値は1か-1のいずれかです。この系のハミルトニアンを以下のように書きます。

$$
H(\\{ \sigma_i \\}) = -J \sum_{i,j} \sigma_i \sigma_j
$$

ここで$J (>0)$は相互作用エネルギーで、和は隣り合うスピン同士について取ります[^1]。

さて、この系の分配関数は以下のように書けます。

$$
Z = \sum_{\\{ \sigma_i \\}} \exp\left(K \sum_{i,j} \sigma_i \sigma_j \right)
$$

ここで$K=J/k_B T$です。この分配関数を直接計算するのは難しいのでモンテカルロ法でサンプリングすることを考えます。この時、特定のスピン状態$ \\{ \sigma_i \\}$が、ボルツマン重み

$$
w(\\{\sigma_i \\}) = \exp\left(K \sum_{i,j}  \sigma_i \sigma_j \right)
$$

で選ばれるように状態を遷移させなければなりません。ここで、あるスピンをひっくり返す試行を考えます。そのスピン以外の全てのスピンは固定し、注目するスピンが更新された場合とされなかった場合のボルツマン重みを計算し、詳細釣り合いが成り立つような確率で状態を更新するのがSingle-Spin-Flipのマルコフ連鎖モンテカルロ法(Markov-Chain Monte Calro Method)です。

さて、もしこのスピンがひっくり返った場合、そのスピンと相互作用するスピンの重みが変わります。従って、そのスピンの状態を更新するまで隣接するスピンの更新ができません[^2]。

そこで、何かうまいことをやってスピンを相互作用しない独立なグループにわけ、そのグループごとに一気に更新してしまおう、というのがSwendsen-Wangアルゴリズムです。

## Fortuin-Kasteleyn表現

分配関数を変形します。まず、相互作用する2つのスピンに対応するボルツマン重みを書き換えます。

$$
\begin{aligned}
\exp (\beta \sigma_i \sigma_j) &= \mathrm{e}^{-\beta} + \delta_{\sigma_i, \sigma_j} \left( \mathrm{e}^{\beta} - \mathrm{e}^{-\beta}  \right)   \\
&=  \mathrm{e}^{\beta} \left[\mathrm{e}^{-2\beta}  +  \delta_{\sigma_i, \sigma_j}(1 - \mathrm{e}^{-2\beta}) \right] \\
&= \mathrm{e}^{\beta} \left[(1-p) +  p \delta_{\sigma_i, \sigma_j} \right]
\end{aligned}
$$

ただし$p=1 - e^{-2K}$です。さらに、スピンiとjの間のボンドに住むボンド変数$b_{ij}$を導入します。これは0か1の値を取ります。クロネッカーのデルタに関する恒等式

$$
x + y = \sum_b^{0,1} x \delta_{b,0} + y \delta_{b,1}
$$

を使って書き直すと、


$$
\exp (K \sigma_i \sigma_j) = \sum_{b_{ij}}
e^{K}
\left[
(1-p) \delta_{b_{ij},0} +  p \delta_{\sigma_i, \sigma_j} \delta_{b_{ij},1}
\right]
$$

となります。これを使うと分配関数は

$$
Z = \sum_{\\{\sigma_i\\}} \sum_{\\{b_{ij} \\}}
\prod_{i,j}
e^{K}
\left[(1-p) \delta_{b_{ij},0} +  p \delta_{\sigma_i, \sigma_j} \delta_{b_{ij},1}
\right]
$$

のように書けます。これをFortuin-Kasteleyn表現と呼びます[^3]。

## Swendseng-Wangアルゴリズム

さて、先程の分配関数は、元の分配関数を等価変形して得られたものなのでもちろん同じものなのですが、意味が変わって見えます。まず、新たにボンド自由度$b_{ij}$というものが導入されています。これは全てのボンドについて$0$と$1$の和を取ると、元の分配関数に戻りますが、これをスピンのような自由度だと思って、これらもモンテカルロ法で更新することにしましょう。以下、$b_{ij}=1$の時をactiveなボンド、そうでない場合をinactiveなボンドと呼びます。

まずスピン状態を固定し、その状態でボンド変数を更新することを考えます。あるボンド変数$b_{ij}$に関する重みは以下の通りです。

$$
S_{ij} = e^K \left[
(1-p) \delta_{b_{ij},0} +  p \delta_{\sigma_i, \sigma_j}  \delta_{b_{ij},1}
\right]
$$

両端のスピンが揃っていない場合は$\delta_{\sigma_i, \sigma_j} =0$、

$$
S_{ij} = e^K \left[
(1-p) \delta_{b_{ij},0} 
\right]
$$

となり、$b_{ij} = 0$、すなわちinactiveな場合にしか重みを持ちません。

両端のスピンが揃っている場合には$\delta_{\sigma_i, \sigma_j} =1$なので、

$$
S_{ij} = e^K \left[
(1-p) \delta_{b_{ij},0} +  p \delta_{b_{ij},1}
\right]
$$

となり、ボンドがactiveである重みが$p$、inactiveである重みが$1-p$に比例することを意味します。つまり、スピンを固定している時、

1. ボンドの両端のスピンが異なる向きである場合には必ずinactive
2. ボンドの両端のスピンが揃っている場合には確率$p$でactiveに、$1-p$でinactive

とアップデートすれば良いことがわかります。ここで、ボンドの重みは両端のスピンのみに依存するため、スピンを固定している場合、全てのボンドの状態を独立に更新することができます。

次に、ボンド状態を固定して、スピンを更新することを考えます。ボンド$ij$に関する重みは以下のように書けるのでした。

$$
S_{ij} = e^K \left[
(1-p) \delta_{b_{ij},0} +  p \delta_{\sigma_i, \sigma_j}  \delta_{b_{ij},1}
\right]
$$

ここで、ボンド変数$b_{ij}$がinactiveの場合、重みは

$$
S_{ij} = e^K (1-p)
$$

となり、スピン変数が含まれなくなります。これはボンドが切れているスピン同士は相互作用していないとみなすことができます。activeなボンドの両端にあるスピンのどちらか一方をひっくり返すと重みが変わってしまいますが、activeなボンドにつながっている全てのスピンを一度にひっくり返してもボルツマン重みは変わりません。この事実を利用して、以下のSwendseng-Wangアルゴリズムを構築できます。

1. (ボンドの更新)隣り合うスピンが同じ向きである場合、そのボンドを確率$p = 1 - e^{-2K}$でactiveに、$1-p$でinactiveにする
2. (クラスタリング) activeなボンドでつながったスピンを同じクラスターに属すとしてクラスタリングする
3. (スピン状態の更新) それぞれのクラスタに属すスピンごとに独立して、ランダムに新たなスピン状態を与える。イジングモデルであれば、確率1/2で上向きか下向きかを与える。

activeなボンドで繋がったスピンたちを、独立に、かつ一度にまとめてひっくり返すことができるため、緩和が非常に早くなります[^kanwa]。

なお、実際のコードではボンド状態は保存せず、単に隣り合うスピンの向きがそろっていれば確率$p=1-e^{-2K}$でつなぐ、ということをします。やっていることは全てのボンド状態をランダムに作ってからスピンをつなぐ操作と等価です。

まとめると、Swendsen-Wangは

1. 分配関数を書き直して、ボンドという新たな自由度を導入
2. ボンド変数とスピン変数を交互に更新する
3. スピン変数が固定されていると、ボンド変数は全て独立に更新できる
4. ボンド変数が固定されていると、activeなボンドでつながっていないスピン変数は独立に更新できる

ということを利用して、更新を加速する方法です。

## 実装

では実際にSwendsen-Wangを実装してみましょう。

スピンをつなぐ操作(Union)と、スピンがどのクラスタに属しているか調べる操作(Find)については、[Union-Find木のサンプルコード](http://qiita.com/kaityo256/items/5a3b03ff465778c23f6a)を参照してください。

C++で書くと、Union-Find木の配列を`cluster`として、Findは

```cpp
int
get_cluster_number(int index) {
  int i = index;
  while (i != cluster[i]) {
    i = cluster[i];
  }
  return i;
}
```

と書けます。スピンを繋ぐ場合、

* スピンが異なる向きである場合には繋がない
* スピンが同じ向きの場合には確率$p$でつなぐ

という処理をするので、座標(ix1, iy1)と(ix2, iy2)にあるスピンをつなぐUnion処理は

```cpp
void
connect_bond(int ix1, int iy1, int ix2, int iy2, const double p) {
  if (ix2 == L)ix2 = 0;
  if (iy2 == L)iy2 = 0;
  if (spin[ix1 + iy1 * L] * spin[ix2 + iy2 * L] < 0)return;
  if (ud(mt) >= p)return;
  const int i1 = ix1 + iy1 * L;
  const int i2 = ix2 + iy2 * L;
  const int c1 = get_cluster_number(i1);
  const int c2 = get_cluster_number(i2);
  if (c1 < c2) {
    cluster[c2] = c1;
  } else {
    cluster[c1] = c2;
  }
}
```

と書けるでしょう。ついでに周期境界条件補正もやっています。

この二つ関数を使えば、スピンをつなぐ処理(ボンドの更新)はこのように書けます。

```cpp
  const double p = 1.0 - exp(-2.0 * beta);
  for (int ix = 0; ix < L; ix++) {
    for (int iy = 0; iy < L; iy++) {
      connect_bond(ix, iy, ix + 1, iy, p );
      connect_bond(ix, iy, ix, iy + 1, p );
    }
  }
```


いま、$J=1$としているので、$K=\beta$です。なのでボンドをつなぐ確率は$p=1 - e^{-2\beta}$となります。

さて、クラスタリングが終了したら、全てのスピンを「クラスタ毎」に独立にひっくり返す必要があります。これは、クラスタリング前に全てのクラスタ番号に対して新しいスピン状態の候補をランダムに作っておき、クラスタリング後に、スピンが所属するクラスタ番号から新しいスピン状態を参照して更新すれば、同じクラスタに所属するスピンの新しい状態は必ず同じとなり、クラスタごとにひっくり返したことになります。

その、クラスタ番号に対する新しいスピン状態候補を`flip`という配列で用意しておきましょう。以上の操作をまとめると、クラスターフリップ処理はこのように書けます。

```cpp
void
cluster_flip(double beta) {
  for (int i = 0; i < N; i++) {
    cluster[i] = i; //Union-Find木の初期化
    flip[i] = static_cast<int>(ud(mt) * 2.0) * 2 - 1; //新スピン状態候補
  }
  //クラスタリング
  const double p = 1.0 - exp(-2.0 * beta);
  for (int ix = 0; ix < L; ix++) {
    for (int iy = 0; iy < L; iy++) {
      connect_bond(ix, iy, ix + 1, iy, p );
      connect_bond(ix, iy, ix, iy + 1, p );
    }
  }
  //クラスター毎にスピン状態を更新
  for (int i=0;i < N;i++){
    const int c = get_cluster_number(i);
    spin[i] = flip[c];
  }
}
```

最初にUnion-Find木(`cluster`)の初期化と新スピン状態候補(`flip`)の作成をして、全てのスピンをクラスタリングした後に、クラスター毎にスピンを更新しています。

## まとめ

Swendseng-WangアルゴリズムのUnion-Find木を使った実装を紹介しました。使ってみるとわかりますが、Single-Spin-Flipアルゴリズムに比べてSwendseng-Wangアルゴリズムは極めて強力です。緩和速度が全然違います。分配関数の書き直し(Fortuin-Kasteleyn表現)を理解すれば、IsingからPotts模型などに適用するのも難しく無いでしょう。また、古典XYや古典ハイゼンベルクスピンといった連続スピン系についても、射影軸を使ってIsing化することでSwendseng-Wangアルゴリズムの適用が可能です(Wolffの方法)[^wolff]。

また、Fortuin-Kasteleyn表現が得られている場合、より良い(分散が小さい)物理量の推定法が知られています。詳細については「Improved Estimator」で調べてください。

なお、ここで紹介したコードは可読性重視のため、速度面はかなり妥協しています。周期境界条件処理、Union-Find木の経路圧縮やランクを用いたUnion処理等、高速化の余地は相当あるので、実用に利用する場合には考慮してみてください。このコードが、実際に使うコードのリファレンスコードとして使われたり、実装の理解の助けになれば幸いです。

## 参考文献

* [R. H. Swendsen, J.-S. Wang, “Nonuniversal critical dynamics in Monte Carlo simulations”. Phys. Rev. Lett. vol. 58,  pp. 86–88.](http://dx.doi.org/10.1103%2FPhysRevLett.58.86)
* [C.M.Fortuin, P.W.Kasteleyn, "On the random-cluster model: I. Introduction and relation to other models", Physica, vol. 57, pp 536 (1972).](https://doi.org/10.1016/0031-8914(72)90045-6)
* [U. Wolff, "Collective Monte Carlo Updating for Spin Systems", Phys. Rev. Lett. vol. 62, pp. 361 (1989)](https://doi.org/10.1103/PhysRevLett.62.361)

[^wolff]: 実はWolffの方法というのは二つの内容を含んでいます。一つは連続スピン系を射影によってイジング化する方法。もう一つは、全てのスピンを一度に更新するのではなく、ランダムなスピンを選んで、そこからクラスターをつなげていって、そのクラスターだけひっくり返すというアルゴリズムです。Swendseng-Wangは熱浴法、Wolffの方法はメトロポリス法に対応し、Wolffの方法の方が効率が良いことがわかっています。

[^kanwa]: といいつつ、筆者はなぜSwendseng-Wangがスピンの緩和を加速するか(所謂critical slowing downを回避できるか)を完全には理解できていません・・・

[^3]: より正確には、後述するinactiveなボンドで切り分けたグラフ表現で書き直したものをこう呼びます。


[^2]: ここで正方格子なら副格子にわけて副格子ごとにスピンを更新・・・とかいう方法もありますが、とりあえずそれはさておき話を進めます。

[^1]: もっとちゃんと説明しようかと思ったけど、どうせこの記事読む人にはイジングモデルとか分配関数とかの説明はいらん気がしてきたので、以下説明を端折ります。
