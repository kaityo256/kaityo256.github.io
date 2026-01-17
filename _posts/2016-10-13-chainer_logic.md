---
layout: post
title: "Chainer1.16.0での論理演算学習サンプル"
tags: [machine-learning, qiita]
permalink: chainer_logic
---

# Chainer1.16.0での論理演算学習サンプル

## はじめに

Chainerの公式サンプルは、手書き文字認識のMNISTのデータを学習させるものなんだけど、これを実行しても「Chainerがインストールされ、学習もうまくいっているらしい」ということまでしかわからない。僕は特に

* 自分でデータセットを用意する時、どうすれば良いのかわからない
* 学習済みのニューラルネットワークの動作確認方法がわからない

というところで詰まった。Chainerで論理演算を学習させるサンプルはウェブにそれなりにあるのだが、Trainerを使った簡単なサンプルが見つからなかったので、データの作り方と動作確認方法をまとめがてら、Chainer 1.16.0におけるミニマルサンプルを作ってみる。基本的には[公式サンプル](https://github.com/pfnet/chainer/blob/master/examples/mnist/train_mnist.py)を書き換えたもの。

## バージョン確認

Chainerはバージョンが上がるとわりとドラスティックに仕様が変わる。まずは自分のChainerのバージョンを確認するのが良いと思う。そのためにはchainerをimportし、`chainer.__version__`を表示すれば良い。

```shell-session
$ python
>>> import chainer
>>> chainer.__version__
'1.16.0'
```

これは2016年10月13日時点での最新版で、バージョンは1.16.0。

## 必要なモジュールのインポート

まずは必要なモジュールをインポートする。

```py
from __future__ import print_function
import numpy as np
import chainer
import chainer.functions as F
import chainer.links as L
from chainer import training
from chainer.training import extensions
```

これは説明不要だと思う。後でnumpy配列を使うので、npという名前でimportしてある。

## モデルの定義

```py
## Network definition
class MLP(chainer.Chain):
    def __init__(self, n_units, n_out):
      super(MLP, self).__init__(
            l1 = L.Linear(None, n_units),
            l2 = L.Linear(None, n_out)
            )

    def __call__(self, x):
        return self.l2(F.relu(self.l1(x)))
```

n_units個のユニットを2層並べたサンプル。論理演算なので、2入力、2出力。ここは直感的なので、あまり説明はいらないと思うが、Chainerは入力に関しては値を省略することができる。つまり、`L.Linear`の第一引数は`None`にできる。これは最初に入力が与えられた時に自動的に設定される。内部のユニット数も2個で良いのだが、公式にならって引数で指定できるようにしてある。

## データセットの定義

個人的に一番苦労したのが、データセットの定義。[公式のチュートリアル](http://docs.chainer.org/en/stable/tutorial/basic.html)みても、その他のマニュアルを読んでも、データフォーマットの用意の仕方がわからなかった。

結論から言うと、`numpy.float32`のベクトル一つに対して、`numpy.integer`の正解ラベルを組み合わせたものをたくさん用意すれば良い。このデータとラベルを「別々のnumpy.array」として用意し、`chainer.datasets.TupleDataset`に食わせるとデータセットになる。

```py
def make_data(N):
    x = np.empty((N,2),dtype=np.float32)
    y = np.empty(N,dtype=np.int32)
    for i in range(N):
        x1 = i%2
        x2 = (i/2)%2
        x[i][0] = x1
        x[i][1] = x2
        y[i] = x1 ^ x2
    return chainer.datasets.TupleDataset(x,y)
```

これは、N個の学習用のデータを作るサンプル。入力は2次元のベクトルで、そのXORがラベル。`x`は2次元のベクトルがN個ならんだもの。`y`は1次元のベクトル(つまりスカラー)がN個ならんだもの。それぞれ`x[i]`がi番目のデータ、`y[i]`がそのラベルとなっている。こうしてできた`x`と`y`を`chainer.datasets.TupleDataset(x,y)`として食わすと、Trainerに食わすことができる`TupleDataset`のインスタンス(って呼ぶのか知らないが)を得ることができる。

## Model, Updater, Trainerの定義

データセットが準備できたら、Modle, Updater, Trainerを作って `trainer.run`を実行すれば良い。その際に必要なのは、学習用のデータセットと、テスト用のデータセット。ここでは学習用に10000個、テスト用に100個データを用意した。

```py

def main():
    epoch = 20  # エポックの数
    batchsize = 100  # バッチサイズ
    unit = 2  # 内部のユニットの数
    model = L.Classifier(MLP(unit, 2))  # モデルの定義。出力が2値なので2を指定
    optimizer = chainer.optimizers.Adam()  # optimizerとして、Adamを選んで見る。他にもいろいろある。
    optimizer.setup(model) # optimierにモデルを食わす
    test = make_data(100)  # テストデータの準備
    train = make_data(10000)  # 学習用のデータの準備
    # updaterの設定
    train_iter = chainer.iterators.SerialIterator(train, batchsize)  
    test_iter = chainer.iterators.SerialIterator(test, batchsize, repeat=False, shuffle=False)
    updater = training.StandardUpdater(train_iter, optimizer)
    # trainerにupdaterを食わす
    trainer = training.Trainer(updater, (epoch, 'epoch'), out='result')
    # 実行中の経過表示(extend)のところは省略
    # 学習実行
    trainer.run() 
```

実行結果はこんな感じ。

```shell-session
epoch       main/loss   validation/main/loss  main/accuracy  validation/main/accuracy
1           0.743891    0.714015              0.75           0.75                      
2           0.693084    0.673882              0.75           0.75                      
3           0.656514    0.639128              0.692          0.5                       
4           0.622998    0.607376              0.5            0.5                       
5           0.594025    0.580671              0.5            0.5                       
6           0.569119    0.557754              0.6774         0.75                      
7           0.547885    0.538186              0.75           0.75                      
8           0.529843    0.521577              0.75           0.75                      
9           0.514123    0.506609              0.75           0.75                      
10          0.499424    0.491942              0.75           0.75                      
11          0.483807    0.474173              0.75           0.75                      
12          0.461885    0.448061              0.75           0.75                      
13          0.431646    0.413253              0.75           0.75                      
14          0.392344    0.369768              0.9485         1                         
15          0.345819    0.320876              1              1                         
16          0.296394    0.271789              1              1                         
17          0.249191    0.227071              1              1                         
18          0.207544    0.188889              1              1                         
19          0.17294     0.158339              1              1                         
20          0.146227    0.13488               1              1    
```
accuracyが1になっていれば学習に成功している。たまに失敗する。

## 学習済みモデルの確認

`trainer.run()`終了後、学習済みのネットワーク`model`が得られる。`model.predictor`に適当な入力を与えると、出力が返る。入力は、ベクトルのリストだが、複数のデータを一度に渡すことができる。例えば入力を`x`とすると、対応する出力のリストは`model.predictor(x).data`で得られる。そのうち一番値が大きいものが推定されたラベル番号となる。

例えば、XORを学習済みのネットワーク`model`に`[[0,0]]`を与えてみる。入力をセットで与えなければならないので、一つだけ渡したい場合でもリストのリストにしなければならないことに注意。また、numpyのarray形式で渡す必要がある。

```py
    x = np.array([[0,0]],dtype=np.float32)
    print (model.predictor(x).data)
```
出力は`[[ 0.84577101 -0.84577101]]`となる。インデックス0の方が大きいので、このネットワークは[0,0]という入力に0というラベルを推定したことになる。同様に、`[[1,0]]`を食わせてみると、`[[-1.90438604  1.27257276]]`が出力され、1を推定したことがわかる。ラベル番号を得たければ、この出力をnumpy.argmaxに食わせれば良い。4通りの入力全てにたいして出力を表示するコードはこんな感じになる。

```py
    # Results
    x = np.array([[0,0],[0,1],[1,0],[1,1]],dtype=np.float32)
    y = model.predictor(x).data
    for i in range(4):
        print (x[i],np.argmax(y[i]),y[i])
```

入力を`x`として渡し、出力を`y`として得ている。それを、入力、推定されたラベル、ネットワークの生出力の順番で出力した結果がこんな感じ。

```shell-session
[ 0.  0.] 0 [ 0.84577101 -0.84577101]
[ 0.  1.] 1 [ 0.62727594  2.37814951]
[ 1.  0.] 1 [-1.90438604  1.27257276]
[ 1.  1.] 0 [ 0.84530455 -0.84390032]
```

今回のケースでは正しくXORが学習できたが、ユニット数が2だと、局所解に陥る確率が高い。ユニット数を増やすと安定する。

## ソース

ソース全体はこんな感じ。

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
        y[i] = x1 ^ x2
    return chainer.datasets.TupleDataset(x,y)

def main():
    epoch = 20
    batchsize = 100
    unit = 2
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

    # Results
    x = np.array([[0,0],[0,1],[1,0],[1,1]],dtype=np.float32)
    y = model.predictor(x).data
    for i in range(4):
        print (x[i],np.argmax(y[i]),y[i])

if __name__ == '__main__':
    main()
```

`make_data`の論理演算を変えることで、ANDやOR、NANDとかにできる。

```shell-session
## ANDの例  y[i] = x1 & x2
[ 0.  0.] 0 [ 2.72191048 -2.3430717 ]
[ 0.  1.] 0 [ 1.0146333  -1.01463544]
[ 1.  0.] 0 [ 2.20992565 -1.92360115]
[ 1.  1.] 1 [-1.96057844  1.35690534]

## ORの例 y[i] = x1 | x2
[ 0.  0.] 0 [ 1.05322969 -1.0532217 ]
[ 0.  1.] 1 [-2.25476956  2.63923001]
[ 1.  0.] 1 [-1.53915739  1.80616784]
[ 1.  1.] 1 [-4.88101959  5.49222422]

## NANDの例 y[i] = not (x1 & x2)
[ 0.  0.] 1 [-2.58811712  3.68601775]
[ 0.  1.] 1 [-1.52152014  2.16157627]
[ 1.  0.] 1 [-1.55502534  2.04170036]
[ 1.  1.] 0 [ 1.87208712 -1.60791421]
```

## おわりに

Chainerは機械学習を高度に抽象化する。特にTrainerにより学習のところも隠蔽されたため、コード量は少なくて済むが、その分裏で何をやってるかの理解が難しい印象がある。あと、公式チュートリアルに「Prepare your own dataset」みたいなのがあると良かったかな。
