---
layout: post
title: "Homebrew 1.8.6でmkpasswdが動かない"
tags: [mac, linux, qiita]
permalink: homebew_mkpasswd
---

# Homebrew 1.8.6でmkpasswdが動かない

## はじめに

いつの頃からか、Macでmkpasswdが動かなくなった。おそらくMojaveからだと思うが自信がない。その暫定的な対処法を書いておく。

## 現象

mkpasswdはパスワード生成プログラムである。だいたいexpectというパッケージに入っている。Macなら

```sh
$ brew install expect
```

で入ると思う。実効するとデフォルトで8桁のランダムなパスワード候補を生成してくれる。

```sh
$ mkpasswd
E51jqq%Jx
```

ところが、Macである時から使えなくなった。

```sh
$ mkpasswd 
can't find package Expect
    while executing
"package require Expect"
    (file "/usr/local/bin/mkpasswd" line 6)
```

## 原因

原因は、Macに入っているｔｃｌshにexpectパッケージが無いから。先程のmkpasswdは、こんなスクリプトになっている。

```sh
#!/bin/sh
## -*- tcl -*-
## The next line is executed by /bin/sh, but not tcl \
exec tclsh "$0" ${1+"$@"}

package require Expect
```

このスクリプトは、/bin/shで実効され、さらにtclshに処理を移管する。tclshがこの、`package require Expect`を実効しようとしてエラーが起きる。

```sh
$ tclsh
% package require Expect
can't find package Expect
```

対策として、brewed-tclを使う方法が紹介されていた。

```sh
brew install tcl-tk --without-tcllib
brew install expect --with-brewed-tk
```

しかし、現状(Homebrew 1.8.6)では`tcl-tk`には`--without-tcllib`オプションは無いと言われ、`brew install expect --with-brewed-tk`後でもmkpasswdは使えない。

## 対策

これ、/bin/shからtclshに処理を移管してるのが問題なので、冒頭部分を削除して、/bin/shのままexpectを実行してやるようにすれば良い。

```sh
#!/bin/sh
#\
exec expect "$0" ${1+"$@"}
```

パッチにするとこんな感じ。

```patch
--- mkpasswd.org	2018-12-19 18:18:26.000000000 +0900
+++ mkpasswd	2018-12-19 18:16:42.000000000 +0900
@@ -1,10 +1,6 @@
 #!/bin/sh
-# -*- tcl -*-
-# The next line is executed by /bin/sh, but not tcl \
-exec tclsh "$0" ${1+"$@"}
-
-package require Expect
-
+#\
+exec expect "$0" ${1+"$@"}
 
 # mkpasswd - make a password, if username given, set it.
 # Author: Don Libes, NIST
```

上記のように直したファイルはちゃんと実行できる。

```sh
$ head -n 3 mkpasswd
#!/bin/sh
#\
exec expect "$0" ${1+"$@"}

$ ./mkpasswd
fbtQ.3Ty3

$ ./mkpasswd -l 12
iwL8aR2)nxwb
```

## まとめ

なぜだかわからないが、現状ではExpectパッケージが見えない(入っていない？）ので、とりあえず簡単なワークアラウンドだけここに書いておく。

## 参考にしたサイト

* https://trac.macports.org/ticket/31225
