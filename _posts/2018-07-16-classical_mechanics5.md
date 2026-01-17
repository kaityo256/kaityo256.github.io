---
layout: post
title: "解析力学の幾何学的側面V"
tags: [math, physics, qiita]
permalink: classical_mechanics5
---

# 解析力学の幾何学的側面V

解析力学の幾何学的側面V
===

解析力学において、「温度」という概念を幾何学的に導入してみます。この記事は、参考文献に挙げた論文の内容を自分なりに再構成したものです。

これまでの記事は以下の通りです。

* [解析力学の幾何学的側面](https://qiita.com/kaityo256/items/e9adf792210e8c022010)
* [解析力学の幾何学的側面II](https://qiita.com/kaityo256/items/805243f7c4740a7937de)
* [解析力学の幾何学的側面 III](https://qiita.com/kaityo256/items/c7dfa0776a465932a56c)
* [解析力学の幾何学的側面 IV](https://qiita.com/kaityo256/items/5e5e6e08404cb91cf672)

## はじめに

解析力学における温度とは何でしょうか？3次元$N$粒子系を考えましょう。分子動力学法では、運動エネルギーを$K$として

$$
T  = \frac{2K}{3Nk}
$$

という量の時間平均を温度として使います。ただし、$k$はボルツマン定数です。まず、これがなぜ温度を与えるか見てみましょう。3次元$N$粒子系のハミルトニアンはこんな形をしています。

$$
H = \sum_i \frac{p_i^2}{2m} + V(\{q_i\})
$$

ここで、$x,y,z$の自由度は$i$に含めています。これが温度$T$のカノニカル分布をしているとしましょう。物理量$A$のカノニカル平均は

$$
\left< A \right> = Z^{-1} \int A \exp(-\beta H) d \Gamma
$$

で書けます。ただし$Z$は分配関数、$\beta = 1/(kT)$は逆温度です。さて、ここで以下の量のカノニカル平均を考えてみます。

$$
\left< p_i \frac{\partial H}{\partial p_i}\right> = Z^{-1} \int  p_i  \frac{\partial H}{\partial p_i} \exp(-\beta H) d \Gamma
$$

上記の式は、$p_i$による部分積分によりただちに

$$
\left< p_i \frac{\partial H}{\partial p_i}\right> = \frac{1}{\beta} = kT
$$

と求まります。ハミルトニアンが先程の形をしていれば、

$$
 p_i \frac{\partial H}{\partial p_i} = \frac{p_i^2}{m}
$$

です。運動エネルギー$K$は

$$
K = \sum_i \frac{p_i^2}{2m}
$$

ですから、

$$
\left< K \right> = \sum_i \left< \frac{p_i^2}{2m} \right> = \frac{3NkT}{2}
$$

ここから、

$$
T = \frac{2\left< K \right>}{3Nk}
$$

となり、カノニカル平均と時間平均が一致することを仮定すると冒頭の式が出てきます。

さて、ここでの温度はカノニカル分布$\exp(-\beta H)$に由来します。しかし、普通にハミルトンの運動方程式を解くと、得られるのはミクロカノニカルアンサンブルです。定常状態が指定の温度のカノニカル分布になるような運動方程式を与える処方箋として、Nose-Hoover法などがありますが、これはハミルトンの運動方程式を修正しているため、もともとハミルトンの運動方程式が持っていた美しい変分原理などは失われています。もちろん、分子動力学法を単なるサンプリング手法として用いるなら、定常状態が指定温度のカノニカル分布になればそれで良いのですが、なんとかハミルトンの運動方程式の枠組みのまま温度を導入したくなります。

そこで本稿では、ハミルトンの運動方程式に従う系において、ミクロカノニカルアンサンブルの中で温度を導入してみます。先に結論から言うと、Jeppsらは、以下のような量が熱力学極限において逆温度を与えることを証明しました[Jepps et al., Phys. Rev. E vol. 62 pp. 4547 (2000)]。

$$
\beta = \frac{\left< \nabla \cdot \textbf{B} \right>_E}{\left< \nabla H \cdot \textbf{B} \right>_E}
$$

ここで、$\textbf{B}$はある条件を満たす任意のベクトル場、$\left< A \right>_E$は、物理量$A$の等エネルギー面での平均、すなわち

$$
\left< A \right>_E = \int \delta(H-E) d \Gamma
$$

です。この量は等エネルギー面上での平均ですから、系がエルゴード的であれば、ハミルトンの運動方程式の時間発展における時間平均と一致します。したがって、運動方程式をいじることなく、温度を定義、測定することができます。

以下では、なぜこれが温度を与えるか、そしてそれが幾何学的な温度の定義となっているのかという点を見てみます。

## 一般化ビリアル

まず、

$$
\beta = \frac{\left<\nabla \cdot \textbf{B}\right>_E}{\left<\nabla H \cdot \textbf{B}\right>_E}
$$

という量を考えます。奇異に見えるかもしれませんが、これはビリアルを単に一般化したものです。先程、

$$
\left< p_i \frac{\partial H}{\partial p_i}\right> = \frac{1}{\beta} 
$$

という量を見ました。定義を書き下してみるとすぐにわかりますが、$p_i$に関する部分積分を行うと、$\partial H/\partial p_i \exp(-\beta H)$の項目が$\exp(-\beta H) /\beta$となり、$p_i$が$p_i$で微分されて1になります。$\exp(-\beta H)$を全空間積分すると分配関数$Z$ですから、規格化定数$Z^{-1}$とキャンセルして$1/\beta$が出てくる仕組みです。

全く同様に座標に関する偏微分から

$$
\left< q_i \frac{\partial H}{\partial q_i}\right> = \frac{1}{\beta} 
$$

という方法で温度を得ることもできます。前者を運動温度(kinetic temperature)、後者を状態温度(configurational temperature)と呼んで区別することもあります。両者はもちろん平衡状態では一致しますが、非平衡状態では一般に異なるため、両者の差を見ることで系が緩和したかチェックするのに使えます。

さて、同様にスカラー量$B_i$について、$B_i \frac{\partial H}{\partial p_i}$という量のカノニカル平均を考えてみましょう。ただし$B_i$は$p_i$その他の座標に依存しているものとします。すると、やはり簡単な部分積分から、

$$
\left< B_i \frac{\partial H}{\partial p_i} \right> = \frac{1}{\beta}
\left< \frac{\partial B_i}{\partial p_i} \right>
$$

が成り立つことがわかります。いま、$\textbf{B}$を、位相空間$\Gamma = \\{ p_i, q_i \\} $上に定義されたベクトルだとすると、それぞれの成分について部分積分を行えば、

$$
\left<\textbf{B} \cdot \nabla H\right> = \frac{1}{\beta}
\left<\nabla \cdot \textbf{B} \right>
$$

となることがすぐに分かります(偏微分が部分積分によりハミルトニアンから$B_i$に移りました)。これは一般化されたビリアルにほかなりません。したがって、カノニカル平均においては、この量が温度を与えるのはほぼ自明です。問題は、この量の等エネルギー面平均がなぜ温度を与えるかです。それを次の節で見てみましょう。

## ミクロカノニカルにおける温度の定義と導出の流れ

まずエントロピーを定義しましょう。ミクロカノニカル、つまりエネルギー一定の系において、エントロピーは等エネルギー面の面積の対数で定義するのが自然でしょう。つまり、等エネルギー面の面積を$\mathcal{A}(E)$として、この系のエントロピーを

$$
S = k \ln \mathcal{A}
$$

で定義します。そして、熱力学関係式

$$
\frac{1}{T} = \frac{\partial S}{\partial E}
$$

から温度を定義することにします。ただし、ハミルトンの運動方程式に従って運動する限りエネルギーは一定ですから、この枠組ではこのエネルギーに関する微分を実行できません。そこで別の量を評価し、熱力学極限において上記の量に漸近することを示すことで、温度を導入します。そして、もし系がエルゴード的であるならば、等エネルギー面上での平均が、時間平均と一致することから、分子動力学法で温度が計算できる、というロジックになります。

## 導出

3次元$N$粒子系を表現する、位相空間$\Gamma$で張られた空間にハミルトニアン$H(\Gamma)$が定義されているとします。全位相空間を$\Omega$、あるエネルギー$E$における等エネルギー面を$A(E)$とすると、等エネルギー面の面積$\mathcal{A}(E)$は以下のように定義できます。

$$
\begin{aligned}
\mathcal{A}(E) &=  \frac{1}{h^{3N}N!} \int_\Omega \delta (H(\Gamma) - E) d\Gamma \\
&= \frac{1}{h^{3N}N!} \int_{A(E)} \frac{d A_E}{||\nabla H||} \\
&= \frac{1}{h^{3N}N!} \int_{A(E)} d \mu_E.
\end{aligned}
$$

ただし、$h$はプランク定数、$ d\mu_E \equiv d A_E/ ||\nabla H||$は、等エネルギー面$A(E)$における微小面積要素です。さて、この系のエントロピーを

$$
S = k \ln \mathcal{A}
$$

で定義します。これは、以下のように書き直せます。

$$
\exp(S/k) = \frac{1}{h^{3N}N!} \int_{A(E)} d \mu_E
$$

この系はミクロカノニカルなので、上記をミクロカノニカル温度(microcanonical temperature)と呼ぶことがあります。

ここで、位相空間$\Gamma$に定義されたスカラ量$B(\Gamma)$の等エネルギー面での平均は以下のように定義されます。

$$
\left< B \right>_E = \frac{ \mathcal{A}^{-1} }{ h^{3N}N! } \int_{A(E) } B(\Gamma) d \mu_E
$$

このスカラー量$B$を使って、$S_B$という量を定義します。

$$
\begin{aligned}
\exp(S_B/k) \equiv& \exp(S/k) \left< B \right>_E \\
&= \frac{1}{h^{3N}N!} \int_{A(E)} B(\Gamma) d \mu_E
\end{aligned}
$$

この量を$B$修正されたエントロピー(B-modified entropy)と呼ぶことにしましょう。この$B$修正されたエントロピーを使うと、$B$修正された温度$T_B$も定義できます。

$$
\frac{1}{T_B} = \frac{\partial S_B}{\partial E}
$$

さて、$B$修正されたエントロピーは以下のようにかけるのでした。

$$
\exp(S_B/k) = \frac{1}{h^{3N}N!} \int_{A(E)} B(\Gamma) d \mu_E
$$

両辺を$E$で偏微分しましょう。左辺は

$$
\frac{\partial \exp(S_B/k)}{\partial E} = \frac{\exp(S_B/k)}{k} \frac{\partial S_B}{\partial E} = \frac{\exp(S_B/k)}{k T_B}
$$

となります。右辺は積分があるので面倒ですが、微分の定義をそのまま書いて

$$
\frac{1}{h^{3N}N!} \frac{\partial}{\partial E} \int_{A(E)} B(\Gamma) d \mu_E =
\frac{1}{h^{3N}N!} \lim_{\delta \rightarrow 0} \frac{1}{\delta} \left[
 \int_{A(E+\delta)} B(\Gamma) d \mu_{E+\delta}
 -  \int_{A(E)} B(\Gamma) d \mu_E
\right].
$$

となります。

さて、これまで任意だったスカラー量$B$として、あるベクトル場$\textbf{B}$とハミルトニアンの勾配$\nabla H$との内積、$\nabla H \cdot \textbf{B}$を採用します。

すると、$d \mu_E \equiv d A_E/ ||\nabla H||$でしたから、

$$
\begin{aligned}
 \int_{A(E)} B(\Gamma) d \mu_E =&  \int_{A(E)} \nabla H \cdot \textbf{B}(\Gamma) \frac{d A_E}{||\nabla H||} \\
 =&  \int_{A(E)} \textbf{B}(\Gamma) \cdot \hat{\textbf{n}}(\Gamma) d A_E
\end{aligned}
$$

を得ます。ただし$\hat{\textbf{n}}(\Gamma)$ は $\Gamma$における等エネルギー面の単位法線ベクトルです。ある面上において、ベクトル場と法線ベクトルの内積の形になったのでガウスの定理を適用できて、

$$
\begin{aligned}
\frac{1}{h^{3N}N!} \frac{\partial}{\partial E} \int_{A(E)} B(\Gamma) d \mu_E =&
\frac{1}{h^{3N}N!} \lim_{\delta \rightarrow 0} \frac{1}{\delta} 
\int_E^{E+\delta} \int_{A(E)} \nabla \cdot \textbf{B}(\Gamma) d A_E d E\\
=& \frac{1}{h^{3N}N!} \int_{A(E)} \nabla \cdot \textbf{B}(\Gamma) d \mu_E,\\
=& \exp(-S/k) \left<\nabla \cdot \textbf{B}\right>_E
\end{aligned}
$$

となります。これでようやく積分、つまり右辺を評価できました。元の式の左辺と右辺が等しいことから以下の等式を得ました。

$$
\frac{\exp(S_B/k)}{k T_B} = \exp(-S/k) \left<\nabla \cdot \textbf{B}\right>_E
$$


ここで、$B$修正されたエントロピーの式に$B = \nabla H \cdot \textbf{B}$を代入して整理し、両辺を$k T_B$で割ると、

$$
\frac{\exp{(S_B/k)}}{kT_B} = \frac{\exp{(-S/k)} \left< \nabla H  \cdot \textbf{B}\right>_E}{k T_B}
$$

となります。上記の二つの式を見比べて、

$$
\frac{1}{T_B} = \frac{\left<\nabla \cdot \textbf{B}\right>_E}{\left< \nabla H  \cdot \textbf{B}\right>_E}
$$

これは、$B$修正された温度が、等エネルギー面上のでの平均のみで求められた、つまり$E$での微分がエネルギー一定の条件から計算できたことを意味します。

さて、$S_B$の定義から、

$$
S_B(E) = S(E) + k \ln \left<B\right>_E
$$

でしたから、Nが増加した時に $B$の増加が$e^N$より十分遅ければ、熱力学極限で$B$修正されたエントロピー$S_B$は、もともとのエントロピー$S$に一致し、従って$B$修正された温度$T_B$も、もとの温度$T$に一致します。

以上から、その条件を満たす$B$において

$$
\lim_{N\rightarrow \infty} \frac{\left<\nabla \cdot B\right>_E}{\left<\nabla H \cdot B\right>_E} = \frac{1}{kT} = \beta
$$

となり、等エネルギー面上での平均のみで温度が定義、計算できました。

## まとめ

解析力学において、温度を幾何学的に定義しました。等エネルギー面の面積の対数をエントロピーとし、そのエントロピーのエネルギー微分を温度として定義することで、解析力学の範囲内だけで温度が定義されます。その温度はそのままでは計算できませんが、「$B$修正された温度」を導入し、そちらは計算できること、さらに$B$修正されたエントロピーは、熱力学極限で修正されていない元のエントロピーに一致することから、等エネルギー面での平均だけで温度が計算できることになります。

系がエルゴード的であれば、時間平均と等エネルギー面での平均が一致することが期待されるため、これでハミルトンの運動方程式に従って、先程の量の時間平均を取れば温度が求められることになります。

わりと大仰な計算をしましたが、本質は「ミクロカノニカルにおける物理量の期待値と、カノニカルにおける物理量の期待値は、熱力学極限で等しくなる」ということを、具体的な量に対して計算したに過ぎません。ですが、「面積」という幾何学的な量でエントロピーを定義し、さらに計算の途中でガウスの法則を使うなど、なんか「幾何学的」に温度を定義できた気になりませんか？

## 参考文献

* H. H. Rugh, Phys. Rev. Lett. vol. 78, 772 (1997).
* O. G. Jepps, G. Ayton, and D. J. Evans, Phys. Rev. E vol. 62 4547 (2000).
* C. Braga and K. P. Travis, J. Chem. Phys., vol. 123, 134101 (2005).
