---
layout: post
title: WSLでopenコマンドを用意する
tags: [zenn, linux]
permalink: open_command_on_wsl
---
## TL;DR

WSLでMacのopenコマンドみたいなのが欲しければ、以下を`.zshrc`に書く。

```sh
function open() {
    if [ $# != 1 ]; then
        explorer.exe .
    else
        if [ -e $1 ]; then
            explorer.exe $(wslpath -w $1) 2> /dev/null
        else
            echo "open: $1 : No such file or directory" 
        fi
    fi
}
```

zshでしか試していないが、たぶんbashでも似たような感じでいけると思う。

## 動作原理

Macのターミナルでは、`open filename`とすると、そのファイルを関連付けられたアプリで開くことができる。また、`open .`などとするとFinderでカレントディレクトリが開いて便利だ。

WindowsのWSLで似たようなことがしたくて、

```sh
alias open=explorer.exe
```

としていた。これでもほとんどの場合はうまくいくのだが、二つ問題があった。

一つは、デスクトップに同名のファイルがあるとそちらを開いてしまうこと。おそらくエクスプローラーのパスの検索順の問題だと思われる。

もう一つは、カレントディレクトリ以外のファイルを開けない事。例えば、カレントディレクトリに`hoge.pdf`があるなら

```sh
open hoge.pdf
```

はできるが、

```sh
open dir/hoge.pdf
open ../hoge.pdf
```

などはできない。そこで、`wslpath -w`でパスを解決してからexplorer.exeにわたすことで、カレントディレクトリ以外のファイルにも対応している。

まず引数の数をチェックし、引数なしの場合はカレントディレクトリを開くようにする。

```sh
function open() {
    if [ $# != 1 ]; then
        explorer.exe .
    fi
}
```

次に、引数が指定された場合、そのファイルの存在確認をしよう。ファイルがあればそのまま開き、そうでなければエラーを表示する。

```sh
if [ -e $1 ]; then
    explorer.exe $(wslpath -w $1) 2> /dev/null
else
    echo "open: $1 : No such file or directory" 
fi
```

以上をまとめると冒頭のコマンドになる。

## cmd.exeによるopen

:::message alert
2024年12月10日現在、cmd.exeからWSL上のファイルが開けなくなった。セキュリティの問題？以下は古い情報。
:::

ということを愚痴ったら、「[cmd.exeを使うのはどうか？](https://www.iplab.cs.tsukuba.ac.jp/~takakura/blog/20200715/)」という方法を[教えていただいた](https://twitter.com/djed736/status/1501355520749293571)。

```sh
cmd.exe /c start filename
```

として実行することで、ファイルを開くことができる。ただし、wslpathを使って、WSLのパスをWindows側に変換してやる必要がある。そこで、シェルの関数にして

```sh
function open() { cmd.exe /c start $(wslpath -w $1) }
```

とすれば、ほぼ所望の動作になる。

しかし、これでファイルを開くと、いちいち

```sh
$ open test.pdf
'\\wsl.localhost\Ubuntu\home\username\path\to\file'
上記の現在のディレクトリで CMD.EXE を開始しました。
UNC パスはサポートされません。Windows ディレクトリを既定で使用します。
```

と言われてしまう。また、存在しないファイルを指定した場合、コマンドプロンプトが開いてしまう。さらに、引数を指定しないで実行した場合「このusageリンクを開くには新しいアプリが必要です」みたいなダイアログが出てしまう。

そこで

```sh
cmd.exe /c start $(wslpath -w $1) 2> /dev/null
```

とすることでメッセージを隠す。

## 参考URL

* [WSLでもopenコマンドを使えるようにする](https://www.iplab.cs.tsukuba.ac.jp/~takakura/blog/20200715/)
