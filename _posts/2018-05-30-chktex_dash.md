---
layout: post
title: "chktexによるダッシュに関する警告を黙らせる方法"
tags: [devtools, document, qiita]
permalink: chktex_dash
---

# chktexによるダッシュに関する警告を黙らせる方法

## TL;DR

`chktex`が`Wrong length of dash may have been used. (8)`という警告を出してきてうるさい時、黙らせるには以下の二通りの方法がある。

* 実行時オプションに`chktex -n 8`と8番の警告を出さないように指示する
* 該当行の最後に`% chktex 8`とつけることで「この行に関しては警告の8番を無視する」ことを指示する


## はじめに

LaTeXのチェックツールとして`chktex`というものがあります。TexLiveにデフォルトで入っており、AtomやVimなどのエディタがLinterツールとして使うので、知らないうちに使っていることも多いでしょう。多くの文法ミスや環境のとじ忘れなどを指摘してくれるのでありがたいのですが、ダッシュに関する警告がうるさい時があります。その黙らせ方を紹介します。

## ハイフン、En dash、Em dash

英語にはハイフン「-」に似たものが三種類あります。短い順に「ハイフン (Hyphen)」「En dash」「Em dash」の名前がついています。「En」と「Em」はそれぞれ「n」と「m」のことで、ハイフンの長さがその文字と等しいことに由来します。

ハイフン「-」は普通、二つ以上の単語を結びつける場合に使います。科学論文では、二つ以上の単語がひとまとまりの形容詞として使われる場合に、間にハイフンを入れる用法で使われることが多いです。

例えば「この問題はwell definedだ」と言いたい時には[^1]

    This probrem is well-defined.

と「well」と「defined」の間にハイフンを入れます。同様に「一次の摂動」も「the first-order perturbation」です。

対して、En dashは、「二つの場所を結ぶ」ようなイメージ、英単語で言えば「through」に近い使われ方をします。科学論文でもっとも使われるのは、「pp. 24–32」のように文献を引用する際のページ範囲を指定する時でしょう。

Em dashは、カッコのような使われ方をします。つまり、Em dashで囲んだ語句を本文に埋め込んだり、最後に注釈的にEm dashを頭につけた文章を置いたりできます。[Get it write](http://www.getitwriteonline.com/archive/091502enem.htm)にはこんな説明があります。

> Dashes can be used in pairs like parentheses—that is, to enclose a word, or a phrase, or a clause—or they can be used alone to detach one end of a sentence from the main body. 

さて、三つのうち「Em dash」の使い方は残りの二つとわりと異なりますが、ハイフンとEn dashの使い分けは面倒です。特に面倒なのが「人名」です。

例えば原子間の経験的ポテンシャルとしてよく用いられる「[レナード＝ジョーンズ ポテンシャル](https://ja.wikipedia.org/wiki/%E3%83%AC%E3%83%8A%E3%83%BC%E3%83%89-%E3%82%B8%E3%83%A7%E3%83%BC%E3%83%B3%E3%82%BA%E3%83%BB%E3%83%9D%E3%83%86%E3%83%B3%E3%82%B7%E3%83%A3%E3%83%AB) (Lennard-Jones potential)」の「Lennard-Jones」は「Lennard」さんと「Jones」さんの二人の名前をつなげたものではなく、「John Edward Lennard-Jones」という一人の名前に由来します。日本語では「レナード＝ジョーンズ」などと「=」で結んだりしますが、英語ではハイフンでつなぐのが一般的です。

一方、分子動力学法でよく用いられる「[能勢＝フーバー熱浴](https://ja.wikipedia.org/wiki/%E8%83%BD%E5%8B%A2%EF%BC%9D%E3%83%95%E3%83%BC%E3%83%90%E3%83%BC%E3%83%BB%E3%82%B5%E3%83%BC%E3%83%A2%E3%82%B9%E3%82%BF%E3%83%83%E3%83%88) (Nosé–Hoover thermostat)」は、能勢さん(Nosé)とフーバーさん(Hoover)の二人の名前に由来し、論文では「En dash (–)」でつなぐのが一般的です。

さて、この使い分けを`chktex`は認識できません。例えば以下のようなソースを書きます。

```test.tex
\documentclass{article}
\begin{document}
We adopt Nos\'e--Hover thermostat for controlling temperature.

The Lennard-Jones potential is named after J. Lennard-Jones.
\end{document}
```

これを`chktex`にかけると、 最初の行に文句を言います。

```shell-session
$ chktex -q test.tex
Warning 8 in test.tex line 4: Wrong length of dash may have been used.
We adopt Nos\'e--Hover thermostat for controlling temperature.  
               ^^
```

ちなみに「-q」はバージョン情報を表示しないオプションです。VimでALEを使っていると、こんな感じで指摘されます。

![image0.png](/assets/images/chktex_dash/image0.png)

前置きが長くなりましたが、これをなんとかしましょう、という話です。

## ソース中に指示文を入れる

先程の警告「Wrong length of dash may have been used.」の最初に「Warning 8 in test.tex」という行がありましたが、これは「この警告番号が8番である」ことを示しています。そこで、文中に「この行に含まれる8番の警告は無視せよ」という指示文を入れるとchktexはそれに従います。

```test2.tex
\documentclass{article}
\begin{document}
We adopt Nos\'e--Hover thermostat for controlling temperature. % chktex 8

The Lennard-Jones potential is named after J. Lennard-Jones.
\end{document}
```

先程の行の後ろに`% chktex 8`と追加しました。こうすると`chktex`はこの行に関しては文句を言いません。

```shell-session
$ chktex -q test2.tex  

```

## コマンドラインオプションで指示する

さて、問題のある行が一行だけなら上記の解決策で良いですが、「Nos\'e--Hover」なんて論文中でたくさん出てくるでしょうし、他にも「Suzuki--Trotter decomposition」なんかも文句を言われます。そこで、コマンドラインオプションで8番の警告を殺してしまいます。

```shell-session
$ chktex -q test.tex
Warning 8 in test.tex line 3: Wrong length of dash may have been used.
We adopt Nos\'e--Hover thermostat for controlling temperature.  
               ^^

$ chktex -q -n 8 test.tex  
```

## VimのALEから呼ばれるchktexを黙らせる

さて、VimでALEを使っている場合、そこから呼ばれる`chktex`のオプションは`g:ale_tex_chktex_options`で指定できます。したがって、もうこの警告をすべてのLaTeXファイルで殺したい場合は`.vimrc`に

```vim
let g:ale_tex_chktex_options = "-n 8"
```

と追加します。もし、LaTeXソースごとにこのオプションの有無を指示したい場合は、[Vimでプロジェクト固有の設定を適用する](https://qiita.com/unosk/items/43989b61eff48e0665f3)や[Vimの非同期文法チェッカALEにプロジェクト固有の情報を教える](https://qiita.com/kaityo256/items/cb76c3f73753fe921e7b)を参考に、`.vimrc.local`をプロジェクトごとに置いて、そこに`chktex`のオプションを指示すると良いでしょう。

## まとめ

`chktex`の`Wrong length of dash may have been used.`という警告を黙らせる方法を紹介しました。本稿ではVimからALE経由で呼ばれる`chktex`へのオプションの指定の仕方を解説しましたが、Atomその他のエディタでも同様なことができると思います。それではEnjoy Happy LaTeX Life!

[^1]: 「well defined」の和訳として「良定義」などがあるようですが使ったことがありません。普通はそのまま「これはwell definedだから・・・」と英語混じりに話してしまいます。

## 追記(2019年5月15日)

コメント欄で`~/.chktexrc`に以下のように設定する方法を教えていただきました。

```sh
CmdLine
{
    -n8
}
```

この方法の方がVimのALEに教えたりしなくてよいのでスマートですね。
