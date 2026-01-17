---
layout: post
title: "CentOSでmatplotlibが「いまAggを使ってるからfigureを出せないよ」と怒られた時の対応"
tags: [programming, linux, qiita]
permalink: matplotlib_agg
---

# CentOSでmatplotlibが「いまAggを使ってるからfigureを出せないよ」と怒られた時の対応

## 現象

CentOSでこんなコードを実行する。

```py
import matplotlib.pyplot as plt
plt.plot([1,2,3])
plt.show()
```

するとこんなエラーが出る。

```sh
$ python3 test.py
test.py:3: UserWarning: Matplotlib is currently using agg, which is a non-GUI backend, so cannot show the figure.
  plt.show()
```

## 対策

tkinterをインストールする。

```sh
sudo yum install python3-tkinter
```

すると、以後はちゃんとグラフが表示される。

```sh
$ python3 test.py
```

![image0.png](/assets/images/matplotlib_agg/image0.png)

## 原因

CentOSのPython3は、デフォルトでnon-GUIのAggしか入っていない。tkinterを入れてやると、GUI-backendの`TkAgg`が有効になり、それを使ってくれるようになる。

ちなみに、記事によっては

```py
import matplotlib
matplotlib.use('TkAgg')
```

のように、明示的に`TkAgg`を指定する必要があると書いてあったりするが、僕の環境(CentOS Linux release 7.8.2003)では、`python3-tkinter`を入れるだけで(Xが有効なら)自動的に使ってくれるようだ。
