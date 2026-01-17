---
layout: post
title: "MNISTを学習させたモデルの気持ちを調べる"
tags: [programming, machine-learning, qiita]
permalink: mnist_interpret
---

# MNISTを学習させたモデルの気持ちを調べる

この記事は「[ChainerでMNISTを学習させた結果を使ってブラウザで手描き数字認識](https://qiita.com/kaityo256/items/8c7c9a32bd4ae5c0b500)」の続きです。

あと、この記事は機械学習のド素人が書いたものなので、そのつもりで読んでください。

## はじめに

機械学習、してますか？

最近流行ってるみたいだから、とりあえず定番のMNISTを学習させてみて、数字だけ見ると学習できているみたいだから[オンラインで手描き数字認識をやらせてみた](https://kaityo256.github.io/mnist_check/)ら全然認識してくれなくて途方にくれたことはありませんか。僕はくれました。

なんども「これは大丈夫だろう」と思って入力した数字(例えば9)を誤認識されるうちに、だんだん「じゃあ逆にお前が考える『9』ってどんなんだよ！」と聞きたくなってきます。

・・・で、いろいろ試してみると、どうも学習したモデルは「数字を認識している」というよりは、学習により彼なりの「数字のイデア」を作り上げ、その「イデア」と入力を比較して一番近いものだと認識しているのでは、という感じがしてきました。

というわけで実際にモデルに「お前のイデアはどんなんだ？」と聞いてみましょう。

今回追加したコードは

https://github.com/kaityo256/mnist_check/tree/master/idea

にあります。

## 方針


例えば「5」のイデアを調べる時、とりあえずMNISTを学習させたモデルに対して、まずランダムな入力を与え、「5」に対応する出力が上がるように入力をいじっていきます。

モデルの入力は28*28=784個の0から1までのfloatですが、面倒なので0か1のバイナリとしてしまいましょう。ナイーブには

* 入力ピクセルをランダムに選ぶ
* そのピクセルをランダムに0か1にしてみる
* その結果、欲しい出力が増えたら採用、減ったら不採用

という感じでしょうか。

コードはこんな感じになろうかと思います。ちなみに`vf`というのは

```cpp
typedef std::vector<float> vf;
```

のことです。


```cpp
void
search_mc(Model &model,const int index){
  std::mt19937 mt;
  std::uniform_real_distribution<double> ud(0.0,1.0);
  std::uniform_int_distribution<int> ui(0,28*28);
  vf x(28*28);
  for(auto &v :x){
    v = ud(mt);
  }
  float energy = model.predict(x)[index];
  for(int i=0;i<10000;i++){
    const int j = ui(mt);
    float xj = x[j];
    x[j] = ud(mt) > 0.5? 1:0;
    float n_energy = model.predict(x)[index];
    if(n_energy > energy){
      energy = n_energy;
    }else{
      x[j] = xj;
    }
    if(i%200==0)save_vf_sequential(x);
  }
  printf("%f\n",energy);
}
```

`Model model`というのは、ChainerのニューラルネットをC++でラップしたものです。`x`を入力とすると、`model.predict(x)`が長さ10のベクトルを返します。で、指定された`index`に対して、`model.predict(x)[index]`が重みを与えるので、それをエネルギーだと思って、その最大化をしましょう、という感じのコードです。

途中経過を保存するために`save_vf_sequential`という関数を呼んでますが、これは単純に`float`を728個バイナリで保存しているだけです。

```cpp
void
save_vf_sequential(vf &x){
  char filename[256];
  static int index = 0;
  sprintf(filename,"x%04d.vf",index);
  std::ofstream ofs(filename, std::ios::binary);
  ofs.write((char*)x.data(),sizeof(float)*x.size());
  index++;
}
```

こうして保存された生データを、Pythonで可視化しましょう。

```vf2png.py
import array
import os

from PIL import Image
def convert(filename):
    f = open(filename, 'rb')
    a = array.array('f')
    a.fromfile(f, 28*28)
    img = Image.new("L", (28, 28))
    pix = img.load()
    for i in range(28):
        for j in range(28):
            pix[i, j] = int(a[i+j*28]*256)
    img2 = img.resize((280, 280))
    pngfile = os.path.splitext(filename)[0] + '.png'
    img2.save(pngfile)
    print filename + " -> " + pngfile

def for_anime():
    for i in range(50):
        vffile = 'x%04d.vf' % i
        convert(vffile)
```

## 結果

まず、MNISTの学習に使ったパラメータはこんな感じです。

* 三層ニューラルネット
* 中間層のユニット数は入力と同じ784
* バッチサイズ 1000
* エポック 20

この学習済みモデルに対して、「5のイデア」を探した時のアニメーションはこんな感じです。

![image0.gif](/assets/images/mnist_interpret/image0.gif)

徐々に「5」っぽい数字が出て来るのがわかると思います。

で、最初モンテカルロとかアニーリングとか真面目にやろうかと思ったのですが、適当に最急勾配っぽくやった方がはやいことがわかったので、そういうコードを書きました。

```cpp
void
search_gd(Model &model, const int index){
  std::mt19937 mt;
  std::uniform_real_distribution<double> ud(0.0,1.0);
  vf x(28*28);
  for(auto &v :x){
    v = ud(mt);
  }
  float energy = model.predict(x)[index];
  for(int j=0;j<5;j++){
    for(int i=0;i<28*28;i++){
      x[i] = 0.0;
      float energy0 = model.predict(x)[index];
      x[i] = 1.0;
      float energy1 = model.predict(x)[index];
      if(energy0>energy1){
        x[i] = 0.0;
        energy = energy0;
      }else{
        x[i] = 1.0;
        energy = energy1;
      }
    }
    std::cerr << energy << std::endl;
  }
  char filename[256];
  sprintf(filename,"idea_%d.vf",index);
  save_vf_as(filename, x);
}
```

順番にピクセルを舐めていって、0と1を試して、出力が大きい方を採用する、というコードです。滅茶苦茶ローカルミニマムにトラップされそうでしたが、普通にそれっぽい状態を返してきたのでこれを採用します。これを使って、「モデルが最も『0』っぽいと思うイメージ、『1』っぽいと思うイメージ..」を探したものがこれです。

0のイデア
![image1.png](/assets/images/mnist_interpret/image1.png)

1のイデア
![image2.png](/assets/images/mnist_interpret/image2.png)

2のイデア
![image3.png](/assets/images/mnist_interpret/image3.png)

3のイデア
![image4.png](/assets/images/mnist_interpret/image4.png)

4のイデア
![image5.png](/assets/images/mnist_interpret/image5.png)

5のイデア
![image6.png](/assets/images/mnist_interpret/image6.png)

6のイデア
![image7.png](/assets/images/mnist_interpret/image7.png)

7のイデア
![image8.png](/assets/images/mnist_interpret/image8.png)

8のイデア
![image9.png](/assets/images/mnist_interpret/image9.png)

９のイデア
![image10.png](/assets/images/mnist_interpret/image10.png)

なんとなく、「0、1、2、3、５」のイデアはあたりは、まぁそれっぽい気がしますね。でも「4」のイデアとかはかなり厳しいします。

逆に、このイデアから「モデルに認識させやすい入力」を推定することができます。

4のイデアを参考に、こんな入力を食わせてみましょう。

![image11.png](/assets/images/mnist_interpret/image11.png)

ちゃんと認識してくれました。

9の認識もなかなか苦労します。

![image12.png](/assets/images/mnist_interpret/image12.png)

しかし「9」のイデアを知っている我々は、それをカンニングすることで、どんなイメージを入力すればこのモデルが9と認識するかわかります。

![image13.png](/assets/images/mnist_interpret/image13.png)

ほらね？

## まとめ

MNISTを学習させたモデルについて、「そのモデルの数字のイデア」を調べて、それを参考にすることで手描き数字の認識率を劇的に改善させることができました。本末転倒だとか言わないのが大人です。

ちなみに、今回のパラメータではそこそこ「イデア」が人間から見てもそれっぽいものが出てきましたが、例えばバッチサイズや中間層のサイズを変えると、人間が見ても「何のイデアか」がわからないようなものになります。

こうやってモデルをハックすることで、人間には「0」にしか見えないのに「9」と認識させたりすることができたので、これもAdversarial examplesと言えなくもない、という感じでしょうか。

## 参考

* [ChainerでMNISTを学習させた結果を使ってブラウザで手描き数字認識](https://qiita.com/kaityo256/items/8c7c9a32bd4ae5c0b500) 
* [MNISTのデータを仕分けしてPNGファイルで保存](https://qiita.com/kaityo256/items/77bc0b40e3bb70d36f3d) MNISTのデータ構造と可視化
* [Chainerで学習したモデルをC++で読み込む](https://qiita.com/kaityo256/items/f1e2c8e38cbf8ffd8c09) 本文で出てきた`Model`クラスの説明とか
