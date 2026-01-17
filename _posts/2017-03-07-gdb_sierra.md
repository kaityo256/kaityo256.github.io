---
layout: post
title: "macOS Sierraでgdbを使う"
tags: [mac, devtools, qiita]
permalink: gdb_sierra
---

# macOS Sierraでgdbを使う

## はじめに

MacOS X Sierraでgdbを使う方法をまとめた。

どうもMacはOSのバージョンごとにgdbを利用可能にする手続きがわりと違うようですごく困る。ほとんど[OS XでGDBを使う（ためにコード署名をする）](http://qiita.com/takahashim/items/204ffa698afe09bd4e28)で紹介されている内容でいいんだけど、コメント欄によればYosemiteでは`security add-trust`が必要だったようだが、僕の環境では不要だった。また、StackOverFlowとかでは[SierraでgdbがクラッシュするのはRuntime Integrity Protectionが悪さしているからなので無効にしろ](http://stackoverflow.com/a/40044913)とか書いてあるが、これも少なくとも僕の環境では不要だった。要するに、 Mavericks、Yosemite、Sierraでそれぞれ微妙にgdbの入れ方が違うっぽい。

で、先にSierraに入れる方法をまとめると、手元の環境(macOS Sierra 10.12.3、gdbは7.12.1)では

* キーチェーンアクセスで証明書を作成
* brewでgdbをインストール
* gdbにcodesignする
* .gdbinitに`set startup-with-shell off`と記述する
* taskgated(もしくはシステム全体)を再起動する

でいけた。

## コードサインされているか確認

まず、gdbがコード署名されているかどうか確認する。そのためには`codesign -vv`にgdbのフルパスを渡す。

```shell-session
$ codesign -vv `which gdb`
/usr/local/bin/gdb: code object is not signed at all
In architecture: x86_64
```

上記のような表示がされていたらコード署名されていない。

## 証明書の作成。

まず証明書を作成する。

```shell-session
$ open -a "Keychain Access.app"
```

としてキーチェーンアクセスを起動。メニューの「キーチェーンアクセス」「証明書アシスタント」「証明書を作成」。以下、特に記述がなければデフォルトのままとした。

まず、名前はgdb-certにしておく。証明書のタイプは「コード署名」。デフォルトを無効化。

![image0.png](/assets/images/gdb_sierra/image0.png)

有効期間。とりあえず10年くらいにしてみる。

![image1.png](/assets/images/gdb_sierra/image1.png)

証明書の場所はシステム。

![image2.png](/assets/images/gdb_sierra/image2.png)

作成完了。「キーチェーンアクセス」の「システム」に「gdb-cert」という証明書ができているのでそれをダブルクリックして、「常に信頼」する。

![image3.png](/assets/images/gdb_sierra/image3.png)

## gdbのインストール

brewでgdbをインストールする。

```shell-session
$ brew install gdb
(snip)

On 10.12 (Sierra) or later with SIP, you need to run this:

  echo "set startup-with-shell off" >> ~/.gdbinit
```

すると、「Sierraを使う場合には、.gdbinitに`set startup-with-shell off`と書いておけ」と言われるのでそうする。

```shell-session
$ echo "set startup-with-shell off" >> ~/.gdbinit
```

この状態のままではまだ使えない。実行してみると「コードにサインしろ」と言われる。

```shell-session
$ gdb ./a.out
(snip)
Unable to find Mach task port for process-id 947: (os/kern) failure (0x5).
 (please check gdb is codesigned - see taskgated(8))
```

## gdbにcodesign

gdbにcodesignする[^1]。

```shell-session
$ sudo codesign -s gdb-cert /usr/local/bin/gdb 
```

無事にコード署名されたかどうかは、`codesign -vv`で調べることができる。


```shell-session
$ codesign -vv `which gdb`
/usr/local/bin/gdb: valid on disk
/usr/local/bin/gdb: satisfies its Designated Requirement
```

上記のような表示がされたらコード署名されている。

taskgatedを再起動する。psでプロセス番号を調べてkillすると、勝手に再起動する。

```shell-session
$ ps aux | grep taskgated 
$ sudo kill XXX 
```

もしくは単にシステムを再起動しても良い。

以上でgdbが使えるようになったはず。

```shell-session
$ gdb ./a.out
$ (gdb) r
Starting program: /Users/hogehoge/a.out 
[New Thread 0x1403 of process 1042]
warning: unhandled dyld version (15)
[Inferior 1 (process 1042) exited normally]
```

## まとめ

しばらくlldb使ってたんだけど、我慢できなくなってgdbにした。細かいところでいろいろ違うのと、lldbのguiモードに慣れなかったんだよね。gdb --tuiがわりと好きなので。とりあえずこれでgdbが使えるようになったからいいんだけど、 またOSのバージョンが変わったら方法が変わりそうで嫌だなぁ。

## 参考

* [OS XでGDBを使う（ためにコード署名をする）](http://qiita.com/takahashim/items/204ffa698afe09bd4e28)
* [OS X に brew で gdb をインストール](http://qiita.com/melos/items/624f5fdc1d05c83a6e5e)

[^1]: なお、既にcodesign済みで、しかもその元の証明書を消しちゃったとかそういう場合、コードにつけたサインを消す手段もあるようだが、素直に`brew uninstall gdb; brew install gdb`するのが早かった。
