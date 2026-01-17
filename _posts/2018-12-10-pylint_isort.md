---
layout: post
title: "pylintとisortのケンカを仲裁する"
tags: [programming, devtools, qiita]
permalink: pylint_isort
---

# pylintとisortのケンカを仲裁する

## TL;DR

* isortとpylintのデフォルトの動作では、importの順番に意見の食い違いがある
* その場合は`isort -fss`とすると、isort側がpylint型に歩み寄る
* この動作をデフォルトにしたければ`.isort.cfg`に以下のように書く

```
[settings]
force_sort_within_sections=True
```

確認したバージョン

* pylint 2.1.1 (Python 3.7.0)
* isort 4.3.4

## 何が問題か

pylintはPythonコードがPEP8に従っているか確認するチェッカで、isortはPEP8に従ってimportの順番を並び替えてくれるプログラムだが、その意見が食い違う場合がある。

以下の３つのスクリプトを同じディレクトリに置く。

```sh
$ tree .
.
├── main.py
├── mod1.py
└── mod2.py

0 directories, 3 files
```

```py
hoge1 = 1
  

def func1():
    print("mod1.func1")
```

```py
hoge2 = 2


def func2():
    print("mod2.func2")
```

```py
"""Pylint and isort compatibility"""
import mod1
from mod1 import func1
import mod2
from mod2 import func2

print(mod1.hoge1)
print(mod2.hoge2)
func1()
func2()
```

このとき、`main.py`は、pylintで文句を言われない。

```sh
$ pylint main.py

--------------------------------------------------------------------
Your code has been rated at 10.00/10 (previous run: 10.00/10, +0.00)
```

しかし、isortは文句を言う。

```sh
$ isort -c main.py
ERROR: /path/to/main.py Imports are incorrectly sorted.
```

では、`isort`を実行して、isort好みに並び替えてみる。

```sh
$ isort main.py
Fixing /path/to/main.py
```

`main.py`は最初に`import`文、次が`from hoge import fuga`、という順番になる。

```py
"""Pylint and isort compatibility"""
import mod1
import mod2
from mod1 import func1
from mod2 import func2

print(mod1.hoge1)
print(mod2.hoge2)
func1()
func2()
```

これにはpylintが文句を言う。

```
************* Module main
main.py:4:0: C0412: Imports from package mod1 are not grouped (ungrouped-imports)
main.py:5:0: C0412: Imports from package mod2 are not grouped (ungrouped-imports)

-------------------------------------------------------------------
Your code has been rated at 7.50/10 (previous run: 10.00/10, -2.50)
```

つまり、pylintはこうなっていて欲しい。

```py
import mod1
from mod1 import func1
import mod2
from mod2 import func2
```

しかし、isortはこうなっていて欲しい。

```py
import mod1
import mod2
from mod1 import func1
from mod2 import func2
```

どちらがPEP8準拠なのか？　それを調べるため、我々は[PEP8に飛んだ](https://www.python.org/dev/peps/pep-0008/#imports)。・・・が、上記のどちらがPEP8準拠なのか、判断できなかった。

これは、例えばVimで[ALE](https://github.com/w0rp/ale)を使っており、linterとしてpylint、fixerとしてisortを指定すると問題になる。保存するたびにisortが走り、その度にpylintが文句を言うからだ。

## 解決策

isortには`-fss`というオプションがある。これは`--force-sort-within-sections`の短縮形で、こういう意味がある。

>Force imports to be sorted by module, independent of import_type

つまり、import_typeではなく、モジュール名を主キーとしてソートせよ、ということ。これにより、`isort -fss`は以下を吐き出す。

```py
import mod1
from mod1 import func1
import mod2
from mod2 import func2
```

これはpylintは文句を言わない。


## 他の例

例えば、ChainerのMNISTを扱うサンプル[train_mnist.py](https://github.com/chainer/chainer/blob/master/examples/mnist/train_mnist.py)の冒頭部分

```train_minist.py
#!/usr/bin/env python
import argparse
import re

import numpy

import chainer
import chainer.functions as F
import chainer.links as L
from chainer import training
from chainer.training import extensions
import chainerx
```

も、そのままisortをかけると

```train_minist.py
#!/usr/bin/env python
import argparse
import re

import chainer
import chainer.functions as F
import chainer.links as L
import numpy
from chainer import training
from chainer.training import extensions

import chainerx
```

となってしまい、pylintが文句を言う。`isort -fss`をかけると

```train_mnist.py
#!/usr/bin/env python
import argparse
import re

import chainer
from chainer import training
import chainer.functions as F
import chainer.links as L
from chainer.training import extensions
import numpy

import chainerx
```

となり、オリジナルとはちょっと違うが少なくともpylintは文句を言わない。

## まとめ

エディタがVimかどうかによらず、Pythonを組んでる人でautopep8だのpylintだのisortだので自動チェック、自動整形している人は多いと思う。調べた範囲ではpylintに歩み寄りのオプションは見つからなかったので、isortが歩み寄る必要がある。こんな簡単なことの解決に結構時間がかかってしまった。将来、pylintとisortの意見が食い違って困った人がこの記事にたどり着けば幸いである。
