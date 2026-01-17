---
layout: post
title: "解析力学の幾何学的側面IV"
tags: [math, physics, qiita]
permalink: classical_mechanics
---

# 解析力学の幾何学的側面IV

## はじめに

これまで、以下のような記事を書いてきました。

* [解析力学の幾何学的側面](https://qiita.com/kaityo256/items/e9adf792210e8c022010)
* [解析力学の幾何学的側面II](https://qiita.com/kaityo256/items/805243f7c4740a7937de)
* [解析力学の幾何学的側面 III](https://qiita.com/kaityo256/items/c7dfa0776a465932a56c)


このうち、「II」で簡単触れた、微分形式を用いた運動方程式についてもう少し詳しく見ていこうと思います。

急いで書いたので、計算間違い(特に符号回り)があるかもしれません。そのあたり気をつけて読んで下さい。

## リー群と接空間

二次元空間$(x,y)$を考えましょう。そこに、原点を中心に、**時計回り**[^tokei]に角度$t$だけ回転させる操作を考え、その操作を$U(t)$とします[^1]。$U(t)$は、二次元空間のベクトルに作用し、同じ二次元空間の別のベクトルを対応させる写像です。さて、この操作は以下の性質を満たします。

[^tokei]: ここで、通常の「反時計回り」の方向にしなかったのは、あとで$x$が運動量$p$、$y$が座標$q$と対応付けた場合の調和振動子の回転方向と揃えたかったからです。反時計回りとすると、時間を$t \rightarrow -t$とする変換で同じ議論ができます。

[^1]: ここで$\theta$を使わないのは、これが時間に対応することと、あとで微分1形式で$\theta$を使いたいからです。

* (単位元の存在) $U(0) \vec{v} = \vec{v}$
* (逆元の存在) $ U(t) U(-t) =U(-t) U(t) = U(0)$
* (結合法則) $ (U(a) U(b)) U(c) = U(a) (U(b) U(c))  = U(a+b+c)$

したがって、この操作は群となります。

さて、この群は一つの実数パラメータ$t$で特徴付けられています。したがって、$t$による微分を考えることができます。二次元空間上の適当な関数$A(x,y)$を考えましょう。これを$t$で微分します。

$$
\begin{aligned}
\frac{d A}{d t} &\equiv \lim_{t \rightarrow 0} \frac{U(t) A - U(0) A}{t}\\
&= \frac{dx}{dt}\frac{\partial A}{\partial x}+
\frac{dy}{dt}\frac{\partial A}{\partial y}
\end{aligned}
$$

これは任意の$A$について成り立ちますから、先程の群には自然に

$$
\frac{d}{dt} =  \frac{dx}{dt}\frac{\partial }{\partial x}+
\frac{dy}{dt}\frac{\partial }{\partial y}
$$

という構造が入ります。さて、ここで$\partial/\partial x$や$\partial/\partial y$は、ベクトル空間の基底と思うことができます。

実際に、

$$
a \frac{\partial }{\partial x}+
b \frac{\partial }{\partial y} = 
\begin{pmatrix}
a \\
b
\end{pmatrix}
$$

と表記すると、これは普通の二次元ベクトルと同様に扱えることがわかります。今回の回転のケースでは、小さい回転操作の極限として、各点$(x,y)$に

$$
\frac{d}{dt} =  \frac{dx}{dt}\frac{\partial }{\partial x}+
\frac{dy}{dt}\frac{\partial }{\partial y}
= 
\begin{pmatrix}
\dot{x} \\
\dot{y}
\end{pmatrix}
$$

というベクトルを、結びつけることができます。このように、微分ができる群のことをリー群と呼びます。リー群は、その各点に自然に線形空間を定義することができます。この空間を接空間(Tangent Space)と呼びます。もともとの二次元空間を$M$とし、その上の点$Q$で定義された接空間を$TM_Q$と表現します。

## 余接空間と微分形式

さて、回転操作が定義された系では、各点で基底$\partial_x, \partial_y$を持つ自然な線形空間$V$が定義されました。この線形空間の「相方」を考え、それを$V^\*$としましょう。相方とは、$V^\*$と$V$の任意の要素を持ってきた時に、$R$に写像できるような内積が定義できる空間です。もともと、$V$には縦ベクトルが定義されていました。


$$
a \frac{\partial }{\partial x}+
b \frac{\partial }{\partial y} = 
\begin{pmatrix}
a \\
b
\end{pmatrix}
$$

なので、横ベクトルを持ってくれば、自然な内積が定義されます。

$$
\begin{pmatrix}
c & d 
\end{pmatrix}
\begin{pmatrix}
a \\
b
\end{pmatrix} = ac + bd
$$

この横ベクトルの基底は、二次元空間上の関数の全微分から定義できます。

$$
dA = \frac{\partial A}{\partial x} dx
+ \frac{\partial A}{\partial y} dy
$$

接空間と同様に、この基底$dx, dy$はベクトル空間を張ります。この空間を余接空間(cotangent space)と呼び、$T^\*M_Q$と表現します。

二種類の基底$dx, dy$と$\partial_x, \partial_y$には、以下のような自然な内積が定義できます。

$$
\begin{aligned}
\left<dx, \frac{\partial}{\partial x}\right> = \frac{\partial x}{\partial x} &= 1\\
\left<dy, \frac{\partial}{\partial y}\right> = \frac{\partial y}{\partial y} &= 1\\
\left<dx, \frac{\partial}{\partial y}\right> = \frac{\partial x}{\partial y} &= 0\\
\left<dy, \frac{\partial}{\partial x}\right> = \frac{\partial y}{\partial x} &= 0\\
\end{aligned}
$$

## 微分2形式

さて、少し微分形式の復習をします。先程の$dx, dy$で記述されるものを微分1形式(1-form)と呼びます。これは、スカラー関数を全微分することで現れます。逆に、スカラー関数は0形式となります。先程見た

$$
dA = \frac{\partial A}{\partial x} dx
+ \frac{\partial A}{\partial y} dy
$$

は、0形式を全微分して1形式を作った例になります。

同様に、1形式を全微分すると2形式(2-form)を作ることができます。ここで、1形式として$\theta = x dy$を考えましょう。これを全微分すると、

$$
d \theta = \omega = dx \wedge dy
$$

となります。これが微分2形式です。2形式の間に外積記号$\wedge$が現れました。この記号にはいくつか重要な性質があります。

まず、左右をひっくり返すと負符号がでます。

$$
dx \wedge dy = - dy \wedge dx
$$

また、微分2形式とベクトルとの内積を考えると、微分1形式が出てきます。

$$
\left< dx\wedge dy, \frac{\partial}{\partial x}\right> = 
\frac{\partial x}{\partial x} dy 
= dy
$$

偏微分が右側にありますが、これを微分2形式の左からかけるイメージです。ここで、$\partial_y$との内積を取ると、負符号が出ることに注意してください[^2]。

[^2]: 「偏微分は外積記号をまたいで適用できない」と覚えておくと良いでしょう。偏微分したい基底を一番左に持っていく必要があります。そのときに、偶置換か奇置換かで符号がかわります。

$$
\begin{aligned}
\left< dx\wedge dy, \frac{\partial}{\partial y}\right> &=
-\left< dy\wedge dx, \frac{\partial}{\partial y}\right> \\
&= -\frac{\partial y}{\partial y} dx\\
&= -dx
\end{aligned}
$$

## 内積による運動表現

さて、ここまで準備したところで、微分形式による回転の表現を試みます。

回転とは、各点$^t(x,y)$にベクトル場$^t(\dot{x},\dot{y})$を結びつけるものでした。このベクトル場を、ちょっとわざとらしいですが、

$$
\begin{aligned}
iL &= \dot{x} \frac{\partial}{\partial x} +
\dot{y} \frac{\partial}{\partial y} \\
&=
\begin{pmatrix}
\dot{x} \\
\dot{y}
\end{pmatrix}
\end{aligned}
$$

として表現することにしましょう。もうおわかりかと思いますが、$iL$はリュービル演算子です。このリュービル演算子と、微分二形式$\omega = dx\wedge dy$との内積を考えます。

$$
\begin{aligned}
\left<\omega, iL \right> &=
\left<dx \wedge dy, \dot{x} \partial_x + \dot{y} \partial_y \right> \\
&= \dot{x} dy - \dot{y} dx
\end{aligned}
$$

さて、我々は回転の性質から、$\dot{x} = -y$、$\dot{y} = x$であることを知っていますので[^tokei2]、

[^tokei2]: 我々は回転を「時計回り」の方向に取っています。

$$
\left<\omega, iL \right> = -xdx - ydy
$$

さて、この式の右辺を見ると、ある関数$H$を考え、

$$
\left<\omega, iL \right> = -dH
$$

と表現したくなります。そんな関数は簡単に見つかって、

$$
H = \frac{x^2}{2} + \frac{y^2}{2}
$$

です。この関数を使うと、この世界のベクトル場は

$$
\left<\omega, iL \right> = -dH
$$

と表現されます。左辺はただのベクトル場の定義ですから、右辺がその実体を与えていることになります。この関数$H$をハミルトニアンと呼び、この関数により作られたベクトル場$iL$をハミルトニアンベクトル場と呼びます。

[解析力学の幾何学的側面II](https://qiita.com/kaityo256/items/805243f7c4740a7937de)では、運動方程式を、ハミルトニアンの勾配$\nabla H$を回転行列で回転させたものとして表現しました。このうち、勾配は全微分$dH$で、回転行列(反対称行列)をかける操作は、微分二形式の反対称性$dx\wedge dy = - dy\wedge dx$で表現されています。

## 拡大空間

さて、いまは空間としては$x,y$で張られる空間を考えていました。この空間に、回転角$t$を加えた三次元空間を考えます。具体的には、微分2形式として

$$
\Omega = \omega + dH \wedge dt
$$

を考えます。ただし、$H$は$x,y$の関数ですので、新たに付け加わった自由度は$t$だけです。この拡大された微分二形式$\Omega$と、リュービル演算子との内積を考えます。

$$
\begin{aligned}
\left<\Omega, iL \right> &= \left<dx\wedge dy + dH \wedge dt, \dot{x} \partial_x + \dot{y} \partial_y + \partial_t\right>
\end{aligned}
$$

ここで、拡張された空間を考えているため、リュービル演算子に$\partial t$の項が加わっていることに注意してください。

内積をばらして計算していきます。

$$
\left<dx\wedge dy , \dot{x} \partial_x + \dot{y} \partial_y + \partial_t\right> = \dot{x} dy - \dot{y} dx
$$

$$
\begin{aligned}
\left<dH \wedge dt, iL\right> &=
\left<
\partial_x H dx\wedge dt +
\partial_y H dy\wedge dt, iL \right> \\
&= (\dot{x} \partial_x H +\dot{y} \partial_y H) dt
- \partial_x H dx - \partial_y H dy
\end{aligned}
$$

以上から、拡大空間における微分二形式$\Omega$とリュービル演算子の内積を0とすると、

$$
\left<\Omega, iL \right> = 0
$$

各ベクトル($dx, dy, dz)$の成分がゼロであることから、以下の等式を得ます。

$$
\begin{aligned}
\dot{x} &= -\partial_y H \\
\dot{y} &= \partial_x H \\
0 &= \dot{x} \partial_x H + \dot{y} \partial_y H
\end{aligned}
$$

一番目と二番目の式が、調和振動子の運動方程式と等価です。また、三番目の式は、一番目と二番目の式から自明に導かれるため、独立ではありません。

## まとめ

運動方程式の幾何表現を考えてみました。時間発展演算子は、時間$t$をパラメータとする群を作ります。この群は微分可能なのでリー群となり、自然に接空間、余接空間を考えることができます。接空間の基底が$\partial_x, \partial_y$、余接空間の基底が$dx, dy$です。リュービル演算子は接空間のベクトルとして表現されます。

さらに、微分二形式$\omega = dx \wedge dy$とリュービル演算子の内積を考えることで、運動方程式

$$
\left< \omega, iL\right> = -dH
$$

を得ました。この右辺を左辺に「移項」することで、拡大された空間における運動方程式の幾何表現

$$
\left< \omega + dH\wedge dt, iL\right> = 0
$$

を得ます。ハミルトンの運動方程式とは回転であり、ハミルトニアン$H$と、時間$t$も座標と運動量と考えると、お互いにシンプレクティック共役な量になっていること、さらに、$t$に関して$H$が循環座標になっていることから、$H$が保存量になると理解できます。

今回は僕の趣味で、時間反転に対して対称な量を一般化座標、反対称な量を一般化運動量とするため、$dH\wedge dt$という二形式を考えましたが、普通の教科書では、$dH\wedge dt$ではなく、$-dt\wedge dH$として、時間を一般化座標、ハミルトニアンを一般化運動量に取ることが多いです。ひっくり返しても負符号がでるだけなので、どちらでもかまいません。

## 参考文献

1. [解析力学1, 2 (中村孔一、山本義隆著, 朝倉物理学大系)](https://www.amazon.co.jp/dp/4254136714) 解析力学を学ぶならこの二冊は必携
2. [般力学系と場の幾何学 (大森 英樹、裳華房)](https://www.amazon.co.jp/dp/4785310693)　解析力学とシンプレクティック幾何学の関係を知りたければこの本。著者の強い思い入れが感じられて、読んでいて楽しい。
