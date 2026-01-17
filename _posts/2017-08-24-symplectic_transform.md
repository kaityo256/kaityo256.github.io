---
layout: post
title: "シンプレクティック変換と運動方程式の関係について"
tags: [physics, qiita]
permalink: symplectic_transform
---

# シンプレクティック変換と運動方程式の関係について

## はじめに

力学系において、時間発展がシンプレクティック変換となる条件と、運動方程式に付随するリュービル演算子がエルミートであることの関係がよくごっちゃになるので簡単にまとめる。以下、数学的にはかなり雑な議論をするので注意されたい。特にシンプレクティック性については、「体積要素を保存する変数変換」という意味で使う。

## シンプレクティック条件と運動方程式

一自由度系$(p,q)$を考える。これがある変換(時間発展)により、新たな変数の組$(P,Q)$になったとする。この写像がシンプレクティックであるとは、この写像がシンプレクティック二形式を保存することである([参考](http://qiita.com/kaityo256/items/fd5a6ff3fcf0eb7bc860))。これは要するに、$(p,q)$から$(P,Q)$への変数変換のヤコビアンが1であることと等価である。

いま、与えられた運動方程式$(\dot{p}, \dot{q})$に従う時間発展がシンプレクティックであったとして、その運動方程式が従うべき条件を求めよう。

時刻$t$を基準とし、時刻$t+h$の時間発展を考える。時刻$t$に$(p,q)$であった座標が、時刻$t+h$に$(P,Q)$となったとしよう。初期条件から見た時刻$t+h$におけるヤコビアン$J(t+h)$は、

$$
J(t+h) = \left(\frac{\partial P}{\partial p} \frac{\partial Q}{\partial q} - \frac{\partial P}{\partial q}\frac{\partial Q}{\partial p} \right)
$$

で与えられる。さて、時刻に関わらず$J(t+h)=1$でなければならないのだから、

$$
\frac{d J}{d t} = 0
$$

が満たされる必要がある。なお基準時刻$t$において$J(t) = 1$であることに注意。

先程の式を

$$
\frac{d J}{d t} = \lim_{h \leftarrow 0} \frac{J(t+h) - J(t)}{h}
$$

と変形する。

$$
p(t+h) = p(t) + \dot{p} h + O(h^2)
$$

などに注意して計算すると、シンプレクティック条件は

$$
\frac{\partial \dot{p}}{\partial p}
+
\frac{\partial \dot{q}}{\partial q} = 0
$$

となる。これが、時間発展がシンプレクティックである時に運動方程式が満たすべき条件である。

## 運動方程式とエルミート性

先程求めた運動方程式の満たすべき条件が、リュービル演算子のエルミート性とつながることを見る。

リュービル演算子$i\mathcal{L}$とは、ある物理量$A(p,q)$について、その時間微分

$$
\begin{aligned}
\dot{A} &= \frac{\partial A}{\partial p} \dot{p}
+ \frac{\partial A}{\partial p} \dot{p}\\
&\equiv i\mathcal{L} A
\end{aligned}
$$

を与える演算子である。上記から

$$
i \mathcal{L} = 
\dot{p} \frac{\partial }{\partial p}
+ \dot{q} \frac{\partial }{\partial q}
$$

であることがわかる。

さて、関数空間に内積を以下のようにして定義する。

$$
(f,g) = \int f^* g dp dq
$$

リュービル演算子がエルミートであるとは、

$$
(f, i\mathcal{L} g) = (i\mathcal{L}f, g)
$$

が成立することである。これを先程の内積の定義に放り込んで、部分積分を使って整理すると、

$$
\begin{aligned}
(f, i\mathcal{L} g) &= 
\int f 
\left(
\dot{p} \frac{\partial }{\partial p}
+ \dot{q} \frac{\partial }{\partial q}
\right) g dpdq \\
&= -i \int g 
\left(
\frac{\partial (\dot{p}f)}{\partial p}
+ \frac{\partial (\dot{q}f)}{\partial q}
\right) dp dq \\
&= (i\mathcal{L}f, g)
-i \int \left(
\frac{\partial \dot{p}}{\partial p}
+
\frac{\partial \dot{q}}{\partial q}
\right) fg dp dq
\end{aligned}
$$

エルミートの条件から、

$$
\frac{\partial \dot{p}}{\partial p}
+
\frac{\partial \dot{q}}{\partial q} = 0
$$

でなければならない。これは時間発展がシンプレクティックである条件と一致する。

## 確率流からの解釈

そもそも運動方程式とは、位相空間$(p,q)$に、速度場$(\dot{p}, \dot{q})$を与えるものであると解釈できる。分布関数$f(p,q)$を考えると、速度場$(\dot{p}, \dot{q})$のもとでの確率流の保存則は

$$
\frac{\partial f}{\partial t} =  -
\frac{\partial }{\partial p} (\dot{p} f) -
 \frac{\partial }{\partial q} (\dot{q} f)
$$

で与えられる。さて、シンプレクティック条件とは、時間発展により微小体積要素$dp dq$が変化しない、ということであった。これは、この流れに従う確率流が非圧縮流れであるということを意味する。非圧縮条件とは、速度場のダイバージェンスがゼロであることであるから、

$$
\frac{\partial \dot{p}}{\partial p}
+
\frac{\partial \dot{q}}{\partial q} = 0
$$

これはシンプレクティック条件、及び時間発展演算子のエルミート性の条件に一致する。

## まとめ

時間発展がシンプレクティックであることと、運動方程式に付随するリュービル演算子がエルミートである条件が等しいことを見た。量子系などでは行列になるためこういう検証は簡単なのだが、古典力学では作用素が微分演算子になるため、対応を確認するのが少しだけ面倒ください。

なお、冒頭でも述べたが、ここでは「シンプレクティック」という言葉をかなりいい加減に使っている。ここで確認しているのは時間発展が体積要素を保存する条件だけであり、シンプレクティックでない写像も含まれてしまうので注意[^1]。

[^1]: まぁでも、普通に分子動力学法とか使ってる分には細かい定義とかはあんまり問題にならないと思うけど、ガチの数学な人に見られたらいろいろ怒られそう。
