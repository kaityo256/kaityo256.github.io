---
layout: post
title: 制限ボルツマンマシンを触ってみる
tags: [machine-learning, programming]
permalink: simple_rbm_introduction
---

## はじめに

制限ボルツマンマシン(Restricted Boltzmann Machine, RBM)という機械学習モデルを簡単に扱えるPythonライブラリを開発、公開しました。開発者は主に小林さんで、MITライセンスで利用可能です。

[github.com/watanabe-appi/simple_rbm](https://github.com/watanabe-appi/simple_rbm)

ローカルでも、Google Colabでも簡単に使えます。また、CuPyが使える環境なら、GPGPUによる加速もできます。以下ではこのライブラリの使い方を紹介します。

## 制限ボルツマンマシンとは

もともと、HintonとSejnowskiらによってボルツマンマシン(Boltzmann Machine)という連想記憶ネットワークが提案されました。このモデルはネットワーク上にスピンが配置されたような物理系に対応しており、定義されたエネルギーとボルツマン重みに従って状態を出現させます。うまくネットワークの重みを学習させることで、様々なデータを覚えさせることができます。しかし、ボルツマンマシンは理論的には興味深いものの、学習コストが高く、実用的ではありませんでした。そこで提案されたのが制限ボルツマンマシン(Restricted Boltzmann Machine, RBM)です。このモデルはユニットを「可視層」と「隠れ層」と呼ばれる2つのグループに分け、同じグループに属すユニット間には相互作用を結ばないことで、効率的に学習できるようになりました。

RBMは性能面では同規模のディープニューラルネットワークに及ばないことが多いものの、理論的には興味深く、物理的な背景を持つために研究対象として選ばれることが多いです。

![RBM](/assets/images/simple_rbm_introduction/rbm.png)

RBMはネットワーク上にスピンが配置されたようなモデルとなっており、ネットワークのノードに「そのスピンの上の向きやすさ」を指定するバイアスが、エッジに「このエッジで繋がれたスピンが同じ向きを向きやすいか」を指定する重みが定義されています。RBMによる学習とは、RBMが所望の動作をするようにこのバイアスや重みの値を最適化することです。

RBMは、あらかじめ与えられたデータ(例えば画像)を覚えることができます。そして、学習済みのRBMは、入力された画像を再構成することができます。これは、例えば我々が何か文字を見せられてから隠され、「さっきの紙に書かれていた文字を書いて」と言われた時、全く同じ形ではないが、同じ文字を書くことができるのと似ています。

![Reconstruct](/assets/images/simple_rbm_introduction/reconstruct.png)

この時、我々は「9」描かれた画像を見て、これが「数字の9」であると情報を圧縮し、「数字の9」という抽象的な情報からまた「数字の9」という文字を再構成したことになります。RBMも似たようなことができます。以下では、手書き数字データセットであるMNISTを題材に、RBMの学習と画像の再構成をしてみます。

## Google ColabでのRBMライブラリの使い方

ローカルでも使えますが、Google Colabを使うのが簡単だと思いますので、そちらで試してみましょう。Google Colabで新しいノートブックを開いてください。

### ライブラリのインストール

最初のセルでRBMライブラリをpipを使ってインストールします、

```py
!pip install "git+https://github.com/watanabe-appi/simple_rbm.git"
```

### 必要なライブラリのインポート

必要なライブラリをまとめてインポートしましょう。

```py
import tensorflow as tf
from PIL import Image
from simple_rbm import RBM
import numpy as np
import IPython
import matplotlib.pyplot as plt
```

先程ライブラリをインストールしたことで`RBM`パッケージから`simple_rbm`がインポートできるようになります。

### RBMの初期化

RBMを初期化します。必要な情報は可視層のユニット数と隠れ層のユニット数です。MNISTは28x28のデータなので、可視層の数はそれに合わせましょう。隠れ層は可視層より少なければなんでも良いですが、たとえば64にしてみましょう。

```py
rbm = RBM(visible_num=28 * 28, hidden_num=64)
```

### データの準備

MNISTのデータを準備します。RBMは教師なし学習をするモデルなので、画像データのみを取得し、ラベルは使いません。
取得したデータは0.0から1.0に規格化しておきます。

```py
(x_train, _), (x_test, _) = tf.keras.datasets.mnist.load_data()
x_train = np.array(x_train) / 255
x_test = np.array(x_test) / 255
x_train = x_train.reshape(-1, 28 * 28).astype(np.float32)
x_test = x_test.reshape(-1, 28 * 28).astype(np.float32)
```

`x_train`がトレーニング用データ、`x_test`がテスト用のデータです。

### RBMの学習

RBMを学習します。多くの類似のフレームワーク同様、データセットを渡して`fit`を呼ぶだけです。エポック数やバッチサイズも指定します。

```py
rbm.fit(x_train, epochs=10, batch_size=1000)
```

以下のような出力がされます。

```txt
# Computation will proceed on the CPU.
Epoch [1/10], KL Divergence: 0.3689
Epoch [2/10], KL Divergence: 0.2504
Epoch [3/10], KL Divergence: 0.2144
Epoch [4/10], KL Divergence: 0.1982
Epoch [5/10], KL Divergence: 0.1875
Epoch [6/10], KL Divergence: 0.1797
Epoch [7/10], KL Divergence: 0.1736
Epoch [8/10], KL Divergence: 0.1685
Epoch [9/10], KL Divergence: 0.1645
Epoch [10/10], KL Divergence: 0.1612
```

GPGPUの利用が指定されなかったのでCPUを使って計算をするメッセージが出ています。また、コスト関数としてはカルバック・ライブラーダイバージェンス(KL Divergence)を使っています。学習にはContrastive Divergence (CD)法を使っています。可視層に入力された画像を隠れ層にエンコードし、隠れ層から可視層を復元した際、復元画像と入力画像が近くなるように重みを調整します。

### 画像の再構成用の関数

RBMに画像を食わせて再構成させますが、それを可視化するためのヘルパー関数を定義しておきます。

```py
def show_restored_image(input, output):
  fig, axes = plt.subplots(1, 2, figsize=(4, 2))
  axes[0].axis('off')
  axes[0].set_title('Input Image')
  axes[0].imshow(input.reshape((28,28)), cmap='gray')
  axes[1].axis('off')
  axes[1].set_title('Restored Image')
  axes[1].imshow(output.reshape((28,28)), cmap='gray')
  plt.show()
```

元の画像(`inout`)と、RBMが再構成した画像(`output`)を受け取って、Matplotlibで並べて表示しているだけです。

### 画像の再構成

画像を再構成しましょう。

入力データは、学習に使わなかった方のデータ`x_test`を使います。それを`rbm.reconstruct`に渡すと、RBMが再構成画像を返します。ここで、再構成画像は以下のような手続きで計算されます。

1. 可視層のユニットを入力データに固定して隠れ層のユニットをサンプリング
2. サンプリングした隠れ層のユニットを固定して、その状態で可視層のユニットの期待値を計算

simple_rbmは可視層も隠れ層もイジングスピンを用いるベルヌーイ・ベルヌーイ型となっていますが、`RBM::reconstuct`は期待値を返すために実数が出力されます。最初の10個の数字をRBMに食わせて再構成画像を確認するコードはこんな感じです。

```py
for i in range(10):
  show_restored_image(x_test[i], rbm.reconstruct(x_test[i].reshape(1, 28 * 28))[0])
```

出力はこんな感じです。

![Generated images](/assets/images/simple_rbm_introduction/generated.png)

入力画像と完全に同じではないが、概ね同じ数字であるとわかる画像を再構成できていることがわかります。
今回の例では可視層として28x28=784ビットの情報を、一度64ビットに圧縮してから、また784ビットに復元しているため、RBMが情報圧縮、復元をしていることがわかります。

## その他の使い方

### GPGPUの使い方

GPGPUを使いたい場合は、コンストラクタに`use_GPU=True`を指定してください。

```py
rbm = RBM(visible_num=28 * 28, hidden_num=64, use_GPU=True)
```

`CuPy`が使える状態であるなら、`RBM::fit`実行時にGPGPUが自動で使われます。

```txt
# GPU usage has been enabled. Computation will proceed on the GPU.
Epoch [1/10], KL Divergence: 0.3716
Epoch [2/10], KL Divergence: 0.2513
Epoch [3/10], KL Divergence: 0.2144
Epoch [4/10], KL Divergence: 0.1968
Epoch [5/10], KL Divergence: 0.1857
Epoch [6/10], KL Divergence: 0.1780
Epoch [7/10], KL Divergence: 0.1723
Epoch [8/10], KL Divergence: 0.1677
Epoch [9/10], KL Divergence: 0.1639
Epoch [10/10], KL Divergence: 0.1607
```

Google Colabなら、ランタイムとしてGPUを使えば、GPGPU加速版のRBMが利用可能です。GitHubリポジトリは、GPGPUを利用するGoogle Colabのサンプルもあるので参考にしてください。

### ライブラリの利用

自分のコードからRBMライブラリを利用するなら、仮想環境を使うのが楽です。

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install https://github.com/watanabe-appi/simple_rbm.git
```

これでRBMライブラリが使えるようになります。

## まとめ

我々の研究室で開発したRBMライブラリの使い方を紹介しました。RBMは構造が単純であり、それ故にいろいろ解析できることが多く面白いです。このライブラリがRBM研究の一助となることを願っています。
