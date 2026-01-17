---
layout: post
title: "Vimの非同期文法チェッカALEにプロジェクト固有の情報を教える"
tags: [devtools, programming, qiita]
permalink: vim_ale_project
---

# Vimの非同期文法チェッカALEにプロジェクト固有の情報を教える

## はじめに

Vimの非同期文法チェックエンジン、[ALE (Asynchronous Lint Engine)](https://github.com/w0rp/ale)に、プロジェクト固有の情報を教えたいことがある。典型的なのがC/C++のヘッダのインクルードパスで、makefileで-Iで場所を教えていたりすると、ALEから呼ばれた`gcc`や`clang`がそのパスを探せずにエラーを報告してしまう。これを解決するには以下のようにすれば良い。

1. `.vimrc`を修正して、カレントディレクトリに`.vimrc.local`があったら読むようにする
2. ALEに追加情報が必要な場合はそこに`.vimrc.local`を作って、その中に情報を書く
3. 例えばC/C++のインクルードパスを教えるには`g:ale_cpp_clang_options`と`g:ale_cpp_gcc_options`に"-std=c++14 -Wall -Ipath/to/header"を指定する

## 状況

あるプログラムが参照するヘッダのインクルードパスが、コンパイル時に`-I`オプションで指定されているものとする。

例えばこんな状況を考える。

```
project
├── includes/
│   └── hoge.hpp
└── src/
    └── test.cpp
```

test.cppの中身はこんな感じ。

```cpp
#include <hoge.hpp>
```

もちろん、makefileには-Iで適切にヘッダファイルの場所を教えているから、問題なくコンパイルできる。

しかし、この`src/test.cpp`をALEを有効にした状態のVimで編集すると、「hoge.hppが見つからないよ」と怒られてしまう。

![image0.png](/assets/images/vim_ale_project/image0.png)

これはALEから呼び出される`clang++`や`g++`には`-I`オプションが渡されていないのでヘッダが探せないため。

## 解決法

直接解決するには、`g:ale_cpp_clang_options`と`g:ale_cpp_gcc_options`にヘッダの場所を教えてやれば良い。デフォルト値は`-std=c++14 -Wall`になっているので、今回の場合は

```vim
let g:ale_cpp_clang_options = "-std=c++14 -Wall -I../includes"
let g:ale_cpp_gcc_options = "-std=c++14 -Wall -I../includes"
```

とやってやれば、この警告は消える。しかし、毎回Vimを起動する度に上記の設定をするのは面倒。なので[Vimでプロジェクト固有の設定を適用する](https://qiita.com/unosk/items/43989b61eff48e0665f3)を参考に、まず`.vimrc`に

```vim
augroup vimrc-local
  autocmd!
  autocmd BufNewFile,BufReadPost * call s:vimrc_local(expand('<afile>:p:h'))
augroup END

function! s:vimrc_local(loc)
  let files = findfile('.vimrc.local', escape(a:loc, ' ') . ';', -1)
  for i in reverse(filter(files, 'filereadable(v:val)'))
    source `=i`
  endfor
endfunction
```

と書いて、もしカレントディレクトリに`.vimrc.local`があったら読み込むようにする。

その上で、先程の`test.cpp`と同じディレクトリに

```vim
let g:ale_cpp_clang_options = "-std=c++14 -Wall -I../includes"
let g:ale_cpp_gcc_options = "-std=c++14 -Wall -I../includes"
```

というファイルを作ってやればよい。ファイル構成はこんな感じになる。

```
project
├── includes/
│   └── hoge.hpp
└── src/
    ├── .vimrc.local
    └── test.cpp
```

この状況で`test.cpp`をVimで開いても、「ヘッダが見つからない」とは怒られない。

## まとめ

ALEにプロジェクト固有の情報を伝える方法をまとめた。「C/C++のヘッダは面倒だよね」という話は[ALEのissue](https://github.com/w0rp/ale/issues/392)にもなってて、作者も「100%の解決策はないよね〜」みたいなことを書いている。また、冒頭に書いたように[本家のFAQ](https://github.com/w0rp/ale#faq-c-configuration)に「vimrc-localを使え」と書いてあるんだけれど、僕のようなVim初心者にはそれだけの情報ではきつかった。

## 参考

* [Vimでプロジェクト固有の設定を適用する](https://qiita.com/unosk/items/43989b61eff48e0665f3)
* [ALE FAQ: How can I configure my C or C++ project?](https://github.com/w0rp/ale#faq-c-configuration)
* [ALEのcpp関連の設定情報](https://github.com/w0rp/ale/blob/master/doc/ale-cpp.txt)
