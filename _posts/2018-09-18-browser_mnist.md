---
layout: post
title: "ブラウザで手描き数字認識 (前処理付き版)"
tags: [programming, machine-learning, qiita]
permalink: browser_mnist
---

# ブラウザで手描き数字認識 (前処理付き版)

## TL;DL

* 機械学習において前処理って大事ですね。

## はじめに

「そうだ、機械学習をしよう」と思って、とりあえず始めるのはMNISTを使った手書き数字認識だと思う。例えばChainerのサンプルとか動かして、ロスが減って「なんか学習できてるっぽいなぁ」と思うところまで行ったとする。次に「ちゃんと学習できてるか、学習させたモデルに自分の手書き文字を認識させてみよう」と思って[やってみると全然認識できなかったり](https://qiita.com/kaityo256/items/8c7c9a32bd4ae5c0b500)して驚くわけですね。

この話を機械学習に詳しい人にしたら「ちゃんと前処理した？」と言われて、「いやしてないけど、こんな簡単な認識、前処理の有無でそうそう変わらないでしょ・・・」と思って放置してたのですが、[自分の手書きデータをTensorFlowで予測する](https://qiita.com/takus69/items/dd904dfc62372310c46f)という記事を見て、「あぁ、やっぱり前処理って大事なんだ」と思って、ちゃんと前処理しました。

ソースコードは以下の場所においておきます。
https://github.com/kaityo256/mnist_check

オンラインで試すことができるデモはここです。
https://kaityo256.github.io/mnist_check/

## とりあえず結果

[オンラインデモ](https://kaityo256.github.io/mnist_check/)を開くと、とりあえずこんな画面が出てきます。

![image0.png](/assets/images/browser_mnist/image0.png)

データのロード中には「Now Loading ... Please Wait」と表示されますが、それが消えたら操作可能です。

三画面ありますが、一番左が数字を描くキャンバス、真ん中がそのまま28x28に粗視化したもの、右が前処理を施したものです。

何か数字を描いてみましょう。前処理の効果が一番わかりやすいのは「1」だと思います。わざと左や右にずれた「1」を描いてみます。

![image1.png](/assets/images/browser_mnist/image1.png)

![image2.png](/assets/images/browser_mnist/image2.png)

右や左にずれた「1」を、そのまま学習済みモデルに食わせると「6」とか「4」に誤認識しますが、前処理が施されたものはちゃんと「1」と認識します。

「6」も左右にずれると誤認識しやすい数字です。

![image3.png](/assets/images/browser_mnist/image3.png)

![image4.png](/assets/images/browser_mnist/image4.png)

そのまま食わせた奴は「5」や「3」に誤認識しますが、前処理版は「6」と正しく認識しています。

一方、「9」は前処理版でもなかなか苦戦します。

![image5.png](/assets/images/browser_mnist/image5.png)

![image6.png](/assets/images/browser_mnist/image6.png)

なんか前処理なし版は「8」、前処理しても「4」と誤認識しますね。理由はよくわかりません。

## 前処理について

[自分の手書きデータをTensorFlowで予測する](https://qiita.com/takus69/items/dd904dfc62372310c46f)という記事にある通り、MNISTのデータは前処理されています。

> MNISTは20×20ピクセルに変換された画像（ただしアスペクト比は保ったまま）の重心を、28×28ピクセルの画像の中心に合わせた画像となってます。

実は僕はそれを知っていたのですが、「どうせたいして変わらんだろ」とそのままデータを28x28ピクセルに粗視化してモデルに食わせていました。しかし、前処理が大事そうだったので、入力イメージを20x20ピクセルに粗視化して、重心を移動したものを食わせるようにしましょう。ついでにオンラインデモのJavaScriptが何をやってるか簡単に説明します。学習済みモデルのJavaScriptでの読み込みについては[前の記事](https://qiita.com/kaityo256/items/8c7c9a32bd4ae5c0b500)を参照してください。

まず、入力データを28x28、もしくは20x20に粗視化したデータが欲しくなります。なのでCanvasのサイズを28と20の公倍数である420にしておきましょう。キャンバスに描かれたデータを、指定のサイズで粗視化した`Float32Array`の配列で取得する関数はこんな感じにかけます。

```js
function makedata(canvas, size){
  var h = canvas.height;
  var w = canvas.width;
  img = canvas.getContext('2d').getImageData(0,0,h,w);
  var data = new Float32Array(size*size);
  data.fill(0.0);
  var m = h/size;
  for(var i=0;i<size;i++){
    for(var j=0;j<size;j++){
      var sum = 0;
      for(var k=0;k<m;k++){
        for(var l=0;l<m;l++){
          x = i*m+k;
          y = j*m+l;
          var s = x+y*m*size;
          if (img.data[s*4]>128){
            sum++;
          }
        }
      }
    data[i+size*j] = 1.0*sum/m/m;
    }
  }
  return data;
}
```

JavaScript慣れてないのでいろいろこなれてないですがご容赦ください。これを使って、28x28のデータに粗視化してモデルに食わすには

```js
data28 = makedata(canvas, 28);
var i = model.recognize(data28);
```

とすれば、変数`i`に認識された数字が返ってきます。

次に、前処理版です。とりあえず入力データを20x20に粗視化します。その後、その重心を計算し、中心からずれた分だけ補正して28x28のイメージにコピーします。20x20を28x28にコピーするので、上下左右に4ピクセルの余裕があると思って、最大+/-4ピクセルだけ補正することにします。したがって、重心が4ピクセル以上ずれた場合は補正しきれません。本当は画像が切れてしまっても重心を中心に補正してしまった方が良いのかもしれませんが、ここは手抜きします。

その処理をやってるのが`docs/draw.js`のこのあたりです。

```js
  canvas.onmouseup =function(e){
    mouseDown=false;
    data28 = makedata(canvas, 28); //そのまま28x28に粗視化して食わせる
    data2canvas(data28, 28, canvas2) //粗視化した画像を真ん中のキャンバスに描画
    data20 = makedata(canvas, 20);  //まず20x20に粗視化する
    var xg, yg;
    [xg, yg] = centerofmass(data20,20); //重心を計算する
    xg -= 10.0;
    yg -= 10.0;
    xg = Math.min(xg, 4.0);
    yg = Math.min(yg, 4.0);
    xg = Math.max(xg, -4.0);
    yg = Math.max(yg, -4.0);
    var data28_s = datashift(xg, yg, data20); //重心のずれを補正したデータを取得
    data2canvas(data28_s, 28, canvas3) //右のcanvasに描画
    check(data28, data28_s); //補正なし、補正済みデータを数字認識させる
  }
```

こうして、左に入力した画像を、そのまま粗視化した場合と、前処理をして粗視化した場合の認識を確認するコードの出来上がりです。

## まとめ

「機械学習は前処理が大事」とは耳にタコができるほど聞きますが、本当に大事だったんですね・・・　こうして実際に確認してみないとこういうのは実感できませんね。

## 参考

* [Chainer v3 ビギナー向けチュートリアル](https://qiita.com/mitmul/items/1e35fba085eb07a92560) Chainer初心者はまずこれを読むと良いと思う。
* [ChainerでMNISTを学習させた結果を使ってブラウザで手描き数字認識](https://qiita.com/kaityo256/items/8c7c9a32bd4ae5c0b500)
* [自分の手書きデータをTensorFlowで予測する](https://qiita.com/takus69/items/dd904dfc62372310c46f)
* [MNISTを学習させたモデルの気持ちを調べる](https://qiita.com/kaityo256/items/438ee87a0ef1346071b9)
* [MNISTのデータを仕分けしてPNGファイルで保存](https://qiita.com/kaityo256/items/77bc0b40e3bb70d36f3d)
* [Re:ゼロから始めるChainer生活](https://qiita.com/kaityo256/items/eeac271bbfaa5c1763de)
* [Chainerで学習したモデルをC++で読み込む](https://qiita.com/kaityo256/items/f1e2c8e38cbf8ffd8c09)
* [JavaScriptでfloat32のバイナリファイルを読み込む](https://qiita.com/kaityo256/items/bdc29384ec7955d087fa)
