---
layout: post
title: はじめての機械学習(自分でデータセットを作る編)
tags: [zenn, machine-learning]
permalink: my_first_machine_learning
---
## はじめに

機械学習をやってみたくて、とりあえずサンプルを実行して、何かできているっぽいけれど、その後どうして良いかわからない、そんな人は多いと思います。
この記事では、全くの機械学習初心者向けに、自分でデータセットを作ってニューラルネットワークに学習させてみるサンプルを作ってみます。

サンプルコードは

[kaityo256/my_first_ml](https://github.com/kaityo256/my_first_ml)

にありますが、cloneしたりせず、以下を手で写しながら作業したほうが良いと思います。

## MNISTの学習

機械学習のデータセットといえば、MNISTです。これは手書き数字のデータセットで、0から9までの手書き数字データと、その正解ラベルがセットになっています。多くの機械学習フレームワークで、MNISTは標準でサポートされています。

TensorFlowを実行するために、まずはTensorFlowをインストールする必要があります。Google Colabとかで実行するのが楽ですが、もしローカルで実行したい場合は、今後のために仮想環境を作っておくと良いでしょう。適当なディレクトリ(例えば`my_first_ml`)を作って、そこで作業しましょう。

```sh
mkdir my_first_ml
cd my_first_ml
```

次に、仮想環境を作ります。Pythonは様々なパッケージをインストールして使いますが、それらのパッケージがぶつかったり、バージョンが異なるとふるまいが変わったりして不便です。これをコンピュータ全体で管理すると、別のプロジェクトでインストールしたパッケージが別のプロジェクトとぶつかって、いつのまにか動かなくなっていた、なんてことがおきたりします。それを防ぐために、プロジェクトごとにパッケージを管理します。そのために使うのが仮想環境です。

```sh
python3 -m venv .venv
source .venv/bin/activate
```

これにより、仮想環境`.venv`がアクティベートされました。以後、インストールされるパッケージは、`my_first_ml/.venv`以下に入ります。

```sh
python3 -m pip install --upgrade pip
python3 -m pip install tensorflow
```

TensorFlowがインストールされたかどうか確認しましょう。IPythonを使うのが良いと思います。

```sh
$ ipython3
In [1]: import tensorflow as tf
In [2]: tf.__version__
Out[2]: '2.10.0'
In [3]: exit 
```

`tf.__version__`を評価して、バージョンが帰ってきたら正しくインストールされています。`exit`でIPythonを抜けておきましょう。

これでTensorFlowを使う準備が整いました。実際に機械学習をしてみましょう。

TensorFlow/Kerasでニューラルネットワークを組んでMNISTを学習させるサンプルはこんな感じになります。

```py
from tensorflow import keras


def get_data():
    train_data, test_data = keras.datasets.mnist.load_data()
    train_images, train_labels = train_data
    test_images, test_labels = test_data
    train_images = train_images / 255.0
    test_images = test_images / 255.0
    return (train_images, train_labels, test_images, test_labels)


def create_model():
    model = keras.Sequential(
        [
            keras.layers.Flatten(input_shape=(28, 28)),
            keras.layers.Dense(128, activation="relu"),
            keras.layers.Dense(10, activation="softmax"),
        ]
    )
    model.compile(
        optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"]
    )
    return model


(train_images, train_labels, test_images, test_labels) = get_data()

model = create_model()

model.fit(train_images, train_labels, epochs=5)

test_loss, test_acc = model.evaluate(test_images, test_labels)

print(f"Test Loss = {test_loss}")
print(f"Test Accuracy = {test_acc}")

model.save("model.keras")
```

たったこれだけです。これを`mnist_train.py`という名前で保存し、実行しましょう。

```sh
$ python3 mnist_train.py
(snip)
Epoch 1/5
1875/1875 [==============================] - 4s 2ms/step - loss: 0.2640 - accuracy: 0.9252
Epoch 2/5
1875/1875 [==============================] - 4s 2ms/step - loss: 0.1173 - accuracy: 0.9649
Epoch 3/5
1875/1875 [==============================] - 4s 2ms/step - loss: 0.0807 - accuracy: 0.9762
Epoch 4/5
1875/1875 [==============================] - 4s 2ms/step - loss: 0.0597 - accuracy: 0.9816
Epoch 5/5
1875/1875 [==============================] - 5s 2ms/step - loss: 0.0467 - accuracy: 0.9852
313/313 [==============================] - 1s 2ms/step - loss: 0.0815 - accuracy: 0.9746
Test Loss = 0.08145684003829956
Test Accuracy = 0.9746000170707703
```

最初にごちゃごちゃ表示されるのはTensorFlowをインポートした時のメッセージなので、とりあえず無視してかまいません。今回はエポックを5にしたので、5回分学習し、徐々に精度が上がっていること、最後にテストデータに対して精度を確認し、ロスが0.081、精度が97.4%であったことが表示されています。

## コードの説明

さて、わずか数十行書いたら機械学習ができる時代になりましたが、その分、実装が隠蔽されており、何が起きているかわかりにくくなっています。先ほどのコードが何をしているか、調べてみましょう。

```py
from tensorflow import keras
```

最初はライブラリのインポートです。ここでは`tensorflow.keras`をインポートしています。

```py
def get_data():
    train_data, test_data = keras.datasets.mnist.load_data()
    train_images, train_labels = train_data
    test_images, test_labels = test_data
    train_images = train_images / 255.0
    test_images = test_images / 255.0
    return(train_images, train_labels, test_images, test_labels)
```

これは、MNISTのデータを取得する関数です。`keras`には標準でいくつかのデータセットが付属しており、`keras.datasets.hogehoge.load_data()`でデータを持ってこれます。MNISTの場合は、`keras.datasets.mnist.load_data()`とすると、訓練データとテストデータがタプルで渡されるので、それをタプルで受け取ります。

受け取った訓練データ、テストデータは、それぞれイメージデータと正解ラベルのタプルになっています。なので、それらをタプルとして分離します。

```py
train_images, train_labels = train_data
test_images, test_labels = test_data
```

`train_images`や`test_images`は、NumPy配列になっています。例えば`train_images[0]`とすると、最初のデータを参照できます。このデータは28x28のNumPy配列になっており、文字の「輝度」が0から255の整数で格納されています。

後の学習のため、これを0から1の実数に正規化しておきます。それが以下の行です。

```sh
train_images = train_images / 255.0
test_images = test_images / 255.0
```

正解ラベルは、NumPyの一次元配列で、たとえば`train_labels[0]`には「5」が格納されており、0番目のイメージデータの正解ラベルが5であることがわかります。

あとは、正規化した訓練データ、そのラベル、テストデータ、そのラベルを4つのタプルとして返しています。

次にモデルの構築です。

```sh
def create_model():
    model = keras.Sequential([
        keras.layers.Flatten(input_shape=(28, 28)),
        keras.layers.Dense(128, activation='relu'),
        keras.layers.Dense(10, activation='softmax')
    ])
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model
```

この関数では、28x28の入力を受け取り、10種類に分類するニューラルネットワークを組んでいます。最初の

```py
keras.layers.Flatten(input_shape=(28, 28)),
```

が入力層です。28x28のデータを受け取り、それを`Flatten`により一次元配列変換してニューロンに入力するよ、と書いてあります。

次の行が中間層の定義です。

```py
keras.layers.Dense(128, activation='relu'),
```

128個のニューロンからなる中間層で、活性化関数としてReLUを使うよ、と書いてあります。

最後が出力層です。

```py
keras.layers.Dense(10, activation='softmax')
```

10個のニューロンからなる出力層を作るよ、と書いてあります。これにより、入力層と中間層、中間層と出力層がそれぞれ全結合した三層のニューラルネットワークができます。

最後の行がモデルの構築です。

```py
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
```

最適化手法はAdam、ロス(目的関数)はクロスエントロピー、途中経過で`accuracy`を表示するように指定しています。慣れるまではここは変えなくてよいと思います。

最後に`retrun model`で、作ったモデルを返しています。

さて、データを作る関数と、モデルを作る関数を作ったので、それらを使って学習しましょう。データとモデルを用意して、`model.fit`という関数に訓練データを食わせるだけです。

```py
(train_images, train_labels, test_images, test_labels) = get_data()
model = create_model()
model.fit(train_images, train_labels, epochs=5)
```

`model.fit`の第一引数に訓練データ、第二引数に正解ラベル、最後にエポック数を指定しています。他にもいろいろ指定できますが、まずはエポックだけいじるのが良いと思います。

これで、`train_images`を受け取り、その正解ラベルである`train_labels`に対応するニューロンの重みが一番大きくなるように学習が進みます。

学習が済んだら、「学習に使っていないデータ」を使ってモデルの検証を行いましょう。先程分けておいたテストデータを使います。

```py
test_loss, test_acc = model.evaluate(test_images, test_labels)
print(f"Test Loss = {test_loss}")
print(f"Test Accuracy = {test_acc}")
```

`model.evaluate`の第一引数のテストデータ、第二引数に正解ラベルを渡すと、このテストデータのうち、何個正解できたかを返してくれます。また、ロスとしてクロスエントロピーも計算してくれます。それらを`print`で表示しておしまいです。97～98%程度の正答率が出せていることがわかると思います。

## データの保存と読み込み

せっかく学習したモデルなので、あとで使いたいですよね。そのためにモデルを保存することができます。

先程作成したコード`mnist_train.py`の最後に一行付け加えるだけです。

```py
model.save("model.keras")
```

```sh
python3 mnist_train.py
```

として実行すると、また学習をして、最後にモデルデータを保存します。ファイルは`model.data-00000-of-00001`と`model.index`になります。これを読み込んで、テストデータを食わせて結果を表示するコードを書いてみましょう。以下のようなコードを`mnist_load.py`として作成します。

```py
import numpy as np
from tensorflow import keras


def get_data():
    train_data, test_data = keras.datasets.mnist.load_data()
    train_images, train_labels = train_data
    test_images, test_labels = test_data
    train_images = train_images / 255.0
    test_images = test_images / 255.0
    return (train_images, train_labels, test_images, test_labels)


(train_images, train_labels, test_images, test_labels) = get_data()

model = keras.models.load_model("model.keras")

predictions = model(test_images[0:20])

for i in range(20):
    predicted_index = np.argmax(predictions[i])
    print(f"prediction= {predicted_index} answer = {test_labels[i]}")
```

`keras.models.load_model`でmodelをロードできます。昔はネットワークの形は保存してくれませんでしたが、今は保存してくれるので、これだけでモデルの形、重みのロードが完了します。

さて、重みを読み込んだモデルが「学習済みモデル」になるため、画像データを入力したら、それがどの手書き数字であるかを予測してくれることになります。とりあえず`test_images`の先頭の20個を食わせることにしましょう。コードのこの部分です。

```py
predictions = model(test_images[0:20])
```

モデルを分類器をとして使う場合は、`model()`に配列を渡します。ここで注意ですが、`tensorflow.keras`では効率のために画像をまとめて渡すことが前提になっています。つまり、画像をまとめて渡すと、それらに対する結果をまとめて返す、という形になっています。ここでは20枚のデータを渡したので、20個分の結果が`predictions`として帰ってきます。

さて、`predictions`は、ニューラルネットワークの生の出力になっています。20枚のデータを食わせたので、`predictions`は20次元の配列ですが、その配列の要素`predictions[i]`は、ニューラルネットワークが10個の分類器であることを反映して、10次元の配列になっています。これは、最後の10個のニューロンの出力です。そこで、10次元配列`predictions[i]`のうち、最大の値を持つインデックスを`numpy.argmax`で探してやりましょう。このうち、一番大きな出力を出したニューロンのインデックスが、このモデルが予測する結果となります。

実行結果はこんな感じになります。

```sh
$ python3 mnist_load.py
prediction= 7 answer = 7
prediction= 2 answer = 2
prediction= 1 answer = 1
prediction= 0 answer = 0
prediction= 4 answer = 4
prediction= 1 answer = 1
prediction= 4 answer = 4
prediction= 9 answer = 9
prediction= 6 answer = 5  # ← 間違えた
prediction= 9 answer = 9
prediction= 0 answer = 0
prediction= 6 answer = 6
prediction= 9 answer = 9
prediction= 0 answer = 0
prediction= 1 answer = 1
prediction= 5 answer = 5
prediction= 9 answer = 9
prediction= 7 answer = 7
prediction= 3 answer = 3
prediction= 4 answer = 4
```

途中で6と5を１つ間違えたようですね。正答率が97～98%なので、数十個に１つは間違えます。

## 自分でデータを作って学習させてみる

### パイこね変換

機械学習でもっとも重要なのは、質の良いデータを大量に用意することです。一般に、良いデータを大量に用意することは難しいですが、数値計算であればいくらでもデータを作ることができます。よくあるのはイジング模型のスピンコンフィグレーションから相や温度を推定させる、といったパターンです。ここでは、乱数とパイこね変換を見分けさせる分類器を作ってみましょう。

まず、指定の長さのランダムな数列を作る関数です。

```py
def get_random(length):
    return np.random.random(length)
```

`numpy.random.random`を呼ぶだけなので簡単ですね。

次に、初期値を乱数で作り、3倍しては整数部分を引く、ということを繰り返して作る数列を返す関数です。

```py
def get_baker(length):
    a = np.zeros(length)
    x = np.random.random()
    for i in range(length):
        x = x * 3.0
        x = x - int(x) 
        a[i] = x
    return a
```

これも難しいことはないと思います。このどちらも、一見乱数のように見えます。

こちらがランダムな数列です。

```py
import matplotlib.pyplot as plt
plt.plot(get_random(100),marker='.',linestyle='None')
plt.show()
```

![random](/assets/images/my_first_machine_learning/random.png)

こちらがパイこね変換で作った数列です。

```py
plt.plot(get_baker(100),marker='.',linestyle='None')
plt.show()
```

![baker](/assets/images/my_first_machine_learning/baker.png)

ぱっと見では区別がつきません。また、平均や分散といった統計量でも区別がつきません。

```py
r = get_random(1000)
print(f"average = {np.average(r)}") #=> average = 0.4961720294078324
print(f"variance = {np.var(r)}")    #=> variance = 0.08763440008850572
```

```py
b = get_baker(1000)
print(f"average = {np.average(b)}") #=> average = 0.4938802585263077
print(f"variance = {np.var(b)}")    #=> variance = 0.08359332179469303
```

しかし、`(data[i], data[i+1])`をプロットすると、違いが見えます。

```py
def get_xy(data):
    n = len(data) -1
    x = np.zeros(n)
    y = np.zeros(n)
    for i in range(n):
        x[i] = data[i]
        y[i] = data[i+1]
    return x,y
```

乱数の場合には構造はまったく見えません。

```py
x, y = get_xy(get_random(1000))
plt.scatter(x, y, marker='.')
plt.show()
```

![random_xy](/assets/images/my_first_machine_learning/random_xy.png)

パイこね変換の場合はきれいな構造が見えます。

```py
x, y = get_xy(get_baker(1000))
plt.scatter(x, y, marker='.')
plt.show()
```

![baker_xy](/assets/images/my_first_machine_learning/baker_xy.png)

ニューラルネットワークにこれを食わせて、学習により区別できるかどうかを確認しましょう。

### 訓練コード

まず、`mnist_train.py`をコピーして、`baker_train.py`という名前で保存しましょう。これを改造することで自分の作ったデータを訓練させるコードにします。

最初に、食わせるデータは100個の一次元配列、分類は「ランダム」か「パイこね変換」の二種類なので、出力は2個です。また、最初から一次元データを食わせるので、`Flatten`する必要はありません。中間層の数は、とりえず適当に50個くらいにしておきましょう。`create_model`関数はこうなります。

```py
def create_model():
    model = keras.Sequential([
        keras.layers.Input(shape=(100,)), # ←ここをFlattenからInputに修正。
        keras.layers.Dense(32, activation='relu'),
        keras.layers.Dense(2, activation='softmax') # ←ここを10から2に修正
    ])
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model
```

次に、データを作るところです。`mnist_train.py`の`get_data`関数の代わりに、以下を入力しましょう。

```py
def get_random(length):
    return np.random.random(length)


def get_baker(length):
    a = np.zeros(length)
    x = np.random.random()
    for i in range(length):
        x = x * 3.0
        x = x - int(x)
        a[i] = x
    return a


def make_data(n, length):
    x = []
    y = []
    for _ in range(length):
        if(np.random.random() < 0.5):
            x.append(get_random(n))
            y.append(0)
        else:
            x.append(get_baker(n))
            y.append(1)
    x = np.array(x)
    y = np.array(y)
    return x, y
```

`make_data`は、長さ`n`のデータを`length`個作成し、データと正解ラベルを返す関数です。とりあえず長さは100としましょう。学習部分はこうなります。

```py
n = 100
train_data, train_labels = make_data(n, 60000)
test_data, test_labels = make_data(n, 10000)

model = create_model()

model.fit(train_data, train_labels, epochs=5)

test_loss, test_acc = model.evaluate(test_data, test_labels)

print(f"Test Loss = {test_loss}")
print(f"Test Accuracy = {test_acc}")
```

モデルの保存のところは、名前を変えておきましょう。

```py
model.save("baker.keras")
```

以上で準備は完了です。実行してみましょう。

```sh
$ python3 baker_train.py
Epoch 1/5
1875/1875 [==============================] - 3s 2ms/step - loss: 0.6435 - accuracy: 0.6104
Epoch 2/5
1875/1875 [==============================] - 3s 2ms/step - loss: 0.4758 - accuracy: 0.7699
Epoch 3/5
1875/1875 [==============================] - 3s 2ms/step - loss: 0.4047 - accuracy: 0.8117
Epoch 4/5
1875/1875 [==============================] - 3s 2ms/step - loss: 0.3718 - accuracy: 0.8306
Epoch 5/5
1875/1875 [==============================] - 3s 2ms/step - loss: 0.3527 - accuracy: 0.8410
313/313 [==============================] - 1s 1ms/step - loss: 0.3988 - accuracy: 0.8169
Test Loss = 0.3987952172756195
Test Accuracy = 0.8169000148773193
```

8割ちょっとの正答率が出ているようですね。

### データの読み込み

せっかく学習したので、モデルの読み込み練習を兼ねて、このモデルが何をどのように判断しているか、ちょっとだけ見てみましょう。まずはモデルをロードするコードを書きます。ほとんど`mnist_load.py`と同じです。

```py
import numpy as np
from tensorflow import keras


def get_random(length):
    return np.random.random(length)


def get_baker(length):
    a = np.zeros(length)
    x = np.random.random()
    for i in range(length):
        x = x * 3.0
        x = x - int(x)
        a[i] = x
    return a


def make_data(n, length):
    x = []
    y = []
    for _ in range(length):
        if np.random.random() < 0.5:
            x.append(get_random(n))
            y.append(0)
        else:
            x.append(get_baker(n))
            y.append(1)
    x = np.array(x)
    y = np.array(y)
    return x, y


model = keras.models.load_model("baker.keras")

all_random_data = np.array([get_random(100) for _ in range(100)])
all_random_labels = np.array([0] * 100)

r_loss, r_acc = model.evaluate(all_random_data, all_random_labels)

print("When everything is random")
print(f"Test Loss = {r_loss}")
print(f"Test Accuracy = {r_acc}")

all_baker_data = np.array([get_baker(100) for _ in range(100)])
all_baker_labels = np.array([1] * 100)

b_loss, b_acc = model.evaluate(all_baker_data, all_baker_labels)

print("When everything is baker map")
print(f"Test Loss = {b_loss}")
print(f"Test Accuracy = {b_acc}")
```

これで学習済みモデルがロードされました。ちゃんと学習できているか調べるため、「全部が乱数」のデータを作って`model.evaluate`に食わせてみましょう。

```py
all_random_data = np.array([get_random(100) for _ in range(100)])
all_random_labels = np.array([0] * 100)

r_loss, r_acc = model.evaluate(all_random_data, all_random_labels)

print("When everything is random")
print(f"Test Loss = {r_loss}")
print(f"Test Accuracy = {r_acc}")
```

全部がランダムなので、正解ラベルは全てゼロ(`np.array([0] * 100)`)です。実行してみるとこうなります。

```sh
$ python3 baker_load.py
When everything is random
Test Loss = 0.297588586807251
Test Accuracy = 0.8500000238418579
```

85%の正解率を出しています。

逆に、全てがパイこね変換の場合も試してみましょう。

```py
all_baker_data = np.array([get_baker(100) for _ in range(100)])
all_baker_labels = np.array([1] * 100)

b_loss, b_acc = model.evaluate(all_baker_data, all_baker_labels)

print("When everything is baker map")
print(f"Test Loss = {b_loss}")
print(f"Test Accuracy = {b_acc}")
```

実行するとこうなります。

```sh
$ python3 baker_load.py
When everything is baker map
Test Loss = 0.37267830967903137
Test Accuracy = 0.8299999833106995
```

正解率は83%です。こういう二値分類では、たまに「片方は完璧に識別できるが、もう片方はわからないのでランダムに答える」ような偏ったモデルができることがあり、こういうテストをすると片方で正解率100%近く、もう片方は50%前後になることがありますが、今回のモデルではちゃんと識別できているようです。

## まとめ

まずはMNISTの学習とモデルの読み込みを確認し、それを改造してパイこね変換のデータを食わせて学習させて見ました。機械学習、特に分類器の作成は、慣れてしまえばデータと正解ラベルをNumPy配列で作るだけなのですが、最初はどうして良いかわからないことが多いので、こうしてコードを改造しつつ、動作を確認しながら実行してみると良いと思います。
