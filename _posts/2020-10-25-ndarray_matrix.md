---
layout: post
title: "混ぜるな危険！ndarrayとmatrix"
categories: Python, scipy, numpy
permalink: ndarray_matrix
---

# 混ぜるな危険！ndarrayとmatrix

## TL;DR

`numpy.matrix`は[非推奨](https://numpy.org/doc/stable/reference/generated/numpy.matrix.html)。`numpy.ndarray`と`@`演算子を使いましょう。

## はじめに

少し前に「[大名行列を特異値分解してみる](https://qiita.com/kaityo256/items/78b16c58228e131f8144)」という記事を書いたところ、元同僚さんから「`numpy.matrix`はdeprecatedですよ」と言われて驚きました[^1]。

[^1]: 現在は`matrix`を使わない形に修正してありますが、初出時は使っていました。

調べたらStackOverflowに[やたら詳しい解説](https://stackoverflow.com/a/53254739)が載っていたので、それをもとに説明してみようと思います。

## 特異値分解とmatrixクラス

線形代数に特異値分解(Singular Value Decomposition, SVD)という処理があります。m行n列の行列Xを、m行m列のユニタリ行列U、m行n列の対角行列S、n行n列のユニタリ行列Vの積に分けるというものです。なんか適当な行列を作ってみましょう。

```py
import numpy as np
from scipy import linalg

X = (np.arange(6)+1).reshape(2,3)
```

これで、Xは以下のような2行3列の行列になります。

```txt
[[1 2 3]
 [4 5 6]]
```

これをSVDしてみましょう。

```py
U, s, V = linalg.svd(X)
```

`linalg.svd`は特異値分解に対応して3つの`ndarray`を返してくれます。Uはm行n列、Vはn行n列のユニタリ行列です。真ん中の行列はm行n列の対角行列ですが、対角要素しかないので1次元配列になっています。

```py
print(s) # => [9.508032   0.77286964]
```

さて、特異値分解は、U, S, Vの順番に行列積をとれば元の行列に戻ります。しかし、中央の対角行列が一次元配列になっているため、それを一度行列の形に直してやる必要があります。そのために`linalg.diagsvd`という関数があります。

```py
S = linalg.diagsvd(s, X.shape[0], X.shape[1])
```

これでSは2行3列の対角行列になります。

```py
print(S)
## => 
## [[9.508032   0.         0.        ]
##  [0.         0.77286964 0.        ]]
```

あとは三つの行列積を取れば元の行列に戻るのですが、`numpy.ndarray`の積`*`は要素ごとの積になってしまいます。足を潰す計算である行列積のためには`numpy.ndarray.dot`を使う必要があります。

```py
print(U.dot(S.dot(V)))
## => 
## [[1. 2. 3.]
## [4. 5. 6.]]
```

ちゃんと元に戻りましたが、いちいち`U.dot(S.dot(V))`みたいなメソッド呼び出しではなく、`*`みたいなinfixな演算子を使いたいですね。そのために`numpy.matrix`が用意されました。先ほどの対角行列`S`を、`ndarray`から`matrix`にしてみましょう。

```py
Z = np.matrix(S)
```

`S`は`numpy.ndarray`ですが、`Z`は`numpy.matrix`になります。

```py
type(S) # => numpy.ndarray
type(Z) # => numpy.matrix
```

`numpy.matrix`は、infixな演算子として`*`を使うと行列積になります。また、`numpy.ndarray`と`numpy.matrix`の積も行列積にしてくれます。ここから`U * Z * V`みたいに書くことができます。

```py
print(U * Z * V)
## =>
## [[1. 2. 3.]
## [4. 5. 6.]]
```

便利ですね。

## matrixの問題点

このように`matrix`は便利だったのでわりと使われていたのですが、いくつか問題点がありました。特に、`ndarray`と混ぜて使うと非直観的な振る舞いをする場合があります。先のSOに出ていた例を挙げましょう。

適当な`ndarray`行列`arr`を用意して、それを`matrix`にした`mat`も作りましょう。

```py
arr = np.zeros((3,4))
mat = np.matrix(arr)
```

`arr`も`mat`も3行4列の行列を表現しています。

まず、二つを足してみましょう。

```py
(arr+mat).shape # => (3, 4)
```

同じ形の行列を足しているのだから問題ないですね。次はスライスしてみましょう。それぞれの1行目だけを足してみます。3行4列の1行目だけを足したのだから、1行4列の行列になって欲しいところです。

```py
(arr[0,:] + mat[0,:]).shape # => (1, 4)
```

これも問題ありませんね。

では、行ではなく列の足し算をしてみましょう。それぞれの1列目を足してみます。3行1列になることが期待されます。

```py
(arr[:,0] + mat[:,0]).shape # => (3, 3)
```

3行3列になってしまいました。何が起きたのでしょうか？

これは、`arr[:.0]`の形が`(3,)`であるのに対し、`mat[:,0]`の形が`(3,1)`になったため、[Broadcasting Rules](https://numpy.org/doc/stable/user/basics.broadcasting.html)が適用されたためです。

実際に(3,1)の行列と(3,)の行列を作って足してみましょう。

```py
x = np.ones(3)
y = np.arange(3).reshape(3,1)
x.shape # => (3,)
y.shape # => (3, 1)
```

先ほどと同じ状況になりました。足してみましょう。

```py
(x+y).shape # => (3, 3)
```

(3, 3)になっていますね。ちなみに値はこんな感じになります。

```py
print(x)
## => 
## [1. 1. 1.]
print(y)
## => 
#[[0]
## [1]
## [2]]
print(x+y)
## =>
#[[1. 1. 1.]
## [2. 2. 2.]
## [3. 3. 3.]]
```

また、`matrix`の`*`は行列積ですが、`/`は要素ごとの除算になります。

```py
a = np.matrix([[2,4],[6,8]])
b = np.matrix(([2,2],[2,2]])
print(a)
## => 
## [[2 4]
##  [6 8]]
print(b)
## =>
## [[2 2]
##  [2 2]]
print(a*b)
## => 
## [[12 12]
## [28 28]] ←これはわかる
print(a/b)
## =>
## [[1. 2.]
## [3. 4.]] ← ！！！
```

これも非直観的ですね。

## `@`演算子の導入

さて、我々が`matrix`を使いたかった理由は`ndarray`の行列積がメソッドで使いづらく、行列積を`A * B`のように中置記法で書きたかったからでした。しかし、Python 3.5から、`ndarray`の行列積を表すinfixな演算子`@`が導入されました([PEP 465](https://www.python.org/dev/peps/pep-0465/))。これで、特異値分解と、元に戻す処理は以下のように書けます。

```py
import numpy as np
from scipy import linalg

X = (np.arange(6)+1).reshape(2,3)
print(X)
## =>
## [[1 2 3]
## [4 5 6]]
U, s, V = linalg.svd(X)
S = linalg.diagsvd(s, X.shape[0], X.shape[1])
print(U @ S @ V)
## =>
## [[1. 2. 3.]
## [4. 5. 6.]]
```

楽ちんぽいですね。m行n列で$m<n$の場合は$V$の要素を全ては使わないので、`linalg.diagsvd`ではなく、`np.diag`を使って以下のようにも書けます。

```py
U, s, V = linalg.svd(X)
S = np.diag(s)
print(U @ S @ V[:2,:])
```

特異値分解をして、ランクrの低ランク近似をする場合も、以下のように`np.diag`で書けます。以下は200行50列の行列を特異値分解して低ランク近似するサンプルです。まず、200行50列の行列Xを作りましょう。

```py
m = 200
n = 50
X = np.arange(m*n).reshape(m,n)
print(X)
```

Xはこんな行列です。

```txt
[[   0    1    2 ...   47   48   49]
 [  50   51   52 ...   97   98   99]
 [ 100  101  102 ...  147  148  149]
 ...
 [9850 9851 9852 ... 9897 9898 9899]
 [9900 9901 9902 ... 9947 9948 9949]
 [9950 9951 9952 ... 9997 9998 9999]]
```

これをランクr=10で近似するには以下のようにします。

```py
U, s, V = linalg.svd(X)
S = np.diag(s)
r = 10
Ur = U[:, :r]
Sr = S[:r, :r]
Vr = V[:r, :]
Y = Ur @ Sr @ Vr
print(np.array(Y, np.int))
```

Yは実数ですが、整数化してやるとこんな感じです。

```txt
[[   0    0    1 ...   46   47   48]
 [  50   50   51 ...   97   98   98]
 [ 100  101  102 ...  146  147  149]
 ...
 [9850 9851 9851 ... 9897 9897 9899]
 [9900 9901 9901 ... 9947 9947 9949]
 [9950 9951 9952 ... 9996 9998 9999]]
```

わりといい感じですね。

## まとめ

`numpy.ndarray`の中置記法による行列積を表す`@`演算子の導入により、`numpy.matrix`を使う最大のメリットは消えました。これからは`numpy.ndarray`と`@`を使うようにしましょう。
