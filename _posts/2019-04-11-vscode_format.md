---
layout: post
title: "VSCodeでコピーする時に「書式なし」をデフォルトにする"
tags: [devtools, qiita]
permalink: vscode_format
---

# VSCodeでコピーする時に「書式なし」をデフォルトにする

## TL;DR

* VSCodeでコピーする際に、「書式なし」でクリップボードにコピーするためには「設定」の「テキストエディター」の「Copy With Syntax Highlighting」のチェックを外す
* この状態で「書式付き」でコピーするには、コマンドパレットから「Copy With Syntax Highlighting」を実行する。

なお、記事執筆時点のVSCodeのバージョンは1.33.0。

## はじめに

最終的にWordで提出しなければならない書類でも、最初はテキストエディタで書いて、最後に貼り付けて体裁を整える、ということをやっている人は多いと思う。しかし、最近のVSCodeはデフォルトでコピーが「書式つき」になっている。そうすると、例えばVSCodeで「プレーンテキスト」で書いているつもりが、Wordに貼り付けると背景色などがコピーされて困ることになる。

![image0.png](/assets/images/vscode_format/image0.png)

![image1.png](/assets/images/vscode_format/image1.png)


Wordなどは「形式を選択してペースト」のメニューがあるが、いちいちコンテキストメニューを開いたり、追加キーを押すのは面倒だし、ほとんどの場合「書式なし」で貼り付けたいような人は、デフォルトでそうなっていて欲しい。で、その方法があまりウェブに載っていなかった(すぐに見つからなかった)のでここに残しておく。

## 設定

デフォルトでコピーに書式を含めないようにするには、VSCodeのメニュー「Code」から「基本設定」→「設定」を選び、「テキストエディター」の「Copy With Syntax Highlighting」のチェックを外せばよい。設定の検索窓に「Copy With」とか入れるとすぐに見つかると思う。

![image2.png](/assets/images/vscode_format/image2.png)

以後、デフォルトでコピーが書式なしになる。

しかし、コードスニペットをコピーする時など、書式付きでコピーしたいこともたまにはあるだろう。その時には、該当範囲を選択してからコマンドパレットで「Copy With Syntax Highlighting」を選べばよい。

![image3.png](/assets/images/vscode_format/image3.png)

## 参考

やり方を知ってから調べると、Qiitaにも設定方法の記事があった。

* [[自分用] VSCode (on Mac)使い方メモ](https://qiita.com/suke_masa/items/9bd845c03064b3902886)
