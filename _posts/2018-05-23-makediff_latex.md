---
layout: post
title: "make diffするとLaTeXソースファイルから差分PDFが作られるサンプル"
tags: [document, devtools, qiita]
permalink: makediff_latex
---

# make diffするとLaTeXソースファイルから差分PDFが作られるサンプル

## はじめに

査読のある論文誌に論文を投稿すると、査読コメントが返ってくる。たいていの場合は一発で通ることはなく、査読コメントに従って修正する必要があるだろう。この時、前回投稿した版との差分を明示したPDFを添付せよ、と言われることがある。Wordの差分表示などを想定しているのだろうが、LaTeXを使っていると、差分PDFを作るのがちょっとだけ面倒くさい。そこで`make diff`で差分PDFを作るmakefileを作って運用している。このmakefile、誰かの参考になるかもしれないのでちょっと紹介してみる。

サンプルファイルを以下に置いておく。

https://github.com/kaityo256/makelatexdiff

## 方針

差分抽出にはlatexdiffを用いる。

```shell-session
$ latexdiff before.tex after.tex > diff.tex
```

で、差分表示用のLaTeXファイルが作成されるので、それをコンパイルすれば良い。

差分を作成する元の版だが、GitやSubversionのタグで管理する方法もあると思われるが、とりあえずディレクトリで管理してしまうことにする。論文を投稿する時にsubmitというディレクトリを掘って、そこに投稿時のソースファイルを放り込んで置こう。

後に差分が必要になったら、カレントディレクトリと、その下のsubmitディレクトリにあるソース・ファイルから差分を作ることにしよう。ディレクトリ構成はこんな感じ(図や参考文献ファイルは省いてある)。

```
.
├── makefile
├── sample.tex
└── submit
    └── sample.tex
```

## Makefile

とりあえずmakefileはこんな感じになる。

```makefile
TARGET=sample
SRC=$(TARGET).tex
DVI=$(SRC:.tex=.dvi)
PDF=$(SRC:.tex=.pdf)
EPS=$(shell ls *.eps)
TEX=platex
DVIPDF=dvipdfmx
DIFFDIR=submit 

.SUFFIXES: .tex .dvi .pdf

all:$(PDF) 
	open $(PDF)

$(DVI): $(SRC) $(EPS)

$(PDF): $(DVI) 

.dvi.pdf:
	$(DVIPDF) $<

.tex.dvi: 
	$(TEX) $<
	$(TEX) $<

diff: diff.pdf
	open $<

diff.pdf: diff.tex

diff.tex: $(SRC)
	latexdiff $(DIFFDIR)/$(SRC) $(SRC) > diff.tex

clean:
	rm -f $(DVI) *.aux *.log *.toc *.pbm *.bmc $(PDF) diff.pdf
```

細かい説明は不要かと思うが、`TARGET`にLaTeXソースファイル名、`DIFFDIR`に差分表示の起点となる版が置いてあるディレクトリを指定すればそのまま使えると思う。`bibtex`を使う場合は、*.texから*.pdfを作成するルールにその処理も追加する必要がある。

このmakefileを使って、単に`make`するとカレントディレクトリの最新版がコンパイルされ、PDFが表示される。`make diff`すると、`DIFFDIR`に指定したディレクトリ以下のソースファイルと現在のソースファイルの差分を`diff.tex`に吐いてから、それをコンパイルして`diff.pdf`を作成し、表示する。

`diff.pdf`は例えばこんな表示になる。

![image0.png](/assets/images/makediff_latex/image0.png)

以前の版と比較して、削除されたところが赤、追加されたところが青く表示される。

## まとめ

makefileを使って差分PDFを作成するサンプルを作ってみた。普通は`make`でコンパイルし、たまに`make diff`すると自分でもどのように修正したのかわかって良い。僕はLaTeXのコンパイルにmakeを使っているので、差分表示もmakefileでできると便利だなと思って組み込んだんだけど、普通の人はTeXShopとかそういうのを使ってるんですかね？

ここでは単純にディレクトリでやったけど、おそらく文書はなんらかのVCSで管理されているだろうから、タグを使うのがスマートな気がする。まぁSubversionだとタグもディレクトリも似たようなものだけど・・・

どうでもいいけど、LaTeXのマクロとか書いているともういろいろつらいので、LaTeXの代替システム、例えば[SATySFi](https://github.com/gfngfn/SATySFi)みたいなものが発展することを期待。
