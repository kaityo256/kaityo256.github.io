---
layout: post
title: "メーリングリストの過去ログとTwitter自動投稿"
tags: [web, linux, qiita]
permalink: ml_twitter
---

# メーリングリストの過去ログとTwitter自動投稿

## はじめに

メーリングリストを運用していると、その過去ログを自動生成したり、投稿があったらTwitterも連動させたくなるが、やってみるとわりと苦労する(した)。我々がやった方法がベストだとは思わないが、参考のために方法をまとめておく。

## 構成と仕組み

## 構成

* メーリングリスト管理：GNU Mailman
* 過去ログ管理: WordPress
* WordPressの記事への自動投稿：Postie (WordPressプラグイン)
* Twitterへの投稿: SNAP (WordPressプラグイン)

このうち、MailmanとWordPressはオンプレで運用している。

これらが、以下のような形で連動している。

![image0.png](/assets/images/ml_twitter/image0.png)

## メーリングリスト

メーリングリスト管理はなんでも良いが、我々は歴史的な事情でGNU Mailmanを使っている。最近だとGoogle Groupとか使うのが良いんでしょうか。それだと過去ログ管理も自動でできるみたいだし。

## 過去ログ

過去ログ表示にはWordPressを使った。要するにメール投稿できるブログがあればなんでも良いのだが、できれば独自DNSで運用したい、というニーズがあった。昔はGoogle Blogで、DNSを登録して自分のドメインのフリができたっぽいのだが、ある時期からドメイン偽装ができなくなった。いろいろ調べたのだが、公的な性格を持っているメーリングリストの過去ログを変なフリーサービスに載せるのも気が引けたので、結局オンプレでWordPressを立てて、そこに表示することにした。

具体的には、まずメーリングリストにWordPress記事投稿用のダミーアドレスを登録する。そして、WordPressにPostieというプラグインを入れる。

<img width="546" alt="postie_plugin.png" src="https://qiita-image-store.s3.amazonaws.com/0/79744/c6faf679-2916-b056-547d-d2558c5da44d.png">

このプラグインは、指定のメールアドレスを読みに行き、そこにメールが来ていたら記事として投稿してくれる。とりあえず投稿用メールアドレスを用意し、そこにメールを読みに行けるか、読みに行ったら記事化されるか、動作確認しよう。プラグインの設定の右側に動作確認ボタンがある。

<img width="299" alt="postie2.png" src="https://qiita-image-store.s3.amazonaws.com/0/79744/a7f5e972-6afe-8a5c-ac20-f7f222b47968.png">

投稿用アドレスにメールを投げて、Process Emailでメールを読みに行き、それが記事化されれば成功である。もしうまくいかなかった場合はDebugや設定テストをすると、問題箇所がわかるかもしれない。我々の場合はTLS絡みの設定がうまくいかず、なかなかメールを読み込めなくて苦労した。

通常は、投稿用メールアドレスにメールを送信できる人は限った方が良い。しかし、色んな人がそのメーリングリストに投稿する関係上、誰から送られて来たメールでも記事に載せる必要がある。そこで、設定で「誰でもメールで投稿可能」にチェックを入れる必要がある。

<img width="800" alt="postie1.png" src="https://qiita-image-store.s3.amazonaws.com/0/79744/cdfbf925-3fb1-63b1-a746-7786e2d2e185.png">

SPAMも記事化されてしまうので、この投稿用メールアドレスは他の人に知られてはならない。また、設定で「WordPressに登録されていないアカウントからのメール投稿があったら、誰の投稿とするか」という項目があるので、適当なWordPressアカウントを作って、そのアカウントが投稿したことにしよう。

## TwitterのAPIキー取得

さて、Twitter連携をするためには、まず、witter APIキーを取得しなければならないのだが、これがわりと面倒くさい。どうも最近面倒になったらしい。詳細は適当なサイトを参照してもらうことにして、ざっと

* 連携用のTwitterアカウントを作成し、ログインする
* https://developer.twitter.com/ に行く
* 作成したアカウントでDeveloper Accountを申請(apply)する
* 電話番号を設定していなければ設定する
* 何のために使うか、英語で説明を書く(何文字**以上**かけとか制約がある)
* 読み書きできる権限とする(Read and Writeでいいのかな？)
* 得られたAPI Key、API Secret、Access Key, Access Secretの4つを保存する。

といった手順になる。

途中、「このAPIキーを何に使うか」みたいな説明を英語で4項目にわけて300字以上かかなければいけなかったのだが、面倒になって「WordPressに投稿された記事をTwitterにも転送したいだけだよ。他に何を書けばいいんだよ」みたいに書いたらBANくらった。

いや、登録したてで何もつぶやいていないTwitterアカウントでDeveloper Accountを申請したのが怪しまれて自動BANされたんだろうけど・・・

具体的に何をしたか忘れたが、とにかく「私は人間です」みたいなことをしたらアクセスできるようになった。

## SNAPの設定

次に、「WordPressに記事が投稿されたら自動的にTwitterにも投稿する」ためのプラグイン、NextScripts: Social Networks Auto-Poster (SNAP)を入れる。

<img width="533" alt="SNAP_plugin.png" src="https://qiita-image-store.s3.amazonaws.com/0/79744/7931faed-fd30-0ad8-fd71-d48f9ed49753.png">

設定は、たとえば「[WordPressからTwitterへ自動投稿させる方法](https://hacknote.jp/archives/35063/)」を参照。TwitterアカウントとAPIキー四点セットを登録したら、テスト投稿ボタンを押して、実際に当該アカウントに内容がつぶやかれることを確認しよう。

ここで、デフォルトでは「毎日定時に処理」になっているが、即時反映させたいのでSNAPの設定で「Publish immediately」を選んでおく。

<img width="782" alt="snap4.png" src="https://qiita-image-store.s3.amazonaws.com/0/79744/056d600c-f3f3-fba4-7624-38f5002296a8.png">

ちなみに上記の設定は、WordPressの左のサイドメニューのこの辺にある。普通にプラグインの「設定」のところからはたどり着けないので注意。

<img width="155" alt="spap3.png" src="https://qiita-image-store.s3.amazonaws.com/0/79744/2930d0a6-b9c4-708e-eccd-b6993773f231.png">

ちなみに投稿内容は、デフォルトでは「タイトル」と「記事のURL」である。

<img width="748" alt="snap1.png" src="https://qiita-image-store.s3.amazonaws.com/0/79744/f0d51682-4f54-eb4b-5967-7b8663878169.png">

上記設定のMessage Formatをいじれば投稿内容を編集できるので、好きなように設定しよう。下にある「Submit Test Post to Twitter」がテスト投稿ボタンである。

## まとめ

メーリングリストの過去ログ作成とTwitter連携をやってみた。自分でも「やりたいことにたいして道具立てが大仰かな」という気がしなくもない。例えばメーリングリスト管理と過去ログ作成をオンプレでやっているが、URLとかにこだわりがないのならGoogle Groupとかで良い気がする。ただ、Twitter連携をするためにはTwitterにメールで投稿する手段を作らないといけないが、調べた範囲ではあまり良いサービスが見つからなかった(あるにはあったのだが、サポート面で不安があった)。自分で作ってもたいしたことなさそうだが、それよりは誰かが作った信頼できる仕組みを使った方がよかろう。そんなわけでWordPressのプラグインで対応した。

正直な話、もうメーリングリストというメディアはそろそろobsoleteな気がしなくもない。しかし、まだいろんなところでメーリングリストは運用されており、かつ「いつのまにかそのメーリングリストの管理人になっていた」というような人(例えば俺)もいるだろう。そんな人が過去ログとかTwitter連携とかやることになった時、本稿が少しでも参考になれば幸いである。
