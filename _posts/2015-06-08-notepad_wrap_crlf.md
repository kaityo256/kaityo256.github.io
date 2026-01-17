---
layout: post
title: "Windowsメモ帳の「右端で折り返す」で入る謎の改行コード"
tags: [web, qiita]
permalink: notepad_wrap_crlf
---

# Windowsメモ帳の「右端で折り返す」で入る謎の改行コード

## 概要

[Windowsの「メモ帳」で「右端で折り返す」にすると「右端」で勝手に改行される件について](http://d.hatena.ne.jp/takemita/20110119/p2) でも報告があるが、Windowsのメモ帳の「右端で改行」の動作がわりとファンタジック(同僚氏談)だったのでまとめてみた。

**注：** 本挙動はWindows 7までは再現しますが、Windows 10では修正されているそうです。Windows 8でどうなっているかは手元に無いのでわかりません。

## 再現手順

* Windowsのメモ帳を起動し、「書式」の「右端で折り返す」にチェックを入れてから、長い文章を入力する。 この状態では、ウィンドウサイズを変えると、入力された内容が追従する。

 ウィンドウサイズ変える前
![image0.png](/assets/images/notepad_wrap_crlf/image0.png)

ウィンドウサイズ変えた後(ちゃんと追従する)
![image1.png](/assets/images/notepad_wrap_crlf/image1.png)

* 「名前をつけて保存」する(例えばtest.txt)。すると、右端に改行コードが挿入され、ウィンドウサイズを変えても入力された内容が追従しなくなる。

保存直後
![image2.png](/assets/images/notepad_wrap_crlf/image2.png)

![image3.png](/assets/images/notepad_wrap_crlf/image3.png)

* メモ帳の内容を別のエディタ(例えばsakuraエディタ)にコピペすると、改行が入っていること、さらに挿入されたコードが「CRCRLF」であることがわかる。ちなみにメモ帳で開いたまま、先ほど保存したファイル(test.txt)を別のエディタで開いても、改行コードは入っていない。つまり、ファイルには保存していない。 

![image4.png](/assets/images/notepad_wrap_crlf/image4.png)

* ここからファンタジー度が増してくる。メモ帳で「保存」してからウィンドウサイズを変更しても内容が追従しないが、その追従していない状態でさらに「保存」してから、「全て選択(Ctrl+A)」すると、慌てて追従する。 

* サイズ変更の方法によっては、表示が正しくなくなる。「保存」してから、「全て選択(Ctrl+A)」した後に、ウィンドウサイズを大きくして、さらに「保存」すると、画面更新に失敗し、一時的に画面に本来よりも多い文字数が表示されてしまう。一度フォーカスを外してから戻すと正しく表示される。

全選択して「保存」
![image5.png](/assets/images/notepad_wrap_crlf/image5.png)

ウィンドウサイズを変えてから「保存」。選択されていない文字が出現する。
![image6.png](/assets/images/notepad_wrap_crlf/image6.png)

## コード「CRCRLF」

「表示では改行されているが、保存されない」という改行コードは「CRCRLF」で表現されている。そこで、CRCRLFを吐くコードを書いてみる。

```cpp
#include<stdio.h>

int
main(void){
  const char cr = 0x0d;
  const char lf = 0x0a;
  for(int i=0;i<10;i++){
    printf("%c%c%c%c",'a',cr,cr,lf);
  }
}
```

上記を実行して、test.txtに吐く。

```shell-session
$ g++ test.cc
$ ./a.out > test.txt
$ cat test.txt
a
a
a
a
a
a
a
a
a
a

```

メモ帳で読み込んで「右端で改行」にチェックは入った状態で「保存」すると、改行が消える。

```shell-session
$ cat test.txt
aaaaaaaaaa
````

## まとめ

Windowsのメモ帳は、「右端で改行」をするときには内部的に「CRCRLF」を挿入するが、これは「ファイルに保存されない」のではなく、「保存」するときに自動で削除されている。別のプログラムで作成された、CRCRLFを含むテキストを読み込んで保存するときにも削除する。
