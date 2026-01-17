---
layout: post
title: "Mail.appのデータをThunderbirdに手動で移行する"
tags: [mac, linux, qiita]
permalink: mailapp_thunderbird
---

# Mail.appのデータをThunderbirdに手動で移行する

## はじめに

Thunderbirdデータのインポートは、Apple Mail 5.0 以前のバージョンにしか対応していないらしい。ローカルにある大量のメールデータをなんとかして移行したい。そこで、EMLX to mbox converterを使って手動で移行する。以下、試すなら自己責任で。

## EMLX to mbox Converterの取得

以下よりダウンロードする。
http://www.cosmicsoft.net/emlxconvert.html

## emlxデータのコピー

emlxデータは/Users/username/Library/Mail/V2/Mailboxes以下にある。Mac Mailでローカルにフォルダを作っていれば、inbox.mboxなどのディレクトリがそこにあるはず。しかし、emlxファイルはさらにそこの階層深くに眠っている。EMLX to mbox converterは、emlxファイルそのものをドロップしてやらないといけないようだ。

仕方ないので、findコマンドで一括して見つけて、適当なディレクトリ(例えば~/mailtemp)にコピーし、そのディレクトリから一括してドロップしてやることにする。Macの端末のcpはxargsと相性が悪いので、rubyのワンライナーで。

```shell-session
$ find inbox.mbox -name *.emlx | ruby -ne 'file=$_.chomp;`cp #{file} ~/mailtemp`;puts file'
```

## EMLX to mbox Converterで変換

このあと、mailtempにある*.emlxファイルを一度にEMLX to mbox Converterに食わす。ファイルが全て表示されたら、Save mboxとし、例えばデスクトップにinbox.mboxというファイル名で置いておく。するとemlxファイルがまとめてmboxファイルに変換される。

## Thunderbirdのディレクトリにコピー

できたinbox.mboxの中にある「mbox」というファイルを、inbox.mboxという名前にリネームした上で、Thunderbirdのディレクトリにコピーする。

*作成されたnbox.mbox(これはディレクトリ)をそのままコピーするのではなく、その中にあるmboxというファイルをリネームした上でコピーすることに注意。*

コピー先は~/Library/Thunderbird/Profiles/hogehoge.default/Mail/Local Foldersとかいう名前になっているはず。ここに先ほど作成したinbox.mboxというファイルをコピーしてからThunderbirdを立ち上げると、ローカルフォルダの中に「inbox.mbox」というフォルダが作成されており、中のメールが読めるようになっているはず。

上記の作業を、Mail.appで作成したローカルフォルダの数だけ繰り返せば終了。繰り返しになるが、くれぐれも自己責任で。
