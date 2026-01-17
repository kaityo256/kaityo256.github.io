---
layout: post
title: "Lie-Trotter公式の打切り誤差を調べる"
tags: [programming, machine-learning, qiita]
permalink: lie_trotter_error
---

# Lie-Trotter公式の打切り誤差を調べる

## はじめに

非可換な演算子$X, Y$について、以下のLie-Trotter公式が成り立つ[^name]。



$$
\exp(h(X+Y)) = \left( \exp(hX/n)\exp(hY/n) \right)^n + O\left(\frac{h^2}{n}\right)
$$

ここで$h$はc数で、数値計算では時間刻みとして用いられることが多いので、以下は時間刻みと呼ぶ。$n$が分解数である。この打切り誤差をちゃんと確認してみよう、というのが本稿の趣旨。

ソースは
https://github.com/kaityo256/lie-trotter-sample
においてある。

2017年7月14日追記：
二次の対称分解も試せるようにするため、ソースを少し改変しています。詳細は次の記事[Lie-Trotter公式における二次の対称分解](http://qiita.com/kaityo256/items/1af80746913f1f17006d)を参照してください。

## スクリプトがやってることの解説

適当な$d$次元の正方行列$X$, $Y$を考える。固有値が実となるように対称行列にしておこう。$\exp(h(X+Y))$や$\exp(hX)$、$\exp(hY)$などを厳密に計算し、Lie-Trotter公式を使って誤差を計算する。誤差はフロベニウスノルムを使うことにする。

## 実対称行列を作る

まず、適当な$d$次元の対称行列をランダムに作る。

```py
import numpy as np
import math
from scipy import linalg

d = 2
np.random.seed(1)
x1 = np.random.rand(d,d)
x2 = np.random.rand(d,d)
X = x1.dot(x1.T)
Y = x2.dot(x2.T)
Z = X + Y
```

適当にランダムな行列作って、その転置をとったものとの積を$X$や$Y$にする。こうすれば対称行列になるために固有値が実となる。$X$と$Y$の和を$Z$としておこう。

## 行列指数関数の計算

行列を指定の時間刻み$h$で指数の肩に載せる関数を作る。そのためには、まず対角化する。

$$
X = U_x \Lambda_x U_x^{-1}
$$

対角行列を指数関数の肩に載せるのは簡単なので

$$
\exp(h X) = U_x \exp(h \Lambda_x) U_x^{-1}
$$

と計算することができる。これをPythonで書くとこんな感じ。

```py
def calc_exp(X, h):
    rx, Ux = linalg.eigh(X)
    Ux_inv = linalg.inv(Ux)
    tx = np.diag(np.array([math.exp(h * i) for i in rx]))
    eX = Ux.dot(tx.dot(Ux_inv))
    return eX
```

やってることを説明すると

*  対称行列を食わせるので`linalg.eigh`を呼ぶ
*  リストの内包表記で固有値のベクトルを指数関数の肩に載せる
*  それを`numpy.diag`で行列にする
* $U_x$や$U_x^{-1}$で元に戻す

という感じ。

## 指定の分解数トロッター分解

指定の時間刻みで行列指数関数の計算ができるようになれば後は簡単。例えば時間刻み$h$、分解数$n$の場合、まず$\exp( h X /n)$と$\exp( h Y /n)$を作る。あとはそれを単位行列に$n$回かけてやれば良い。

```py
    eX = calc_exp(X,h/n)
    eY = calc_exp(Y,h/n)
    S = np.diag(np.ones(d))
    eXeY = eX.dot(eY)
    for i in range(n):
        S = S.dot(eXeY)
```

こうしてできた近似行列$S$と、厳密な評価$\exp(h Z)$を比較する。ここではフロベニウスノルムで比較しよう。以上を全部まとめるとこんな感じの関数となる。

```py
def trotter(X,Y,Z,h,n):
    eZ = calc_exp(Z,h)
    eX = calc_exp(X,h/n)
    eY = calc_exp(Y,h/n)
    S = np.diag(np.ones(d))
    eXeY = eX.dot(eY)
    for i in range(n):
        S = S.dot(eXeY)
    return linalg.norm(eZ - S)/linalg.norm(eZ)
```

## 結果

二次元の場合で、$h$や$n$をいろいろ変えて打切り誤差がどうなるかを調べてみよう。

まず、打切り誤差の$h$依存性。$n$を1,2,4とし、それぞれについていろんな$h$の値で打切り誤差を評価する。

![image0.png](/assets/images/lie_trotter_error/image0.png)


$n$の値に依らず誤差の$h$依存性が$(h^2)$であることがわかる。$n$が大きくなると誤差が減るが、これは$1/n$に比例する。$h=1.0$に固定し、様々な$n$について打切り誤差を評価してみる。

![image1.png](/assets/images/lie_trotter_error/image1.png)

確かに誤差が$O(1/n)$となっていることがわかる。

## まとめ

トロッター分解の打切り誤差を評価してみた。これまで$n=1$のケース$\exp(h (A+B)) \sim \exp(hA)\exp(hB)$を「一次の分解」と呼んでいたので、なんとなく誤差も$O(h)$だと思いこんでいたが、$n$の値によらず$O(h^2)$だったことをいまさら知った。

[^name]: この公式の名前について適当なことを言うと怖いおじさん達が来るかもしれない。とりあえず演算子が有界の場合はLie公式、有界でない場合はTrotter公式、これを使って経路積分をするアルゴリズムを鈴木・トロッター分解と言うらしい。筆者は単にトロッター分解と呼んでしまうことが多いが・・・
