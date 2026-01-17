---
layout: post
title: "LaTeXコンパイル時のコンソール出力を減らす"
tags: [document, qiita]
permalink: latex_quiet
---

# LaTeXコンパイル時のコンソール出力を減らす

## TL;DR

LaTeXでファイルをコンパイルする時にコンソールに出力されるメッセージを減らすには`-interaction batchmode`オプションをつける。

## 結果

LaTeXでなにかファイルをコンパイルすると、結構な量のメッセージが出る。手元のファイルを一個コンパイルしてみる。環境はMac上のTexLive2018。

```shell-session
$ latex hoge.tex
This is pdfTeX, Version 3.14159265-2.6-1.40.19 (TeX Live 2018) (preloaded format=latex)
 restricted \write18 enabled.
entering extended mode
(./hoge.tex
LaTeX2e <2018-04-01> patch level 2
Babel <3.18> and hyphenation patterns for 84 language(s) loaded.
(/usr/local/texlive/2018/texmf-dist/tex/latex/revtex4/revtex4.cls
Document Class: revtex4 2001/08/02 v4.0 (http://publish.aps.org/revtex4/ for do
cumentation)
ltxutil: portions licensed from W. E. Baxter (web@superscript.com)
ltxgrid: portions licensed from W. E. Baxter (web@superscript.com)
(/usr/local/texlive/2018/texmf-dist/tex/latex/url/url.sty)
(/usr/local/texlive/2018/texmf-dist/tex/latex/natbib/natbib.sty)
(/usr/local/texlive/2018/texmf-dist/tex/latex/revtex4/revsymb.sty))
(/usr/local/texlive/2018/texmf-dist/tex/latex/amsfonts/amssymb.sty
(/usr/local/texlive/2018/texmf-dist/tex/latex/amsfonts/amsfonts.sty))
(/usr/local/texlive/2018/texmf-dist/tex/latex/amsmath/amsmath.sty
For additional information on amsmath, use the `?' option.
(/usr/local/texlive/2018/texmf-dist/tex/latex/amsmath/amstext.sty
(/usr/local/texlive/2018/texmf-dist/tex/latex/amsmath/amsgen.sty))
(/usr/local/texlive/2018/texmf-dist/tex/latex/amsmath/amsbsy.sty)
...
```

どんなスタイルファイルを読み込んだとかどうとかだーっとコンソールに流れる。毎回これが出ると思うと鬱陶しい。特に、まだauxファイルが作成されていないと行数が増える。何行あるか数えてみた。

```shell-session
$  rm -f hoge.aux; latex hoge.tex | wc 
     446    1493   11488
$ rm -f hoge.aux; pdflatex hoge.tex | wc
     475    1536   14451
```

latexで446行、pdflatexで475行。ちと多すぎる。

で、「確か`-quiet`で出力が減ったはずだよなぁ」と思ってつけてみても、

```shell-session
latex: unrecognized option `-quiet'
```

とつれない返事。このオプションは処理系によってあったりなかったりするようだ。で、[StackOverflow](https://stackoverflow.com/a/1047728)に載ってた方法が、オプションとして`-interaction batchmode`をつけるというもの。やってみよう。

```shell-session
$ rm -f hoge.aux; latex -interaction batchmode hoge.tex 
This is pdfTeX, Version 3.14159265-2.6-1.40.19 (TeX Live 2018) (preloaded format=latex)
 restricted \write18 enabled.
entering extended mode

$ rm -f hoge.aux; pdflatex -interaction batchmode hoge.tex
This is pdfTeX, Version 3.14159265-2.6-1.40.19 (TeX Live 2018) (preloaded format=pdflatex)
 restricted \write18 enabled.
entering extended mode
```

どちらも三行になって、だいぶ読みやすくなった。

二行目の

```
restricted \write18 enabled.
```

は、「制限されている外部コマンドを使ったよ」というメッセージ。LaTeXは図の貼り込みなどで`\includegraphics`などを使うが、それが内部的に呼んでいるプリミティブなコマンドが`\write18`。`\write18`は外部コマンドを呼び出すが、セキュリティ上の問題から呼び出せるコマンドに制限がある。その制限内で`\write18`を使った、というメッセージ。

なお、外部コマンドの呼び出しは`-no-shell-escape`オプションで禁止できる。すると`\write18`も呼び出されなくなるので、さらに出力メッセージが減る。

```shell-session
$ rm -f hoge.aux; pdflatex -interaction batchmode -no-shell-escape hoge.tex
This is pdfTeX, Version 3.14159265-2.6-1.40.19 (TeX Live 2018) (preloaded format=pdflatex)
entering extended mode
```

ただし、このオプションをつけると図の貼り込みができなくなり、図が入る場所には

![image0.png](/assets/images/latex_quiet/image0.png)

と、ファイル名だけが表示されるようになるので注意。

ちなみに最初の挨拶、

```
This is pdfTeX, Version 3.14159265-2.6-1.40.19 (TeX Live 2018) (preloaded format=pdflatex)
```

はオプションでは消せないようだ。どうしても消したい人は`/dev/null`にリダイレクトしたりしているらしいが、重要な情報も消えてしまうので普段使いには不便。

## まとめ

LaTeXに`-interaction batchmode`を指定することで、コンソールに出力されるメッセージを減らせる。このオプションは「途中でエラーが出てもユーザの入力待ちにせずに終了せよ」という役割なのだが、なぜコンソール出力も減るかは知らない。このオプションをこの用途で使う日本語の記事が見つからなかったのでここで紹介してみた。
