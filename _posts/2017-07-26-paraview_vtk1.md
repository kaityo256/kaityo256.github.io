---
layout: post
title: "ParaViewでVTKレガシーフォーマットを使う その1"
tags: [programming, physics, qiita]
permalink: paraview_vtk1
---

# ParaViewでVTKレガシーフォーマットを使う その2


## はじめに

[前回の記事](http://qiita.com/kaityo256/items/661833e9e2bfbac31d4b)では、単純な構造格子とスカラー場を用いたボリュームレンダリングを試した。今回は構造格子、非構造格子におけるベクトル場の可視化をしてみる。

ソースは
https://github.com/kaityo256/paraview-sample
においてある。


## 構造格子におけるベクトル場

構造格子におけるベクトル場の表現は簡単で、スカラーと同じように単純にデータを3つずつ並べれば良い。データフォーマットはこんな感じになる。

```
VECTORS velocity float
x1 y1 z1
x2 y2 z2
x3 y3 z3
...
```

このデータをベクトル場だと思って可視化するのだが、単純に矢印だけ表示しても(特に3Dでは)非常に見づらい。そこで、各格子点にスカラー量も定義しておくと良い。スカラー場とベクトル場は単純に並べてかける。

```
VECTORS nameofvector float
x1 y1 z1
x2 y2 z2
x3 y3 z3
...


SCALARS nameofscalar float
LOOKUP_TABLE default
s1
s2
s3
...
```

前の記事で書き忘れたけれど、スカラー場の場合にはルックアップテーブルを指定しなければならない。使わない場合には「default」を指定する。

これもサンプルを見たほうが早いと思う。こんなスクリプトを用意する。

https://github.com/kaityo256/paraview-sample/tree/master/glyph


```rb
grid = 21
c = grid.to_f/2
points = grid**3

VectorField = Struct.new(:x, :y, :z)
vf = Array.new(points) do |i|
  ix = i % grid
  iy = (i/grid) % grid
  iz = i/grid/grid
  x = (ix.to_f/grid+0.25)*2.0*Math::PI
  y = (iy.to_f/grid+0.25)*2.0*Math::PI
  z = (iz.to_f/grid+0.25)*2.0*Math::PI
  vx = Math::cos(x) * Math::sin(y) * Math::cos(z)
  vy = -Math::sin(x) * Math::cos(y) * Math::cos(z)
  vz = 0.0
  VectorField.new(vx,vy,vz)
end

puts <<"EOS"
## vtk DataFile Version 2.0
test
ASCII
DATASET STRUCTURED_POINTS
DIMENSIONS #{grid} #{grid} #{grid}
ORIGIN 0.0 0.0 0.0
SPACING 1.0 1.0 1.0

POINT_DATA #{points}
VECTORS velocity float"
EOS
vf.each do |v|
  puts "#{v.x} #{v.y} #{v.z}"
end

puts "SCALARS angle float"
puts "LOOKUP_TABLE default"

vf.each do |v|
  puts "#{Math.atan2(v.y, v.x)}"
end
```

これは、三次元のテイラーグリーン渦(Taylor–Green vortex)と呼ばれる流れである。詳細は[Wikipedia](https://en.wikipedia.org/wiki/Taylor%E2%80%93Green_vortex)を参照。最初に「velocity」という名前でベクトル場を吐いているが、次に「angle」という名前のスカラー場も出力している。

このスクリプトの出力結果を`tgv.vtk`という名前で保存して、ParaViewで読み込む。Applyしてから、Filtersから「Glyph」を選ぶか、上の方にある

![image0.png](/assets/images/paraview_vtk1/image0.png)

アイコンを押す。そして、

* Active Attributesの、Scalarsがangleに、Vectorsがvelocityに
* ScalingのScale Modeをvectorに

なっていることを確認してからApplyを押す。

![image1.png](/assets/images/paraview_vtk1/image1.png)

するとこんな絵になるはず。

![image2.png](/assets/images/paraview_vtk1/image2.png)

マウスでぐりぐりしてみるとちょっと楽しい。

## 非構造格子におけるベクトル場

構造格子の場合は「直方体の三辺の要素数」及び「単位直方体のサイズ(SPACING)」を指定すればそれで格子点が定義できた。しかし、分子動力学法の結果の可視化や、物体表面の可視化など、非構造格子を使いたい場合もあるだろう。その場合は非構造格子(Unstructured grid)を用いる。

非構造格子の定義は以下のようにする。

```
DATASET UNSTRUCTURED_GRID
POINTS NumberOfPoints
x1 y1 z1
x2 y2 z2
x3 y3 z3
...
```

データセットは非構造格子(UNSTRUCTURED_GRID)であり、何点あるかを指定した後は、ベクトル場と同様に(x,y,z)座標をずらずら並べるだけで良い。

データの与え方は同じで、格子点を定義した順番にその値が割り当てられていく。

簡単な例として、球表面に回転するようなベクトル場を描いてみる。単純なベクトル場だけだとつまらないので、z座標で色をつけることにしよう。スクリプトはこんな感じ。

https://github.com/kaityo256/paraview-sample/tree/master/unstructured


```rb
Point = Struct.new(:x, :y, :z)

vp = Array.new(10000) do 
  z = rand()*2-1.0
  s = rand()*2.0*Math::PI
  x = (1-z**2)**0.5*Math::cos(s)
  y = (1-z**2)**0.5*Math::sin(s)
  Point.new(x,y,z)
end

puts "# vtk DataFile Version 2.0"
puts "test"
puts "ASCII"
puts "DATASET UNSTRUCTURED_GRID"
puts "POINTS #{vp.size} float"
vp.each do |v|
  puts "#{v.x} #{v.y} #{v.z}"
end

puts "POINT_DATA #{vp.size}"
puts "VECTORS vector float"
vp.each do |v|
  puts "#{v.y} #{-v.x} #{0}"
end

puts "SCALARS z float"
puts "LOOKUP_TABLE defalut"
vp.each do |v|
  puts "#{v.z}"
end
```

ランダムに球表面に点をばらまいて、z軸を中心に球が回転しているような速度場を与え、後で色つけ用にスカラー場としてz座標を保存してある。これを先程と同様な方法で可視化するとこんな感じになる。

![image3.png](/assets/images/paraview_vtk1/image3.png)

すごく短いスクリプトで作ったわりにはまぁまぁな感じですね。

## まとめ

構造格子、非構造格子におけるベクトル場の可視化をしてみた。VTKレガシーフォーマットは理解しちゃうと簡単なんだけど、フォーマットの仕様だけ読んでもわかりづらい。こうやってVTKファイルを吐くスクリプトを見たほうが理解しやすいと思う。
