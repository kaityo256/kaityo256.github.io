---
layout: post
title: "ヤコビの公式とヤコビアンの性質と一般化リュービルの定理"
tags: [math, physics, qiita]
permalink: jacobi_formula
---

# ヤコビの公式とヤコビアンの性質と一般化リュービルの定理

## はじめに

$A$を時間依存する正方行列とすると、以下の等式が成り立つ。

$$
\frac{d}{dt}\det A = \det A \mathrm{Tr} \left(A^{-1} \frac{d A}{dt} \right)
$$

これは[ヤコビの公式(Jacobi's Formula)](https://en.wikipedia.org/wiki/Jacobi%27s_formula)と呼ばれるものなのだが、個人的にWikipediaの証明が分かりづらく、かつ他に証明も見つからなかった。

以下、ヤコビの公式の証明と、それを使うと証明できる力学系におけるヤコビアンの性質の解説を行う

## ヤコビの公式の証明

まずは$\det A$の時間微分を定義どおりに計算する。

$$
\frac{d}{dt}\det A = \lim_{h\rightarrow 0} \frac{\det A(t+h) - \det A(t)}{h}
$$

ここで、$h$の一次まで考えれば良いから、$A(t+h)$を$h$の一次までテイラー展開する。

$$
\frac{d}{dt}\det A = \lim_{h\rightarrow 0} \frac{\det \left(A + \frac{dA}{d t} h\right) - \det A(t)}{h}
$$

さて、行列の積の行列式は、行列式の積でかける。

$$
\det (XY) = \det X \det Y
$$

したがって、以下の恒等式が成り立つ。

$$
\begin{aligned}
\det X &= \det A A^{-1} X \\
&= \det A \det A^{-1}X
\end{aligned}
$$

この式を使って、先程の式から$\det A$をくくりだす。その分、左から$A^{-1}$をかけることになることに注意すると、

$$
\frac{d}{dt}\det A = \det A \lim_{h\rightarrow 0} \frac{\det \left(I + A^{-1}\frac{dA}{d t} h\right) - \det I }{h}
$$

さて、行列式の性質として以下が成り立つ。

$$
\det(I + h X) = 1 + h \mathrm{Tr} X + O(h^2)
$$

以上から、ヤコビの公式

$$
\frac{d}{dt}\det A = \det A \mathrm{Tr} A^{-1} \frac{dA}{dt}
$$

が証明された。

## ヤコビアンの性質

いま、$\vec{x}=(x_1, x_2, \cdots)$で記述される系を考える。この系の運動方程式が$\dot{\vec{x}} = (\dot{x}_1, \dot{x}_2, \cdots)$で与えられたとすると、この運動方程式に従って時刻$0$から$t$まで系が時間発展したとする。

$$
\vec{x}(0) \xrightarrow{t} \vec{x}(t)
$$

時間発展は決定論的なので、終状態$\vec{x}(t)$は初期状態$\vec{x}(0)$の関数である。したがって、両者の間にヤコビアン$J$を考えることができる。

$$
J \equiv \frac{\partial \vec{x}(t)}{\partial \vec{x}(0)}
$$

さて、ヤコビの公式を使って、上記のヤコビアンが以下の性質を満たすことを証明する。

$$
\frac{d J}{dt} = J \nabla \dot{\vec{x}}
$$

ここで、$\dot{\vec{x}}$は、位相空間の圧縮率(compressibility)である。つまり、ヤコビアンの時間発展は、運動方程式が作る流れ場の発散(divergence)で記述される。

いま、ヤコビ行列を$M$で表す。ただし、

$$
M_{ij} = \frac{\partial x_t^i}{\partial x_0^j}
$$

である。すると、$J = \det M$であるから、ヤコビの公式より、

$$
\frac{d J}{dt} = J \mathrm{Tr} M^{-1} \frac{dM}{dt}
$$

が成り立つ。

さて、$M$はヤコビ行列であったから、逆行列$M^{-1}$は純粋に分子と分母をひっくり返したものになる。成分表示すると、

$$
\left(M^{-1}\right)_{ij} = \frac{\partial x_0^i}{\partial x_t^j}
$$

また、ヤコビ行列の時間依存性は分子にしかないので、

$$
\left(\frac{dM}{dt}\right)_{ij} = \frac{\partial \dot{x}_t^i}{\partial x_0^j}
$$

これを代入すると、

$$
\mathrm{Tr} M^{-1} \frac{dM}{dt} = \sum_{i,j} \frac{\partial x_0^i}{\partial x_t^j}
\frac{\partial \dot{x}_t^j}{\partial x_0^i}
$$

さて、ライプニッツ則により、

$$
\frac{\partial \dot{x}_t^j}{\partial x_0^i} = \sum_k 
\frac{\partial \dot{x}_t^j}{\partial x_t^k}
\frac{\partial x_t^j}{\partial x_0^i}
$$

であるので、これを代入すると

$$
\mathrm{Tr} M^{-1} \frac{dM}{dt} = \sum_{i,j,k} \frac{\partial x_0^i}{\partial x_t^j}
\frac{\partial \dot{x}_t^j}{\partial x_t^k}
\frac{\partial x_t^j}{\partial x_0^i}
$$

さて、上記は $\mathrm{Tr} (M^{-1} X M)$の形をしている。対角和の性質から

$$
\mathrm{Tr} (M^{-1} X M) = \mathrm{Tr} (M M^{-1} X) = \mathrm{Tr} (I X)
$$

したがって添字$i$について和をとると

$$
\begin{aligned}
\mathrm{Tr} M^{-1} \frac{dM}{dt} &= \sum_{j,k} 
\delta_{jk}
\frac{\partial \dot{x}_t^j}{\partial x_t^k}\\
&= \sum_{j} 
\frac{\partial \dot{x}_t^j}{\partial x_t^j}\\
&= \nabla \dot{x}(t)
\end{aligned}
$$

以上から、

$$
\frac{d J}{dt} = J \nabla \dot{\vec{x}}
$$

が証明された。

## 一般化リュービルの定理

さて、先程もとめたヤコビアンの性質を用いて、一般化リュービルの定理を導く。$\dot{\vec{x}} = \kappa(t)$と表現すると、

$$
\frac{d J}{dt} = J \kappa
$$

であるから、これは形式的に積分できて、

$$
J = \exp \int_0^t \kappa dt
$$

$\dot{\omega} = \kappa$という変数を導入すると、

$$
J = \exp \left(\omega(t) - \omega(0)\right)
$$

を得る。さて、もともと

$$
J \equiv \frac{\partial \vec{x}(t)}{\partial \vec{x}(0)}
$$

であったから、これを微分形式の形で書くと

$$
d  \vec{x}(t) = J d \vec{x}(0)
$$

となる。先ほど求めた$J$の表式を用いると

$$
\mathrm{e}^{-w(t)} d  \vec{x}(t) = \mathrm{e}^{-w(0)} d \vec{x}(0)
$$

が時刻$t$によらず成立する。これは$ \mathrm{e}^{-w} d  \vec{x}$という量が不変計量(invariant measure)になっていることを意味する。

ハミルトン系の場合を例に考えてみる。

$\vec{x} = (q_1, q_2, \cdots, p_1, p_2, \cdots)$で記述された空間を考える。運動方程式はハミルトンの運動方程式

$$
\begin{aligned}
\dot{q}_i &= \frac{\partial H}{\partial p_i}\\
\dot{p}_i &= -\frac{\partial H}{\partial q_i}\\
\end{aligned}
$$

ここで、速度場の発散を計算すると

$$
\begin{aligned}
\nabla \dot{x} &= \sum_i \left(\frac{\partial \dot{q}_i}{\partial q}+
\frac{\partial \dot{p}_i}{\partial p_i}
  \right)\\
&= \sum_i \left(
\frac{\partial^2 H}{\partial p_i \partial q_i}
-\frac{\partial^2 H}{\partial p_i \partial q_i}
\right) \\
&=0
\end{aligned}
$$

すなわち$\nabla \dot{x} = \kappa = 0$であるから、

$$
J = \exp \int_0^t \kappa dt
$$

に代入すれば、$J=1$が導かれる。ここから、

$$
d \vec{x}(t) =d \vec{x}(0)
$$

すなわち、位相空間体積が時間発展で保存することが導かれる。これはリュービルの定理(Liouville's Theorem)にほかならない。 この観点から、一般の力学系で成立する

$$
\mathrm{e}^{-w(t)} d  \vec{x}(t) = \mathrm{e}^{-w(0)} d \vec{x}(0)
$$

を見ると、これがリュービルの定理の素直な一般化になっていることがわかると思う。

## まとめ

ヤコビの公式(Jacobi's Formula)と、それを用いたヤコビアンの性質の導出、さらに一般化リュービルの定理を議論した。ここから

$$
\mathrm{e}^{-w} d\vec{x} = d \vec{z}
$$

を満たすような変数変換$\vec{x} \rightarrow \vec{z}$を見つければ、非ハミルトンダイナミクスからハミルトンダイナミクスに移ることができることがわかる。しかし、一般にこの変換を見つけるのは難しく、限られた系でしか具体的な表式が見つかっていない。

## 参考文献

* M. E. Tuckerman et al. "On the classical statistical mechanics of non-Hamiltonian systems", [Europhys. Lett. 45, 149 (1999)](https://doi.org/10.1209/epl/i1999-00139-0).
