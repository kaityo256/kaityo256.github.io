---
layout: post
title: "WindowsのVSCodeでclang-formatが効かない時の確認と対処"
categories: C, C++, LLVM, clang-format, VSCode
permalink: clang-format
---

# WindowsのVSCodeでclang-formatが効かない時の確認と対処

## TL;DR

* 症状：WindowsのVSCodeでC/C++のファイルを編集時、関連プラグインがインストールされていて、かつ「Format on Save」が有効になっているにも関わらず保存時にフォーマッタが走らない。
* 確認方法：C/C++のファイルを開いた状態で、コマンドパレットから「ドキュメントのフォーマット (Format Document)」を実行すると、右下に「write EPIPE」というエラーが出たらこれ。
* 対応： [ここ](https://releases.llvm.org/download.html)から、「Windows 64 bit」をダウンロードしてLLVMをインストールし、clang-formatにパスを通し、VS Codeを再起動する。
* [関連issue](https://github.com/xaverh/vscode-clang-format-provider/issues/83)

## 詳細

もうTL;DRに書いた通りなんだけれど、WindowsのVSCodeでclang-formatが効かなくなった時の覚書。

VSCodeでC/C++のファイルを編集する際、まずC/C++のプラグインを入れると思う。ついでにClang-Formatプラグインを入れて、保存時にフォーマッタが走るようにする人も多いだろう。しかし、いつのまにかこれが動かなくなった。

具体的には、

* Windows 10
* VSCode 1.43.2
* C/C++ プラグイン 0.27.0
* Clang-Format プラグイン 1.9.0

の組み合わせで、保存時にフォーマッタが走ってくれない。

明示的にフォーマットさせるため、Ctrl+Shift+Pでコマンドパレット出して「format」と入力して「ドキュメントのフォーマット (Format Document)」を選んで実行すると、右下に「write EPIPE」というエラーが出てくる。こんなの。

![image0.png](/assets/images/clang-format/image0.png)

調べてみると、Clang-Formatのプラグインの[リポジトリ](https://github.com/xaverh/vscode-clang-format-provider)に、同じ問題を報告した[issue](https://github.com/xaverh/vscode-clang-format-provider/issues/83)があった。

そこに書いてあったWorkaroundが

* LLVMを入れる

というものだった。

Clang-Formatプラグインは、clang-formatが見つからないと、VSCodeのC/C++プラグインが持っているclang-formatを使う。それは

`C:\Users\ユーザー名\.vscode\extensions\ms-vscode.cpptools-0.27.0\LLVM\bin\`

にあるのだが、どうもこれとの連携に問題があるらしい。

そこで、 [ここ](https://releases.llvm.org/download.html)から、「Windows 64 bit」をダウンロードしてLLVMをインストールし、clang-formatにパスを通す。LLVMのインストール時に「全員にパスを通す」か「カレントユーザのみにパスを通す」か選べるので、それはお好みで。ただし、ここでパスを通さない場合は、プラグイン側でパスを指定してやる必要がある。

パスを通した場合、適当なターミナル(例えばWindows PowerShell)を起動し、clang-format.exeにパスが通っていることを確認する。

```txt
PS C:\Users\username> clang-format.exe --version
clang-format version 10.0.0
```

この状態でVSCodeを再起動すれば、次からは保存時にclang-formatが走るはず。
