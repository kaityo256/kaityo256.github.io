---
layout: post
title: "Google Colaboratory上でアニメーションを表示する"
tags: [programming, machine-learning, qiita]
permalink: colab_animation
---

# Google Colaboratory上でアニメーションを表示する

## TL;DR

Google Colaboratory上で何かイメージを描画して、それをアニメーションにするなら、ファイルを連番で吐いてapngにしてしまうのが楽ちん。

## はじめに

Google Colab上で何か計算して、その計算結果をアニメーションとして見せたい。普通にやるならmatplotlibで可視化するのだろうが、これをColab上でアニメーションにするのはわりと面倒くさい。そもそもColab上で画像を表示するのも、[一度ファイルに吐いてから表示する](https://qiita.com/kaityo256/items/ce34f412ceec1b72755d)のが楽だったりする。

で、アニメーションについてもいろいろ試行錯誤したのだが、結局のところ一度連番ファイルで吐いてしまってから、アニメPNG(APNG)にしてしまうのが一番楽だった。

## サンプルコード

## APNGのインストール

Google Colabの最初のセルで`APNG`をインストールする。

```py
!pip install APNG
```

おそらく問題なくインストールされて「Successfully installed APNG-0.3.3」とか表示されるはず。

## 連番ファイルの出力

なんでもよいので、連番のPNGファイルを吐くコードを書こう。以下は円周上を円が周回するだけのアニメーション。

```py
from apng import APNG
from math import cos, pi, sin
from PIL import Image, ImageDraw
import IPython

def save(index, frames):
    filename = "file%02d.png" % index
    im = Image.new("RGB", (100, 100), (255, 255, 255))
    draw = ImageDraw.Draw(im)
    x = 30*cos(2*pi*index/frames) + 50
    y = 30*sin(2*pi*index/frames) + 50
    draw.ellipse((20,20,80,80),outline=(0,0,0))
    draw.ellipse((x-5, y-5, x+5, y+5), fill=(0, 0, 255))
    im.save(filename)
    return filename
```

後で`APNG`にわたすので、ファイル名を返している。

## APNGに渡してアニメーションを作成

`APNG`は、ファイルリストを食わすとAPNGにしてくれるメソッド`from_files`があるので、それにファイルリストを食わせて、`save`で適当なファイル名で保存する。

保存したファイルは`IPython.display.Image`でそのまま表示できる。

```py
files = []
frames = 50
for i in range(frames):
    files.append(save(i, frames))
APNG.from_files(files, delay=100).save("animation.png")
IPython.display.Image("animation.png")
```

実行結果はこんな感じ。

![image0.gif](/assets/images/colab_animation/image0.gif)

セルを実行したら、無事にGoogle Colab上でアニメーションが表示された。

## まとめ

Google Colab上でアニメーションを表示させる方法を紹介した。数値計算のシミュレーションや、何か動くものの可視化なんかをする場合、Matplotlibで頑張るより、PILで連番png吐いてAPNG作っちゃう方が楽だと思う。
