---
layout: post
title: "Vimで保存時にastyleが走るようにする"
tags: [devtools, qiita]
permalink: vim_astyle
---

# Vimで保存時にastyleが走るようにする

## はじめに

コードフォーマッタとしてastyleを使っている。これまでは、プログラムがある程度修正されたらastyleを実行してからgitで`-m "style: performs astyle"`みたいなコミットを作ってたんだけど、よく考えるとアホらしい。gitでコミットのたびにastyleが走るようにするとか考えたんだけど、一番良いのはエディタで保存時にastyleが走ることだと考えて、Vimで保存時にastyleが走るようにした。

## .vimrcの書き方

基本的には[ここ](https://gist.github.com/ossan-pg/c43b090b74b95e315273)の設定そのままで良い。しかし、このままだと、保存時に「Press ENTER or type command to continue」というメッセージが表示されてコマンド入力待ちになってしまう。これは、外部コマンド実行時の結果がメッセージ表示欄に入り切らなかったため、ユーザの確認待ちになっているから。この解決策をいろいろ探したのだけれど、良い方法が見つからなかったので、結局

* astyle 実行直前にメッセージ表示欄を3行にして
* astyle 実行直後にメッセージ表示欄を1行に戻す

という方法にしてみた。結局、.vimrcの該当部分はこんな感じになった。

```vimscript
" using Astyle
function! _performAstyle()
  set cmdheight=3
  exe ":!astyle %"
  exe ":e!"
  set cmdheight=1
endfunction

command! PerformAstyle call _performAstyle()

augroup auto_style
  autocmd!
  autocmd bufWritePost *.cpp :PerformAstyle
  autocmd bufWritePost *.hpp :PerformAstyle
augroup END
```

`autocmd bufWritePost`で、ファイルの拡張子が`*.cpp`と`*.hpp`のときだけ、保存時に`PerformAtyle`が走るようになっている。そのコマンドから呼ばれる関数`_performAstyle()`で、astyleを実行する直前に`set cmdheight=3`でメッセージ表示欄を3行にして、実行直後に`set cmdheight=1`にしている。これだと保存時の`"test.cpp" 57L, 1235C written `みたいなメッセージも消えちゃうんだけど、エラーはちゃんと表示される。もっと正しい方法があれば教えてください＞Vim識者


## .astylerc

ついでに僕の`.astylerc`も晒しておく。

```sh
--style=java
--indent=spaces=2
--indent-modifiers
--indent-classes
--pad-oper
--pad-header
--unpad-paren
--keep-one-line-blocks
--align-pointer=name
--align-reference=name
--break-return-type
--attach-return-type-decl
```

歴史的理由でC/C++なのに括弧としてはJavaスタイルを採用している(マイノリティであることは自覚している)。
また、

```c++
int func(int);
```

みたいに、関数宣言では返り値に改行を入れないスタイル(`--attach-return-type-decl`)なのに対して、

```c++
int
func(int a) {
  return a + 1;
}
```

みたいに関数の実体では返り値に改行をいれる(`--break-return-type`)のも趣味ですね。

## 実行結果

なんか適当にフォーマットを乱した後、最後に`:w`でastyleが走り、フォーマットが修正されたのがわかると思う。ただし、本来なら表示される`"test.cpp" 9L, 95C written`という保存時メッセージが表示されずに消えてしまう。

![image0.gif](/assets/images/vim_astyle/image0.gif)

## まとめ

Vimでファイルの保存時にastyleが走るようにしてみた。そんなの頻出かと思ったのだが、探しても意外に欲しい感じのが見つからなかったのでQiitaに上げておきます。保存時メッセージが消えても特に困ってはいないけれど、より良い方法があれば教えてください。

## 参考

* [Vim で C ファイル保存時に astyle でコードフォーマットする](https://gist.github.com/ossan-pg/c43b090b74b95e315273)
* [Artistic Style 3.1 公式ドキュメント](http://astyle.sourceforge.net/astyle.html)
