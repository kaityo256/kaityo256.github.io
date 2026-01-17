---
layout: post
title: LuaLaTeXとunicode-mathとboldsymbolの組み合わせの話
tags: [zenn, document]
permalink: unicode_math_lualatex
---
## TL;DR

* `unicode-math`とLuaLaTeXと`\boldsymbol`を組み合わせると、PDFで太字にならない
* PandocからLuaLaTeXを使ってPDFを生成する時に`\boldsymbol`が効かないのはこれが原因
* LuaLaTeXと`\boldsymbol`の組み合わせなら大丈夫
* 簡単な対応策は、太字だが斜体にならない`\mathbf`を使うこと
* どうしても太字かつ斜体にしたければ、プリアンブルに以下を追加。

```tex
\setmainfont{XITS}
\setmathfont{XITS Math}
\setmathfont[version=bold,FakeBold=3.5]{XITS Math}
```

(2023年7月15日追記)

[奥村さん](https://twitter.com/h_okumura)から`symbfit`を使うと良い、と教えていただきました。確かにLuaLaTeX+`unicode-math`の組み合わせでも`\symbfit`なら太字かつ斜体になります。VSCodeのプレビューは対応していませんが、GitHubのプレビューは[対応している](https://gist.github.com/kaityo256/0e37ba4e0b0b6de8c213b1b868e0e51c)ようです。


## 現象

### Markdown+Pandoc+LuaLatex

僕はMarkdownでノートを書き、PandocでPDF化しているのだが、数式を含むため、PDF化にLuaLaTeXを使っている。この時、`\boldsymbol`が太字にならないことに困っていた。

例えば、

```md
# test

$$
\boldsymbol{r}=r
$$
```

みたいなMarkdownを書いて、

```sh
pandoc test.md -o test.pdf --pdf-engine=lualatex -V documentclass=ltjarticle
```

で変換すると、

![ng1](/assets/images/unicode_math_lualatex/ng1.png)

のように、太字にならない。

特にエラーも警告も出ず、ただ出力されるPDFで`\boldsymbol`が無視されるらしい。地道な二分探索の結果、以下のようなことがわかった。

### LuaLaTeX+boldsymbol

まず、LuaLaTeX+boldsymbolの組み合わせは問題ない。こんなTeXファイルを書いて

```tex
\documentclass{ltjarticle}
\usepackage{amsmath}
\begin{document}
$$
  \boldsymbol{r} = r
$$
\end{document}
```

```sh
lualatex test
```

としてPDFを作ると、ちゃんと太字になる。

![ok1](/assets/images/unicode_math_lualatex/ok1.png)

### LuaLaTeX+unicode-math+boldsymbol

しかし、`unicode-math`パッケージを使うと、太字にならない。

```tex
\documentclass{ltjarticle}
\usepackage{amsmath}
\usepackage{unicode-math} %% ←これを追加
\begin{document}
$$
  \boldsymbol{r} = r
$$
\end{document}
```

```sh
lualatex test
```

![ng2](/assets/images/unicode_math_lualatex/ng2.png)

## 対応策

Pandocから数式を含むMarkdownをLuaLaTeXでPDF化した時、`\boldsymbol`が使えなかったのはLuaLaTeXと`unicode-math`の組み合わせの問題。Pandocから`unicode-math`を出力しないようにする方法も探したのだが、そもそも`\boldsymbol`が非推奨っぽい。とりあえず対応策を2つ見つけた。

### mathbfを使う

よくわかっていないが、ベクトルを表す時に「太字かつ斜体」を使うのは日本独自っぽい(?)らしく、単に太字にしたければ`\mathbf`を使えば良いそうだ。

```md
# test

$$
\mathbf{r}=r
$$
```

```sh
pandoc test.md -o test.pdf --pdf-engine=lualatex -V documentclass=ltjarticle
```

以下のような出力となる。

![ok2](/assets/images/unicode_math_lualatex/ok2.png)

### Poorman's boldsymbolを使う

[ここ](https://tex.stackexchange.com/a/55417)にあった解決策。プリアンブルに以下を記述する。

```tex
\setmainfont{XITS}
\setmathfont{XITS Math}
\setmathfont[version=bold,FakeBold=3.5]{XITS Math}
```

例えば、全体のTeXファイルはこうなる。

```tex
\documentclass{ltjarticle}
\usepackage{amsmath}
\usepackage{unicode-math} %% ←これがあると太字にならない
%% ↓以下を追加
\setmainfont{XITS}
\setmathfont{XITS Math}
\setmathfont[version=bold,FakeBold=3.5]{XITS Math}

\begin{document}
$$
    \boldsymbol{r} = r
$$
\end{document}
```

出力はこんな感じ。

![ok3](/assets/images/unicode_math_lualatex/ok3.png)

やや癖のあるフォントだが、一応できる。

### Poorman's boldsymbolをPandocから利用する

上記の解決策をPandocから利用するには、TeXのテンプレートを使う。

```tex
\setmainfont{XITS}
\setmathfont{XITS Math}
\setmathfont[version=bold,FakeBold=3.5]{XITS Math}
```

という内容の`template.tex`を用意しておき、

```md
# test

$$
\boldsymbol{r}=r
$$
```

という内容の`test.md`があるディレクトリで、

```sh
pandoc test.md -o test.pdf --pdf-engine=lualatex -V documentclass=ltjarticle -H ./template.tex
```

としてPDFに変換すると、以下のような出力となる。

![ok3](/assets/images/unicode_math_lualatex/ok3.png)

### (2023年7月15日追記)symbfitを利用する

`\symbfit`を利用すれば、LuaLaTeXと`unicode-math`の組み合わせでも太字かつ斜体になる。

```md
# test

$$
\symbfit{r}=r
$$
```

```sh
pandoc test.md -o test.pdf --pdf-engine=lualatex -V documentclass=ltjarticle
```

出力はこんな感じ。

![ok5](/assets/images/unicode_math_lualatex/ok5.png)

## まとめ

LaTeXでベクトルを表す時、太字＋斜体にすると問題が多いので、単なる太字の`\mathbf`を使うか、素直に`\vec`を使うのが良さそう。

タイトルに「LuaLaTeXの……」と書いたが、他のLaTeXエンジンではどうなるのかまでは調べていない。

