---
layout: post
title: "MacのPowerPointにおける面妖なフォント変更"
tags: [document, qiita]
permalink: mac_ppt_font
---

# MacのPowerPointにおける面妖なフォント変更


## TL;DR

* Mac版のPowerPointにて、ある特殊な形のテキストを、テキストボックスに貼り付けると、なぜか数字が太くなる。
* オートコレクト等を全て切っておいてもそうなる。
* 同じ内容を直接テキストボックスに入力してもこの現象はおきない
* Windows版ではそういう現象はおきない
* 面妖だ・・・

ちなみに試したのはMac版PowerPoint 15.33。

## バックグラウンドストーリー

あなたはふと、「圧縮プログラムっていろいろあるけど、圧縮率はどのくらい違うんだろう？」と思ったとする。とりあえず適当なファイルを用意するため、

```rb
n = 2**17
srand(1)
data = Array.new(n){ rand}
IO.binwrite("test.dat", data.pack("d*"))
```

みたいにして`test.dat`を作り、それをzip, bzip2、xzで圧縮してみる。

すると、圧縮後のファイルサイズと、圧縮前のサイズとの比が以下のように得られたとしよう[^iiwake]。

[^iiwake]: 全てデフォルトオプション。本当に比較するならランダムデータを渡すのは意味がないし圧縮速度も重視されるべきだが、本稿の執筆意図はそこにはない。

```
bzip2 1001294 (95.5)
zip 987896 (94.2%)
xz 968208 (92.3%)
```

上記のテキストをパワーポイントに貼り付けてみる。

MacのPowerPointの「挿入」タブを選び、「テキストボックス」を選んでから白紙のページの適当なところをクリックし、そこに貼り付ける。

![image0.png](/assets/images/mac_ppt_font/image0.png)

貼り付けた瞬間は何も起きないが、一度フォーカスが外れてからまたフォーカスが戻った瞬間・・・

![image1.png](/assets/images/mac_ppt_font/image1.png)

お気づきだろうか。zipとxzの数字のみ太字になり、bzip2だけ元のフォントのまま。なお、この状態で太くなった場所にカーソルをあわせても、特にボールド体も有効になっていないし、フォント(Mangal 本文)も変わっていない。

この現象の発生原因について調べてみた。

## 発動条件

結論から言うと、

```
数字を含まない英数字 (数字)
数字を含まない英数字 数字 (数字)
```

といったパターンのテキストをテキストボックスに貼り付けると、フォーカスが外れた際に「数字 (数字)」のフォントが太くなる。ただし、通常はこの現象がおきない「英数字 数字」というパターンでも、他のパターンと組み合わせることで発生させることができる。

## 例1

「テキスト 数字 (数字)」のパターンは、数字が太くなる。

<pre>
test 100 (100)
test 100 (100)
test 100 (100)
</pre>

というテキストを貼り付けると、全て太くなる。


貼り付けた直後。
![image2.png](/assets/images/mac_ppt_font/image2.png)

フォーカスが外れてから再フォーカス。もしくはテキストボックスの「枠」をクリック。

![image3.png](/assets/images/mac_ppt_font/image3.png)

## 例2

テキストに数字が含まれると、その列は太くならない。

<pre>
test 100 (100)
test1 100 (100)
test 100 (100)
</pre>

![image4.png](/assets/images/mac_ppt_font/image4.png)

## 例3

例2の「test1」の列だけ太くない状態で、「test1」の列を編集する(例えばtest1→test12にする)と、その行も太くなる。
![image5.png](/assets/images/mac_ppt_font/image5.png)

## 例4

テキストが日本語だと、貼り付けた瞬間に太くなる。

<pre>
日本語 100 (100)
日本語 100 (100)
test 100 (100)
</pre>

貼り付け直後。

![image6.png](/assets/images/mac_ppt_font/image6.png)

フォーカスが外れて、またテキストボックスにフォーカスがあたると、あわてて英語の行も太くなる。

![image7.png](/assets/images/mac_ppt_font/image7.png)

## 例5

後ろに括弧が無いと、この現象はおきない。

![image8.png](/assets/images/mac_ppt_font/image8.png)

## 例6

テキスト＋括弧のある数字だけでも発生する。
![image9.png](/assets/images/mac_ppt_font/image9.png)

## 例7

括弧の無い数字の列が増えると発生しない。

![image10.png](/assets/images/mac_ppt_font/image10.png)

## 例8

発生するパターンを組み合わせても発生する。

![image11.png](/assets/images/mac_ppt_font/image11.png)

## 例9

単独では発生しないパターンでも、発生するパターンと組み合わせると発生することがある。

![image12.png](/assets/images/mac_ppt_font/image12.png)

上記の例では、

<pre>
test 100
</pre>

は単独ではこの現象が発生しないパターンだが、他の奴と組み合わせることで太くなる。


## まとめ

Mac版のPowerPointにおける面妖なフォント変更について調べた。繰り返しになるがオートコレクト関連は全て切ってある(はず)。だいたいにおいてこういう面妖な現象の背景には原因が透けて見えるものだが、今回のケースについてはさっぱりわからない。
