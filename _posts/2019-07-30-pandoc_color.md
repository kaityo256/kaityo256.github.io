---
layout: post
title: "Pandocのシンタックスハイライトのカラースキーム"
tags: [document, web, qiita]
permalink: pandoc_color
---

# Pandocのシンタックスハイライトのカラースキーム

## はじめに

PandocでマークダウンをPDFに変換する際、`--highlight-style`オプションでカラースキームを指定できる。指摘できるカラースキームは以下の通り。

* pygments (デフォルト)
* kate
* monochrome
* espresso
* zenburn
* haddock
* tango

これらのカラースキームはそれぞれ同名のシンタックスハイライトエンジンに由来するらしいのだが、[公式マニュアル](https://pandoc.org/MANUAL.html#option--highlight-style)には、それぞれどんな色になるか例示がないみたいなので、ここにまとめておく。

コードは以下に置いておく。

[https://github.com/kaityo256/pandoc_highlight](https://github.com/kaityo256/pandoc_highlight)

## MarkdownからPDFへ

とりあえず日常の文書をMarkdownで書いて、なんか印刷したりメールで送ったりする時にPDFにする、という人は多いと思う。僕はVSCodeでMarkdown Previewでプレビューしながら書いて、[Markdown PDF](https://marketplace.visualstudio.com/items?itemName=yzane.markdown-pdf)でPDFに変換している。しかし、デフォルトでは数式が変換されない。例えばこんなマークダウンを書いたとする。

```text
## Fizz Buzzを書いてみる

数式はこちら。

$$
\textrm{Print} \quad
\begin{cases}
\textrm{FizzBuzz!} & \textrm{if} \quad i \bmod 15 =0 \\
\textrm{Fizz!} & \textrm{if} \quad i \bmod 3 =0 \\
\textrm{Buzz!} & \textrm{if} \quad i \bmod 5 =0 \\
i & \textrm{otherwise}
\end{cases}
$$

Pythonによるコード例はこちら。

```py
for i in range(1, 100):
    if i % 3 is 0 and i % 5 is 0:
        print("Fizz Buzz!")
    elif i % 3 is 0:
        print("Fizz!")
    elif i % 5 is 0:
        print("Buzz!")
    else:
        print(i)
```　
```

これを、VSCodeのMarkdown PDFで変換するとこんな感じに、数式を変換してくれない。

![image0.png](/assets/images/pandoc_color/image0.png)

というわけで、pandocを使って変換してみる。ついでに余白の調整とかもしれみよう。

```sh
pandoc test.md -s -o default.pdf --latex-engine=lualatex -V documentclass=ltjarticle -V geometry:margin=1in
```

これで変換したPDFはこんな感じになる。

![image1.png](/assets/images/pandoc_color/image1.png)

数式もいい感じで、シンタックスハイライトもあるのだが、コードブロックに背景色がないため、どこからどこまでかが分かりづらい。で、カラースキームを変えることにしたのだが、どれがどんな感じになるか探したら[海外にそれっぽいブログ](https://www.garrickadenbuie.com/blog/pandoc-syntax-highlighting-examples/)があるだけっぽかったので、Qiitaにまとめておきましょう、というのが本稿の趣旨である。


## Pandocのカラースキーム

Pandocで変換する際に`--highlight-style=pygments`などとするとカラースキームを指定できる。これで同じマークダウンファイルを異なるスキームでPDFに変換してみよう。

僕は古い人間なので、なんでもmakefileでやる癖があるのだが、とりあえずこんなのを書いてみる。

```mf
PDF=pygments.pdf kate.pdf monochrome.pdf espresso.pdf zenburn.pdf haddock.pdf tango.pdf
PANDOCOPT=--latex-engine=lualatex -V documentclass=ltjarticle -V geometry:margin=1in

all: $(PDF)

%.pdf: test.md
  pandoc $< -s -o $@ --highlight-style=$* $(PANDOCOPT)

.PHONY: clean

clean:
  rm -f $(PDF)
```

入力となる`test.md`を、それぞれのカラースキームでPDFに変換するサンプルである。

## pygments

デフォルトは`pygments`で、こんな感じになる。

<img width="703" alt="pygments.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/ef63beea-4601-6f71-935a-fafc6e608ac5.png">

わりといい感じなのだが、背景色がないのでコードブロックの区切りが分かりづらい。

## kate

`kate`だとこんな感じになる。

<img width="703" alt="kate.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/6b0f25b3-2066-8a02-6c12-78c0b52c0bc1.png">

文字列が赤く目立つかわり、`for`や`if`などの予約語が黒くなってますね。

## monochrome

`monochrome`は、文字通り白黒。

<img width="703" alt="monochrome.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/7d6bb0a3-0c70-4b0a-5e8c-aabf94253791.png">

## breezeDark

`breezeDark`は、背景色が黒になり、色も独特な感じ。

<img width="703" alt="breezedark.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/b6d05eec-30bc-2535-74cb-fadd6b3f2b2a.png">

## espresso

`espresso`はその名の通り、背景色がコーヒーっぽい色になっている。色も少し抑えめかな。

<img width="703" alt="espresso.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/afdd8597-09ce-a700-b0e5-65b5728a7077.png">

## zenburn

`zenburn`も背景は黒っぽい。色は淡い感じ。

<img width="703" alt="zenburn.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/fe0ec2da-27a1-8670-9135-76a9dc67852e.png">

## haddock

`haddock`の背景色は白。予約語が青というのは、なんとなく見慣れてる気がする。

<img width="703" alt="haddock.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/f96ba255-bfeb-b5c1-dbab-b9f3d0c7267d.png">

## tango

`tango`は、`haddock`に似ているが、背景色が淡いグレーになっている。それに伴い、予約語の色も少し控えめに。逆に数字などのリテラルが少し目立つかな。

<img width="703" alt="tango.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/4d728920-8ac5-8beb-fe29-c047ce619111.png">

## まとめ

Pandocによるコードブロックのカラースキームをまとめた。個人的には`tango`が好きかな。「文書を何で書くか」はわりと面倒で、そういう意味では様々なフォーマット間の変換ができるPandocは便利ですね。
