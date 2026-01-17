---
layout: post
title: "Windowsの右クリックメニューに「VSCodeで開く」を追加する"
tags: [web, devtools, qiita]
permalink: vscode_menu
---

# Windowsの右クリックメニューに「VSCodeで開く」を追加する

## TL;DR

* Windowsで右クリックメニューに「VS Codeで開く(Open With Code)」を追加するには、VS Codeをインストール時に「エクスプローラーのファイル/ディレクトリコンテキストメニューに[Codeで開く]アクションを追加する」にチェックを入れて、インストールする
* すでにVS Codeをインストール済みでも、上書きインストールして、上記の手続きをすればよい
* レジストリをいじる必要はない

## 手順

もう、TL;DRで言いたいことはいったんだけど、ググったらレジストリをいじる記事しか見つからなかったので。

WindowsでVS Codeを使っていて、「いまエクスプローラで開いているフォルダをVS Codeの「フォルダを開く」で開きたい」ということがよくある。この時、右クリックメニューに「VS Codeで開く」があると便利だ。もちろんレジストリをいじれば可能なのだが、実はVS Codeを再インストールするだけでできるようになる。

既にVS Codeをインストール済みでも、上書き再インストールしてしまおう。

https://code.visualstudio.com/

に行って、「Download for Windows」をクリックしてインストールを開始しよう。

<img width="374" alt="vscode.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/79762277-ba71-692e-4f74-4fbeabae7495.png">

インストーラで上記のような画面がでてきたら、「エクスプローラーのファイル/コンテキストメニューに[Code で開く]アクションを追加する」にチェックを入れて、「次へ」を押してインストールすればよい。

* 「ファイル」のコンテキストメニューに追加した場合、ファイルを右クリックしてでてくるメニューの「Open with Code」を実行すると、そのファイルを開けるようになる。
* 「ディレクトリ」のコンテキストメニューに追加した場合、ディレクトリを右クリックして出てくるメニューの「Open with Code」を実行すると、そのディレクトリをVS Codeで「フォルダを開く」で開う動作になる。

すでにVS Codeを入れて、いろいろ設定している場合でも、上書きインストールで設定は消えない……と思う。自己責任でどうぞ。

インストール後、適当なファイルなりフォルダなりで右クリックして、

<img width="175" alt="menu.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/79744/a64f3ac6-25b1-7147-6e03-d5cf0ab203b6.png">

上記のように「Open with Code」が表示されていれば成功。
