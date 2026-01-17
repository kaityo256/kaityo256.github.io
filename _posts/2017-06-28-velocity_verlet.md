---
layout: post
title: "Velocity Verlet法とシンプレクティック積分"
tags: [math, physics, qiita]
permalink: velocity_verlet
---

# Velocity Verlet法とシンプレクティック積分


## はじめに

分子動力学法(Molecular Dynamics, MD)の数値積分法としてVelocity Verlet法が広く使われている。時刻$t$における座標を$r(t)$、時間刻みを$h$として、その時間発展は

$$
\begin{aligned}
r(t+h) &= r(t) + v h + \frac{a h^2}{2}  \\
v(t+h) &= v(t) + \frac{a(t) + a(t+h)}{2} h
\end{aligned}
$$

で与えられる。ただし$v(t) \equiv \dot{r}$、$a(t) \equiv \dot{v}$である。座標の項を時間微分で書き直すと、

$$
r(t+h) = r(t) + \frac{d r}{dt} h +\frac{d^2 r}{dt^2} \frac{h^2}{2} 
$$

となり、これは$h$を微小量として2次までテイラー展開を行ったものにほかならない。速度の更新は、時刻$t$と時刻$t+h$の加速度の平均で時間発展させた形となっている。
Velocity Verletは簡便な方法で、それなりの精度があり、なにより安定していることが多いため広く使われている。本稿では、これがシンプレクティック積分であることを確認する。

## シンプレクティック積分

MDでは速度と座標の組として$v,r$を使うことが多いが、シンプレクティック性を考える時には$p, q$を使う方が個人的にしっくりくるので、以下、一般化座標を$q$、一般化運動量を$p$と議論する。ハミルトニアンが$H(p,q)$で与えられている時、ハミルトンの運動方程式は

$$
\begin{aligned}
\dot{p} & = - \partial_q H \\
\dot{q} & =  \partial_p H　\\
\end{aligned}
$$

これを時間積分したい。時間積分とは、時刻$t$における変数の値$p(t), q(t)$がわかっている時、適当な時間刻み$h$に対して、次の時刻の値$p(t+h), q(t+h)$を与える処方箋のことである。微分がごちゃごちゃにならないように、$P=p(t+h)$、$Q = q(t+h)$とすると、時間積分とは$(p,q)$を$(P,Q)$に変数変換する公式のことである。

さて、シンプレクティック積分とは、この変数変換$(p,q) \rightarrow (P,Q)$がシンプレクティック変換(正準変換)であるような積分法のことである。変数変換が正準変換である必要十分条件は、シンプレクティック二形式が変換の前後で保存していること、すなわち

$$
dP \wedge dQ = dp \wedge dq
$$

を満たすことである(シンプレクティック条件)。ここで$dP$は$P$の外微分であり、$dp \wedge dq$は$dp$と$dq$の外積である。

簡単に外微分と微分形式の性質をまとめておく。

まず、関数の外微分は全微分で定義される。すなわち$P(p,q)$の外微分は

$$
dP(p,q) = \frac{\partial P}{\partial p} dp + \frac{\partial P}{\partial q} dq
$$

となる。また、外積の性質として、同じものの外積はゼロとなる。

$$
dp \wedge dp = dq \wedge dq = 0
$$

順序を入れ替えると負符号がつく。

$$
dp \wedge dq = - dq \wedge dp
$$

以上の性質からシンプレクティック条件を書き直すと、

$$
\begin{aligned}
dP \wedge dQ &= 
\left( \frac{\partial P}{\partial p} dp + \frac{\partial P}{\partial q} dq
 \right) 
 \wedge
\left( \frac{\partial Q}{\partial p} dp + \frac{\partial Q}{\partial q} dq
\right) \\
&= \left(\frac{\partial P}{\partial p} \frac{\partial Q}{\partial q} - \frac{\partial P}{\partial q}\frac{\partial Q}{\partial p} \right) dp \wedge dq\\
&= dp \wedge dq
\end{aligned}
$$

すなわち、
$$
\left(\frac{\partial P}{\partial p} \frac{\partial Q}{\partial q} - \frac{\partial P}{\partial q}\frac{\partial Q}{\partial p} \right) = 1
$$
が満たされればよい。これは変数変換$(p,q) \rightarrow (P,Q)$のヤコビアンが1であるということを意味する。

シンプレクティック積分とは、変数変換のヤコビアンが1となるような積分公式を与える処方箋である。

## Velocity Verletのシンプレクティック性の確認

では、Velocity Verletがシンプレクティック積分となることを確認する。ハミルトニアンとして

$$
H(p,q) = \frac{p^2}{2} + V(q)
$$

の形を考える。ただし質量は$1$としている。ハミルトンの運動方程式は

$$
\begin{aligned}
\dot{p} &= -V'(q) \\
\dot{q} &= p
\end{aligned}
$$

であるから、$P \equiv p(t+h),Q \equiv q(t+h)$としてVelocity Verletの公式に当てはめると、

$$
\begin{aligned}
Q &= q + p h - \frac{V'(q) h^2}{2}  \\
P &= p - \frac{V'(q) + V'(Q)}{2} h
\end{aligned}
$$

を得る。$P$の式に、更新された$Q$が使われているのがポイントである。この変換のヤコビアンを計算する。手で計算しても良いが、面倒なのでMathematicaにやらせてしまおう。

{% raw %}
In[1]:= Q := q + p h - V'[q] h^2/2

In[2]:= P := p - (V'[q] + V'[Q]) h /2

In[3]:= D[{P, Q}, {{p, q}}] // Det

Out[3]= 1
{% endraw %}

ちゃんと1になった。

## シンプレクティック積分と指数分解公式

Velocity Verlet法がなぜシンプレクティック積分になっているか、指数分解公式からVelocity Verlet法を導出してみる。

ハミルトニアンが運動項とポテンシャル項にわかれている、すなわち$H(p,q) = K(p) + V(q)$と書ける場合を考える。対応する運動方程式は

$$
\begin{aligned}
\dot{p} &= -V'(q) \\
\dot{q} &= K'(p)
\end{aligned}
$$

となる。ここで、リュービル演算子$\mathcal{L}$を考える。リュービル演算子は、物理量に作用してその時間微分を与える演算子である。

$$
-i \mathcal{L} A = \dot{A} = \partial_p A \dot{p} + \partial_q A \dot{q}
$$

先の運動方程式であれば、リュービル演算子は以下のように与えられる。

$$
-i \mathcal{L} = -V'(q) \partial_p + K'(p) \partial_q
$$

ここで、時間発展演算子$U(h)$を考える。これは、物理量に作用すると$h$だけ時刻を進める演算子である。

$$
U(h) A(t) = A(t+h)
$$

リュービル演算子の定義を形式的に積分することで、時間発展演算子をリュービル演算子で表すことができる。

$$
U(h) = \exp\left( -i  \int_t^{t+h} \mathcal{L} \right)
$$

数値積分法とは、この時間発展演算子$U(h)$をなんらかの方法で近似する手段に他ならない。

さて、一般に指数の肩にのったリュービル演算子を厳密に評価することは困難である。しかし、特別な場合には厳密に計算できる。例えばポテンシャル項がなく自由運動の場合、リュービル演算子は

$$
-i \mathcal{L}_K =  K'(p) \partial_q
$$

であり、これは指数関数の肩に載せたものが厳密に計算できる[^1]。

[^1]: これは$\partial_q K'(p) = 0$であることから、指数関数の二次以上の項がゼロになることによる。

$$
U_K(h) = \exp\left( -i  \int_t^{t+h} \mathcal{L}_K \right) = \left(1 + K'(p) h\right) \partial_q
$$

同様にポテンシャル項だけの時のリュービル演算子に対応する時間発展演算子も厳密に計算できる。

$$
U_V(h) = \left(1 - V'(p) h\right) \partial_p
$$

さて、リュービル演算子が、厳密に時間発展演算子を計算できる部分の和で書けているとする。

$$
-i \mathcal{L} = -i \mathcal{L}_K -i \mathcal{L}_V 
$$


これを指数の肩に載せると

$$
U(h) = \exp\left( -i  \int_t^{t+h} (\mathcal{L}_K + \mathcal{L}_V)  \right)
$$

ここで$\mathcal{L}_K$と$\mathcal{L}_V$は演算子として非可換なので、そのままでは指数関数を評価できないが、これを片方ずつ指数の肩に載せたもので近似しよう、というものが指数分解公式と呼ばれるものである。

例えば一次の公式であれば

$$
U(h) \sim U_K(h) U_V(h) + O(h)
$$


二次の公式であれば

$$
U(h) \sim U_V(h/2) U_K(h) U_V(h/2)+ O(h^2)
$$


等と分解できる。ここで、部分に分けた時間発展演算子$U_K, U_V$はシンプレクティック変換を与えることに注意[^2]。シンプレクティック変換の合成はシンプレクティック変換であるから、このようにして作られた数値積分はシンプレクティック積分となる。

先に得られた二次の公式を適用してみよう。まず$U_V(h/2)$を演算する。これは座標をその時点での速度で$h/2$の時間だけ運動させる演算子であるから、

$$
p(t+h/2) = p(t) - V'(q(t))h
$$

次に$U_K(h)$は速度をその時点での力で時間$h$だけ更新する演算子であるので、

$$
q(t+h) = q(t) + p(t+h/2) h
$$

ここで、既に$U_V(h/2)$が作用しているため、$p$が更新されていることに注意。最後にまた$U_V(h/2)$を演算すると

$$
p(t+h) = p(t+h/2) - V'(q(t+h))h
$$

これらの式から$p(t+h/2)$を消去し、$a(t) \equiv -V'(q(t))$と置くと、

$$
\begin{aligned}
q(t+h) & = q(t) + p(t) h + a(t) \frac{ h^2}{2} \\
p(t+h) &= p(t) + \frac{a(t) + a(t+h)}{2} h
\end{aligned}
$$

これはVelocity Verlet法にほかならない。

## オイラー法と一次のシンプレクティック法

分子動力学法を一次のオイラー法で解こうとして、意外に安定しているなと思ったら実はシンプレクティック積分になっていた、ということがよくある。このようなスキームによる数値積分法である。

$$
\begin{aligned}
p(t+h) &= p(t) - V'(q) h \\
q(t+h) &= q(t) + p(t+h) h
\end{aligned}
$$

オイラー法を組んだつもりが$q$のアップデートに修正された$p$を使っているため、これは

$$
U \sim U_V(h) U_K(h)
$$

とする一次の指数分解公式を使ったシンプレクティック積分になっている。ヤコビアンが1になっていることも確認できる。

{% raw %}
In[4]:= P := p - V'[q] h

In[5]:= Q := q + P h

In[6]:= D[{P, Q}, {{p, q}}] // Det

Out[6]= 1
{% endraw %}

「正しい」オイラー法は、$p,q$ともに時刻$t$での値を使ったアップデートであるため、

$$
\begin{aligned}
p(t+h) &= p(t) - V'(q) h \\
q(t+h) &= q(t) + p(t) h
\end{aligned}
$$

であり、ヤコビアンが1とならないことも確認できる。

{% raw %}
In[4]:= P := p - V'[q] h

In[7]:= Q := q + p h

In[8]:= D[{P, Q}, {{p, q}}] // Det

Out[8]= 1 + h^2 (V'')[q]
{% endraw %}

## Velocity Verletがシンプレクティックにならない場合

Velocity Verletは元の運動方程式がシンプレクティックの場合に適用すればシンプレクティック積分となるが、元の方程式がシンプレクティックでない場合に無理やり適用してもシンプレクティックにならない。

例えば、摩擦のあるような調和振動子系を考えてみる。[^g]

[^g]: 摩擦係数は$\gamma$を用いることが多いが、あとでMathematicaに突っ込む際の便利のため$g$にしてある。

$$
\begin{aligned}
\dot{p} &= -q - g p \\
\dot{q} &= p
\end{aligned}
$$

この方程式にVelocity Verletを適用するとこうなるであろう。

$$
\begin{aligned}
Q \equiv q(t+h) &= q + p h + (-q- gp)\frac{h^2}{2} \\
P \equiv p(t+h) &= p + \frac{h}{2}(-q - g p - Q - g P) 
\end{aligned}
$$

ここで、運動量の時間変化がその時刻での運動量に依存しているため、$P$が両辺に表れているが、この場合は$P$について解くことができるため、以下の数値積分法を得る。

$$
\begin{aligned}
Q  &= q + p h + (-q- gp)\frac{h^2}{2} \\
P  &= \frac{2p - gph - qh - Q h}{2 + g h} 
\end{aligned}
$$

この変換$(p,q) \rightarrow (P,Q)$のヤコビアンは1にならず、従ってシンプレクティック積分とならない。

{% raw %}
In[9]:= Q := q + p h + (-q - g p) h^2/2

In[10]:= P := (2 p - g p h - q h - Q h)/(2 + g h)

In[11]:= Det[D[{P, Q}, {{p, q}}]]

Out[11]= 2/(2 + g h) - (g h)/(2 + g h)
{% endraw %}

## まとめ

Velocity Verletがシンプレクティック積分となること、及びなぜシンプレクティック積分となるかを示した。Velocity Verletがシンプレクティック積分を与えるのは、もとの運動方程式がシンプレクティックである時に限られる。従って、もともとシンプレクティックでない運動方程式[^masatu]に対して無理やり適用してもシンプレクティックにならない。

[^masatu]: ここでは摩擦のある系を考えたが、この系は時間に依存する変換を許すことでシンプレクティック変換を構築できる。そういう意味でこの方程式を「シンプレクティックでない」と呼ぶのは語弊があるのだが、まぁそこはそれ。

[^2]: 例えば自由運動を与える変換$(p,q) \rightarrow (p, q+ph)$のヤコビアンは自明に1である。

## 参考文献

1. [解析力学1, 2 (朝倉物理学大系)](https://www.amazon.co.jp/dp/4254136714) この本は名著なので個人的に読むことを強く勧める。
