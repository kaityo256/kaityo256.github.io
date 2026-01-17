---
layout: post
title: "Google先生の塩を撒くことへの不思議なこだわり"
tags: [web, qiita]
permalink: google_salt
---

# Google先生の塩を撒くことへの不思議なこだわり

## はじめに

Googleの検索には「もしかして」の機能がある。タイポや、曖昧な記憶での検索に対して「正しくはこうではないですか？」と提案してくるもの。わりと便利なのだが、今日その不思議な振る舞いを見つけたのでメモ。

(2017年6月27日追記)現在では、以下の現象は再現しないようですね。中の人がこの記事読んで対応したとも思えないので、Googleの仕様は日々変わっていて、それでこの現象は起きなくなったのだと思われます。

## 現象

清水さんの長文日記の[主要なプログラミング言語8種をざっくり解説](http://d.hatena.ne.jp/shi3z/20160701)という項目に、こんな一節が出てくる。

>　「うちはとにかく凄いエンジニアを紹介できるんですよ」
>と自信満々に言うので、
>　「へえ、どんなふうに凄いんですか?」
>と聞くと
>　「実はみんな、Ruby使いなのです」
>ドヤッと胸を貼るので、お引き取り願いました。塩も撒いた。

これ、極めて限定的なコミュニティでコピペのソースになっているようだったので、どういうネタがあるか調べようとして、「お引き取り願いました。塩も撒いた。」で検索しようとすると、

![image0.png](/assets/images/google_salt/image0.png)

と、Google先生が「もしかして：お引き取り願いました。塩が撒いた。」に変えてくるんですね。

・・・なぜ？

というわけでいろいろ調べてみた。

## Case 1.

「塩も撒いた」は修正してこない。
![image1.png](/assets/images/google_salt/image1.png)

## Case 2.

「荷物をお引き取り願いました。塩も撒いた。」は修正対象。

![image2.png](/assets/images/google_salt/image2.png)

## Case 3.

「荷物をお引き取り願います。塩も撒いた。」は修正してこない。

![image3.png](/assets/images/google_salt/image3.png)

## Case 4.

「お星様に願いました。塩も撒いた。」は修正対象。

![image4.png](/assets/images/google_salt/image4.png)

## Case 5.

ここらへんで「丁寧語の過去形＋塩も撒いた」は修正対象な気がしてくるでしょう？　でも「お星様に。塩も撒いた。」も修正対象なんだなこれが。

![image5.png](/assets/images/google_salt/image5.png)

## Case 6.

「お星様に。NaClも撒いた。」は修正してこない。

![image6.png](/assets/images/google_salt/image6.png)

## Case 7.

岩塩を撒くと「もしかして」ではなくて「次の検索結果を表示しています」になる。

![image7.png](/assets/images/google_salt/image7.png)

## Case 8.

食塩を撒くと「もしかして」になる。

![image8.png](/assets/images/google_salt/image8.png)

## Case 9.

豆を撒くと修正してこない。

![image9.png](/assets/images/google_salt/image9.png)

## Case 10.

星に塩を撒くと修正してくる。

![image10.png](/assets/images/google_salt/image10.png)

## Case 11.

「お星様に。塩も撒いた」は「もしかして」だったが、「星に。塩も撒いた」は「次の検索結果を表示しています」になる。

![image11.png](/assets/images/google_salt/image11.png)

## Case 12.

「撒いた」をひらがなにすると修正してこない。

![image12.png](/assets/images/google_salt/image12.png)

## Case 13.

食塩も岩塩も撒くと修正対象だが、食卓塩は撒いてもOK。

![image13.png](/assets/images/google_salt/image13.png)

## Case 14.

玄関に塩を撒いてはいけません。

![image14.png](/assets/images/google_salt/image14.png)

## Case 15.

俺たちが塩を撒くと修正対象。

![image15.png](/assets/images/google_salt/image15.png)

## Case 16.

「申し訳ありません。当方の落ち度となりますので、弊社の方で塩も撒いておきますので・・・」

![image16.png](/assets/images/google_salt/image16.png)

## Case 17.

塩と星の順序を逆にすると修正してこない。

![image17.png](/assets/images/google_salt/image17.png)

## Case 18.

「こんな夜中に塩も撒いたらGoogle先生に叱られますよ！」

![image18.png](/assets/images/google_salt/image18.png)

## Case 19.

「助けて・・・助けて・・・塩が、塩が撒いてくるのっ！」

![image19.png](/assets/images/google_salt/image19.png)


## まとめ

結局Google先生のこだわりがよくわからなかった。みなさんも塩を撒いてみるといいんじゃないでしょうか。
