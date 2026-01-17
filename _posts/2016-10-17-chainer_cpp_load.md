---
layout: post
title: "Chainerで学習したモデルをC++で読み込む"
tags: [programming, machine-learning, qiita]
permalink: chainer_cpp_load
---

# Chainerで学習したモデルをC++で読み込む

## はじめに

Chainerで学習させたモデルをC++で読み込んで使いたい。しかし、ChainerはPythonライブラリであるため、なんらかのデータ変換が必要となる。普通にChainerのモデルを保存する時は`chainer.serializers.save_npz`を使うと思う。これはnumpyのnpz形式で、実体はZipアーカイブなので、それをそのままC++から読み込もうとすると、zlibを使ってzipを解析して・・・となると思うが、これはとても面倒くさい。PythonフレンドリーなデータフォーマットをC++から読み込むより、C++フレンドリーなデータフォーマットをPython側から書き出してしまう方が楽だろう。というわけで、

1. 学習させたモデルを`chainer.serializers.save_npz`で保存する
2. 保存したデータをPythonスクリプトで読み込んで、生floatのバイナリで保存する
3. C++で生floatのバイナリを読み込んで、実際に動作を確認する

という方針でいく。

## 学習＋モデルの保存

まずは簡単な例として、論理演算を学習させる。2入力2出力の、論理積(AND)を学習させ、それをsave_npzで、`and.model`として保存する。後の一般化のため、内部のユニット数は3にしてある[^3]。ソースはこんな感じ。

```py
from __future__ import print_function
import numpy as np
import chainer
import chainer.functions as F
import chainer.links as L
from chainer import training
from chainer.training import extensions

## Network definition
class MLP(chainer.Chain):
    def __init__(self, n_units, n_out):
      super(MLP, self).__init__(
            l1 = L.Linear(None, n_units), 
            l2 = L.Linear(None, n_out)
            )

    def __call__(self, x):
        return self.l2(F.relu(self.l1(x)))

## Data Preparation
def make_data(N):
    x = np.empty((N,2),dtype=np.float32)
    y = np.empty(N,dtype=np.int32)
    for i in range(N):
        x1 = i%2
        x2 = (i/2)%2
        x[i][0] = x1
        x[i][1] = x2
        y[i] =x1 & x2
    return chainer.datasets.TupleDataset(x,y)

def main():
    epoch = 20
    batchsize = 100
    unit = 3
    model = L.Classifier(MLP(unit, 2))
    optimizer = chainer.optimizers.Adam()
    optimizer.setup(model)
    test = make_data(100)
    train = make_data(10000)
    train_iter = chainer.iterators.SerialIterator(train, batchsize)
    test_iter = chainer.iterators.SerialIterator(test, batchsize, repeat=False, shuffle=False)
    updater = training.StandardUpdater(train_iter, optimizer)
    trainer = training.Trainer(updater, (epoch, 'epoch'), out='result')

    trainer.extend(extensions.Evaluator(test_iter, model))
    trainer.extend(extensions.dump_graph('main/loss'))
    trainer.extend(extensions.snapshot(), trigger=(epoch, 'epoch'))
    trainer.extend(extensions.LogReport())
    trainer.extend(extensions.PrintReport(
                ['epoch', 'main/loss', 'validation/main/loss',
                'main/accuracy', 'validation/main/accuracy']))
    trainer.extend(extensions.ProgressBar())

    # Training
    trainer.run()
    chainer.serializers.save_npz('and.model',model)

    # Results
    x = np.array([[0,0],[0,1],[1,0],[1,1]],dtype=np.float32)
    y = model.predictor(x).data
    for i in range(4):
        print (x[i],np.argmax(y[i]),y[i])

if __name__ == '__main__':
    main()
```

実行するとこんな出力になり、and.modelが保存される。無駄にepochが大きかったりするが気にしないことにする。

```shell-session
epoch       main/loss   validation/main/loss  main/accuracy  validation/main/accuracy
1           0.659301    0.609888              0.6771         0.75                      
2           0.573191    0.535238              0.9976         1                         
3           0.495501    0.453446              1              1                         
4           0.413051    0.372437              1              1                         
5           0.335372    0.299022              1              1                         
6           0.267259    0.236726              1              1                         
7           0.210785    0.186187              1              1                         
8           0.165747    0.146453              1              1                         
9           0.130642    0.115821              1              1                         
10          0.103705    0.0923906             1              1                         
11          0.0831349   0.0744629             1              1                         
12          0.0673614   0.0607088             1              1                         
13          0.0551783   0.050024              1              1                         
14          0.0456828   0.0416145             1              1                         
15          0.0381965   0.0349596             1              1                         
16          0.0322445   0.0296493             1              1                         
17          0.0274508   0.0253534             1              1                         
18          0.0235528   0.0218315             1              1                         
19          0.020354    0.0189316             1              1                         
20          0.0177069   0.0165223             1              1                         
[ 0.  0.] 0 [ 4.44186878 -2.4494648 ]
[ 0.  1.] 0 [ 3.35240507 -0.62914503]
[ 1.  0.] 0 [ 2.42167044 -1.39461792]
[ 1.  1.] 1 [-0.70726597  2.97649908]
```

正しくANDが学習された。最後の出力は、一番左が入力、次が出力、最後がニューラルネットの生の出力。ニューラルネットの生の出力(長さ2のベクトル)のargmaxが出力のラベルとなる。

出力されたand.modelを確認する。

```shell-session
$ zipinfo and.model
Archive:  and.model
Zip file size: 815 bytes, number of entries: 4
-rw-------  2.0 unx      104 b- defN 16-Oct-17 18:33 predictor/l2/W.npy
-rw-------  2.0 unx       92 b- defN 16-Oct-17 18:33 predictor/l1/b.npy
-rw-------  2.0 unx       88 b- defN 16-Oct-17 18:33 predictor/l2/b.npy
-rw-------  2.0 unx      104 b- defN 16-Oct-17 18:33 predictor/l1/W.npy
4 files, 388 bytes uncompressed, 345 bytes compressed:  11.1%
```

modelのpredicorのl1,l2それぞれについて、W.npyとb.npyが保存されていることがわかる。

## C++向けにエクスポート

出力されたand.modelを読み込んで、出力するpythonスクリプトを書く[^1]。

まず、モデルを読み込む。これは先程のスクリプト同様にモデルを定義して、

```py
unit = 3
model = L.Classifier(MLP(unit, 2))
chainer.serializers.load_npz('and.model', model)
```

とすれば良い。各データ、例えばL1のWには`model.predictor.l1.W.data`としてアクセスできる。これは2×3の行列になっているので、一次元ベクトルにreshapeして、bytearrayにstruct.packを使って足していく。

```py
d = bytearray()
for v in model.predictor.l1.W.data.reshape(2*unit):
    d += struct.pack('f',v)
```

これを`L1.b`や`L2.W`などについて繰り返した後、`and.dat`という名前でファイルに保存する。

```py
open("and.dat",'w').write(d);
```

ついでに正しく読み込めたかどうかのチェックもしておこう。全てをまとめたスクリプトはこんな感じ。

```py
from __future__ import print_function
import struct
import numpy as np
import chainer
import chainer.functions as F
import chainer.links as L
from chainer import training
from chainer.training import extensions

## Network definition
class MLP(chainer.Chain):
    def __init__(self, n_units, n_out):
      super(MLP, self).__init__(
            l1 = L.Linear(None, n_units),
            l2 = L.Linear(None, n_out)
            )

    def __call__(self, x):
        return self.l2(F.relu(self.l1(x)))

unit = 3
model = L.Classifier(MLP(unit, 2))
chainer.serializers.load_npz('and.model', model)

d = bytearray()

for v in model.predictor.l1.W.data.reshape(2*unit):
    d += struct.pack('f',v)

for v in model.predictor.l1.b.data:
    d += struct.pack('f',v)

for v in model.predictor.l2.W.data.reshape(unit*2):
    d += struct.pack('f',v)

for v in model.predictor.l2.b.data:
    d += struct.pack('f',v)

open("and.dat",'w').write(d);

## Results
x = np.array([[0,0],[0,1],[1,0],[1,1]],dtype=np.float32)
y = model.predictor(x).data
for i in range(4):
    print (x[i],np.argmax(y[i]),y[i])
```

モデルの定義やunitなどの定数が冗長なので、気になる人はmodule化したりして共通化すればいいと思う。

実行結果はこんな感じ。

```shell-session
$ python export.py 
[ 0.  0.] 0 [ 4.44186878 -2.4494648 ]
[ 0.  1.] 0 [ 3.35240507 -0.62914503]
[ 1.  0.] 0 [ 2.42167044 -1.39461792]
[ 1.  1.] 1 [-0.70726597  2.97649908]
```

学習直後のデータを同じ結果になっている。

## C++からの読み込み

生バイナリが保存されているので、それをそのまま読み込めば良い。何使っても良いが、`std::ifstream`の`read`使うのが素直かな。Wが行列、bがベクトルだが、どちらも一次元の`float`の`std::vector`として実装してしまおう。

各層でやっていることは単純に行列の掛け算で、入力をx、内部行列をW、出力をyとすると、単純に

$$
y = W x + b
$$

となっているので、それをそのまま実装すれば良い。ただし、L1では最後にReLUをかけている。ReLUというのは、要するに入力が負なら0、そうでなければそのまま出力するもので、数式で書けば

$$
f(x) := \max(x,0)
$$

となるし、C++なら三項演算子で、

```cpp
  float relu(float x) {
    return (x > 0) ? x : 0;
  }
```
とか書けばいいんじゃないでしょうか。max使ってもいいけど。

というわけで、Linkクラス[^2]を作ってみる。クラスとしては

* 入力の次元、出力の次元をコンストラクタで受け取り、Wとbのサイズを決定する。
* readでファイルからデータを受け取る
* getが入力を受け取り、出力を返す
* get_reluは出力をReLUで修正したものを返す

といった仕様にする。

長いがソースをそのまま掲載する。

```cpp
#include <iostream>
#include <fstream>
#include <vector>

typedef std::vector<float> vf;

class Link {
private:
  vf W;
  vf b;
  float relu(float x) {
    return (x > 0) ? x : 0;
  }
  const int n_in, n_out;
public:
  Link(int in, int out) : n_in(in), n_out(out) {
    W.resize(n_in * n_out);
    b.resize(n_out);
  }
  void read(std::ifstream &ifs) {
    ifs.read((char*)W.data(), sizeof(float)*n_in * n_out);
    ifs.read((char*)b.data(), sizeof(float)*n_out);
  }

  vf get(vf x) {
    vf y(n_out);
    for (int i = 0; i < n_out; i++) {
      y[i] = 0.0;
      for (int j = 0; j < n_in; j++) {
        y[i] += W[i * n_in + j] * x[j];
      }
      y[i] += b[i];
    }
    return y;
  }

  vf get_relu(vf x) {
    vf y = get(x);
    for (int i = 0; i < n_out; i++) {
      y[i] = relu(y[i]);
    }
    return y;
  }
};

int
argmax(vf &v) {
  float max = v[0];
  int max_i = 0;
  for (int i = 1; i < v.size(); i++) {
    if (max < v[i]) {
      max_i = i;
      max = v[i];
    }
  }
  return max_i;
}

int
main(void) {
  const int n_in = 2;
  const int n_units = 3;
  const int n_out = 2;
  std::ifstream ifs("and.dat");
  Link l1(n_in, n_units), l2(n_units, n_out);
  l1.read(ifs);
  l2.read(ifs);
  float x[4][2] = { {0, 0}, {0, 1}, {1, 0}, {1, 1} };
  for (int i = 0; i < 4; i++) {
    vf x2;
    x2.push_back(x[i][0]);
    x2.push_back(x[i][1]);
    vf y = l2.get(l1.get_relu(x2));
    printf("[%f %f] %d: [%f %f]\n", x2[0], x2[1], argmax(y), y[0], y[1]);
  }
}
```

動作確認してみよう。`and.dat`が存在する状況で以下を実行する。

```shell-session
$ g++ import.cpp
$ ./a.out
[0.000000 0.000000] 0: [4.441869 -2.449465]
[0.000000 1.000000] 0: [3.352405 -0.629145]
[1.000000 0.000000] 0: [2.421670 -1.394618]
[1.000000 1.000000] 1: [-0.707266 2.976499]
```

入力に対してちゃんと論理積を返しており、かつニューラルネットの生の出力(例えば[0 0]の入力に対する重み[4.441869 -2.449465])も正しいことから、論理積を学習したモデルが正しくインポートされたことがわかる。

## まとめ

Chainerで学習したモデルを、Pythonで生バイナリとして保存し、C++で読み込み、動作確認をした。本当はhdf5とかnpzとかをちゃんと解析して読み込むプログラムを組んだほうが一般的なのだろうが、zlibをちゃんと解析するとか面倒だし、多分Python側で生データ吐くコードの方がZipアーカイブに対応したC++コード書くより簡単なので、これで良いことにする。

[^3]: 単にANDを学習させるだけなら2入力、内部ユニット数2、2出力で良いのだが、これだと行列の掛け算で行と列を間違えていても気が付かないので、ユニット数を3にしてみた。こうすると、L1のWは3行2列、L2のWは2行3列になる。
[^1]: 学習スクリプトにそのまま組み込まなかったのは、テストのたびに学習させなおすことになるのが面倒だったのと、シリアライザで保存したモデル読み込みのテストを兼ねてるためである。
[^2]: この名前が適切かあんまり自信が無い。
