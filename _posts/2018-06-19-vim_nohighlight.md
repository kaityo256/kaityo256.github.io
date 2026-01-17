---
layout: post
title: "Vimで特定のファイルだけシンタックスハイライトが効かなくなる"
tags: [devtools, qiita]
permalink: vim_nohighlight
---

# Vimで特定のファイルだけシンタックスハイライトが効かなくなる

## はじめに

Vimで、ある特定のファイルだけシンタックスハイライトが効かなくなることがあるが、これは~/.vim/view以下に保存されている、バッファの表示情報がおかしくなっているから。

## 現象

いま、`~/temp/test.cpp`をvimで開いたとする。いつもなら`filetype=cpp`となり、勝手にシンタックスハイライトされるはずだが、なぜか以下のようにハイライトされなくなってしまった。

![image0.png](/assets/images/vim_nohighlight/image0.png)

`:set filetype?`と聞いてみても「filetype=」とつれない返事。

しかし、名前をつけて保存(`:w test2.cpp`)して、それを開く(`:o test2.cpp`)するとちゃんとシンタックスハイライトされる。

![image1.png](/assets/images/vim_nohighlight/image1.png)

ファイルを移動しても同様。すなわち`~/temp.test.cpp`を開いたときだけファイルタイプが認識されず、シンタックスハイライトがされない。

## 原因

これは、バッファの表示情報を保存しているファイルがおかしくなっているから。表示がおかしくなったファイルを開いた状態で、

```vim
:verbose :setlocal filetype?
```

を実行してみる。すると、

```shell-session
  filetype=
        Last set from ~/.vim/view/~=+temp=+test.cpp=
```

と表示される。これは、現在ファイルタイプは設定されておらず(`filetype=`)、その設定は`~/.vim/view/~=+temp=+test.cpp=`というファイルによって行われたことを示す。この`~/.vim/view`以下のファイルは、バッファの表示状態(カーソル位置やフォルディング状態等)を保存するファイルだが、たまにそれがおかしくなるようだ。

さっそくこのファイル`~/.vim/view/~=+temp=+test.cpp=`を開いてみると、

```vim
if &filetype != ''
setlocal filetype=
endif
(snip)
if &syntax != ''
setlocal syntax=
endif
```

という記述がある。つまり、ファイルタイプやシンタックス情報をわざわざ上書きしている。これらの行を消してから再度先ほどのファイルを開いて見る(この表示情報保存ファイルを消してしまっても良い)。

![image2.png](/assets/images/vim_nohighlight/image2.png)

正しくシンタックスハイライトされた。もちろん真面目に`:set filetype=cpp`とかしても良い。

また、稀なケースとして、ファイルタイプは正しく認識されているのに、シンタックスハイライトだけされない、ということがあるかもしれない。つまり`:set filetype?`が`cpp`を返すのに、シンタックスハイライトされない場合がある。これは表示情報ファイルが

```vim
if &filetype != 'cpp'
setlocal filetype=cpp
endif
(snip)
if &syntax != ''
setlocal syntax=
endif
```

と、ファイルタイプだけ正しく設定され、シンタックスが設定されていない場合に起きる。この場合もこのファイルを修正するか、当該バッファで`:set filetype=cpp`すれば治る。

## まとめ

Vimで、ある特定のファイルだけ表示がおかしくなったら、それは`~/.vim/view`以下に保存されている表示情報がおかしくなっているから。Vim側でも治せるが、おそらく当該ファイルを消してしまうのが手っ取り早い。ちなみにこの現象、Macのターミナル上のVimでたまに起きるんだけど、未だ原因不明。あまり他に同様なことが起きている人がいないので、僕の`.vimrc`が悪いのかも。
