---
layout: post
title: "PowerPoint for Macが吐くPDFが重いんです"
tags: [mac, document, qiita]
permalink: ppt_pdf_heavy
---

# PowerPoint for Macが吐くPDFが重いんです

## TL;DR

* PowerPoint for Mac でpptxからpdfにエクスポートするとファイルサイズが異様に大きくなることがある
* 全く同じpptxファイルをWindowsのPowerPoint 2016でpdfにするとファイルサイズは小さくなる
* この違いの原因は続編の[Re: PowerPoint for Macが吐くPDFが重いんです](https://qiita.com/kaityo256/items/439f18343f4ef87dfdfa)を参照

## はじめに

PowerPointでスライド十数枚のプレゼン資料を作り、それを職場のメーリングリストに投げようとpdfにしたら、ファイルサイズが数十倍に膨れ上がった。

こんな軽い資料なのに10MB以上の添付ファイルにして添付するのも気が引けるので画像を圧縮したりためしたのだがなかなかサイズダウンできない。

そこで、そのファイルをWindowsに持っていき、WindowsのPowerPointでPDFにエクスポートしたらまっとうなサイズになった。以下、現象の再現手順を示す。

## 再現手順と現象

* 環境
  * PowerPoint for Mac 16.11.1
  * Windows PowerPoint 2016

## MacでPDF化

MacのPowerPointを開いて、「新しいプレゼンテーション」を選ぶ。こんな画面が出てくるはず。

![image0.png](/assets/images/ppt_pdf_heavy/image0.png)

適当な画像ファイル、例えば「いらすとや」の[重いものに苦しむ人のイラスト（会社員）](https://www.irasutoya.com/2016/09/blog-post_795.html)の画像をローカルに保存する。

![image1.png](/assets/images/ppt_pdf_heavy/image1.png)

ダウンロードしたファイルをスライドにドラッグ＆ドロップして、さらにそのスライドをコピーで5枚に増やす。

![image2.png](/assets/images/ppt_pdf_heavy/image2.png)

この状態で「test.pptx」という名前で保存する。

この時点でファイルサイズはこんな感じ。

```shell-session
$ ls -lh | awk '{print $5 " " $9}' 
 
352K omoi_businessman.png
393K test.pptx
```

352KBの画像ファイルだけを含むスライドなので、393KBのpptxというファイルサイズはまっとうに思える。

この状態で「エクスポート」でPDFファイルとして保存する。

```shell-session
$ ls -lh | awk '{print $5 " " $9}'

352K omoi_businessman.png
7.9M test.pdf
393K test.pptx
```

PDFのファイルサイズは7.9MB、pptxファイルの実に20倍以上に膨れ上がる。

## Macで画質調整

PowerPoint for Mac上で画質調整を試みる。イラストをダブルクリックすると「図の書式設定」タブが出てくるので、そこで「図の圧縮」を選ぶ。

![image3.png](/assets/images/ppt_pdf_heavy/image3.png)

「このファイル内のすべての画像」について、最低品質である「96ppi」を選んで品質を落とした後、「test_96ppi.pptx」として保存しよう。

```shell-session
$ ls -lh | awk '{print $5 " " $9}' 

352K omoi_businessman.png
7.9M test.pdf
393K test.pptx
246K test_96ppi.pptx
```

393KB→246KBとファイルサイズが落ちた。この状態でPDFファイルにエクスポートしよう。

```shell-session
$ ls -lh | awk '{print $5 " " $9}'
352K omoi_businessman.png
7.9M test.pdf
393K test.pptx
7.3M test_96ppi.pdf
246K test_96ppi.pptx
```

7.9MB→7.3MBと、たいして変わらない[^1]。

[^1]: 他のファイルで試したら、場合によっては画質を落としたほうがPDFファイルのサイズが大きくなることもあった。

## Windowsの場合

全く同じ手順を、WindowsのPowerPointでやってみる。まずpptxを作った直後。

```shell-session
$ ls -lh | awk '{print $5 " " $9}' 
 
352K omoi_businessman.png
391K test.pptx
```

Mac版とたいして変わらないファイルサイズになった。この状態からPDFにエクスポートする。「最適化」オプションがあるが、「標準」を選ぶ。

```shell-session
$ ls -lh | awk '{print $5 " " $9}' 
 
352K omoi_businessman.png
56K test.pdf
391K test.pptx
```

56KBのPDFを作ってきた。

## Macで作ったpptxファイルをWindows側で変換

Macで作ったファイルをWindowsマシンに写してPDF化してみる。ファイル名は`test_mac.pptx`に変えておく。

```shell-session
$ ls -lh | awk '{print $5 " " $9}' 
 
352K omoi_businessman.png
56K test.pdf
391K test.pptx
56K test_mac.pdf
393K test_mac.pptx
```

やはり56KBになった。

## Windowsで作ったpptxファイルをMac側で変換

逆に、Windowsで作ったファイルをMacマシンに写してPDF化してみる。ファイル名は`test_win.pptx`に変えておく。

```shell-session
$ ls -lh | awk '{print $5 " " $9}'
 
352K omoi_businessman.png
7.9M test.pdf
393K test.pptx
7.3M test_96ppi.pdf
246K test_96ppi.pptx
14M test_win.pdf
391K test_win.pptx
```

14MBですってよ奥さん！

## まとめ

* Macで作った391KBのpptxファイルを
   * WindowsでPDF化すると56KBに
   * MacでPDF化すると7.9MBに
* Windowsで作った393KBのpptxファイルを
   * WindowsでPDF化すると56KBに
   * MacでPDF化すると14MBに


なんか[Wordさんは今日もお疲れです](https://qiita.com/kaityo256/items/c15889dbb7acb2632c6e)でもMac版のWordがかなりアホなことをしてたし、Office for Macはかなりアレだ、ということでFA？

## 追記 (2018年8月22日)

Powerpointのメニューで、環境設定>一般>印刷品質(用紙/PDF）の 「低」を選択するとファイルサイズがかなり小さくなる。詳細については[Re: PowerPoint for Macが吐くPDFが重いんです](https://qiita.com/kaityo256/items/439f18343f4ef87dfdfa)の2018年8月22日の追記部分を参照のこと。
