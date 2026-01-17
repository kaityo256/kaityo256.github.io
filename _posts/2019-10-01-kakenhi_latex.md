---
layout: post
title: "Mac上のVS Codeで科研費LaTeXをビルドする"
tags: [document, devtools, qiita]
permalink: kakenhi_latex
---

# Mac上のVS Codeで科研費LaTeXをビルドする


## TL;DR

1. LaTeXファイルのあるディレクトリに`.vscode`というディレクトリを掘る
2. その中に[このファイル](https://gist.github.com/kaityo256/b5354af9719e1614fa4d3bdf81d6e0bd)を`settings.json`という名前で保存する
3. VS CodeでLaTeXファイルのあるディレクトリを開く
4. 科研費LaTeXを含む日本語LaTeXファイルがVS Codeでビルドできるようになる

## はじめに

科研費、書いてますか？＞挨拶

LaTeXの編集をVS Codeでやっている人も多いと思いますが、VS Codeはデフォルトでは日本語LaTeXに対応していません。普段からVS Codeで日本語LaTeX文書を書いている人はともかく、急に日本語を書くことになって設定方法がわからなくなった人(＝私)向けに設定方法を書いておきます。


## ローカル環境の確認

## コンパイル確認

まずはローカルで科研費LaTeXのコンパイルができることを確認しておきましょう。

[科研費LaTeX](http://osksn2.hep.sci.osaka-u.ac.jp/~taku/kakenhiLaTeX/)のページに行って、作者に感謝の気持ちを捧げてから、適当なファイル、例えば基盤CのUTF Singleをダウンロードして、展開しましょう。

```sh
$ unzip kiban_c_utf_single_20190904.zip
$ cd kiban_c_utf_single
```

コンパイル、PDF化ができることを確認します。

```sh
$ platex kiban_c.tex
$ platex kiban_c.tex
$ dvipdfmx kiban_c
```

こんなPDFができれば確認完了です。

![image0.png](/assets/images/kakenhi_latex/image0.png)

## エラーの確認

VS Codeから実行するには、エラーが起きた時に入力待ちになっては困ります。わざとコマンドをミスして、エラーで止まらないコマンドを確認しておきましょう。

わざと`\newcom1mand`という命令を入れてコンパイルします。

```sh
$ platex kiban_c.tex
! Undefined control sequence.
l.15 \newcom
            1mand{\研究課題名}{象の卵}
```

入力待ちになりました。エラーで入力待ちにしたくない場合、`platex`を使うなら`-interaction=nonstopmode`を指定します。

```sh
$ platex -interaction=nonstopmode kiban_c.tex
(snip)
! Undefined control sequence.
l.15 \newcom
            1mand{\研究課題名}{象の卵}

! LaTeX Error: Missing \begin{document}.
(snip)
Output written on kiban_c.dvi (8 pages, 14204 bytes).
Transcript written on kiban_c.log.
```

最後まで走りました。

## VS Codeでの確認

では、VS Codeで`kiban_c.tex`を開いてみましょう。LaTeX Workshopプラグインを入れてなければ入れておきます。

ファイルを保存するとLaTeX Workshopのレシピが走って、こんなエラーが出ます。

```txt
Latexmk: This is Latexmk, John Collins, 25 October 2018, version: 4.61.
Rule 'pdflatex': Rules & subrules not known to be previously run:
   pdflatex
Rule 'pdflatex': The following rules & subrules became out-of-date:
      'pdflatex'
(snip)udline.sty:2: Undefined control sequence.
\GenericError  ...                                
                                                    #4  \errhelp \@err@     ...
l.2 ...マクロ ver2.52：ロードします]
```

LaTeX Workshopにはレシピがいくつか用意されています。今回は`Latexmk`が走りましたが、日本語に対応していないために動きません。

なお、レシピの確認は、Shift+Command+Pで出てくるコマンドパレットでBuild with recipeを探すとできます。2019年10月現在、デフォルトでは

* latexmk 🔃
* latexmk (latexmkrc)
* latexmk (lualatex)
* pdflatex ➞ bibtex ➞ pdflatex × 2

の４つが定義されています。これはdefaultSettings.jsonに以下の様に定義されています。

```json
	"latex-workshop.latex.recipes": [
		{
			"name": "latexmk 🔃",
			"tools": [
				"latexmk"
			]
		},
		{
			"name": "latexmk (latexmkrc)",
			"tools": [
				"latexmk_rconly"
			]
		},
		{
			"name": "latexmk (lualatex)",
			"tools": [
				"lualatexmk"
			]
		},
		{
			"name": "pdflatex ➞ bibtex ➞ pdflatex × 2",
			"tools": [
				"pdflatex",
				"bibtex",
				"pdflatex",
				"pdflatex"
			]
		}
	],
```

また、Recipeで参照されているpdflatexなどの実行方法はToolで定義されています。

```json
"latex-workshop.latex.tools": [
		{
			"name": "latexmk",
			"command": "latexmk",
			"args": [
				"-synctex=1",
				"-interaction=nonstopmode",
				"-file-line-error",
				"-pdf",
				"-outdir=%OUTDIR%",
				"%DOC%"
			],
			"env": {}
		},
		{
			"name": "lualatexmk",
			"command": "latexmk",
			"args": [
				"-synctex=1",
				"-interaction=nonstopmode",
				"-file-line-error",
				"-lualatex",
				"-outdir=%OUTDIR%",
				"%DOC%"
			],
			"env": {}
		},
		{
			"name": "latexmk_rconly",
			"command": "latexmk",
			"args": [
				"%DOC%"
			],
			"env": {}
		},
		{
			"name": "pdflatex",
			"command": "pdflatex",
			"args": [
				"-synctex=1",
				"-interaction=nonstopmode",
				"-file-line-error",
				"%DOC%"
			],
			"env": {}
		},
		{
			"name": "bibtex",
			"command": "bibtex",
			"args": [
				"%DOCFILE%"
			],
			"env": {}
		}
	],
```

## ローカル設定

さて本題です。これから科研費LaTeX用に設定をいじるわけですが、全体の設定を変えるのはやめたほうが良いと思います。そこで、先程展開した科研費LaTeXのディレクトリにVS Codeの設定を書きましょう。VS Codeが開くディレクトリに .vscode/settings.jsonがあると読み込まれ、デフォルトの設定を上書きます。

先程のディレクトリ`kiban_c_utf_single`に、`.vscode`というディレクトリを掘って、そこに以下の内容のファイルを作りましょう。

```json
{
	"latex-workshop.latex.recipes": [
		{
			"name": "platex*2+dvipdfmx",
			"tools": [
				"platex",
				"platex",
				"dvipdfmx"
			]
		}
	],
	"latex-workshop.latex.tools": [
		{
			"name": "platex",
			"command": "platex",
			"args": [
				"-interaction=nonstopmode",
				"%DOC%"
			]
		},
		{
			"name": "dvipdfmx",
			"command": "dvipdfmx",
			"args": [
				"%DOC%"
			]
		}
	]
}
```

やっていることは、

* レシピとして`platex`を二回のあと`dvipdfmx`をかける
* その中身をツールとして記述する(ただファイル名を渡すだけ)

です。

この状態で、`kiban_c.tex`のあるディレクトリをVS Codeで開きましょう。

```sh
$ code .
```

`kiban_c.tex`を開き、コマンドパレットから`LaTeX Workshop: Build with recipe`を実行して、`Please Select a LaTeX Recipe`の画面で、`platex*2+dvipdfmx`しか表示されなければ正しく読み込まれています。

あとはファイルを保存するたびに勝手にPDFが作られるようになります。LaTeX Workshopの「View LaTeX PDF」を選ぶと、PDFが表示されます。あとはこれを見ながら修正していきましょう。

bibtexなどを使いたい場合や、別のビルドコマンドを使いたい場合は、上記の`settings.json`を修正してください。

## まとめ

Mac上のVS Codeで科研費LaTeXをビルドするには

* 端末でビルドコマンドを確認し
* そのビルドコマンドを.vscode/settings.jsonにレシピとツールとして記述

すればOKです。

ではがんばって科研費書きましょう。皆さんに(僕にも)良い結果が出ますように！
