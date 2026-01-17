---
layout: post
title: "ZshでSubverionのコマンド補完が効かない場合の応急処置"
tags: [linux, qiita]
permalink: zsh_subversion
---

# ZshでSubverionのコマンド補完が効かない場合の応急処置

## はじめに

手元のMacで、いつの間にかzshのコマンド補完でSubversionの補完が効かなくなったので、その原因と対処法について。

現象が再現する現在のバージョンは以下の通り。

* macOS Mojave 10.14
* zsh 5.6.2 (x86_64-apple-darwin18.0.0)
* svn version 1.10.2 (r1835932)

## 追記(2018年11月3日)

`fpath`の値がおかしかったのが原因だった模様。brewでzshを入れる前には/binにZsh 5.3が入っていた。

```sh
$ which zsh
/bin/zsh

$ zsh --version
zsh 5.3 (x86_64-apple-darwin18.0)
```

また、`fpath`の値はこんな感じ。

```sh
$ print -l $fpath
/usr/local/share/zsh/site-functions
/usr/share/zsh/site-functions
/usr/share/zsh/5.3/functions
```

この状態では`svn`の補完は効かない。

```sh
$ svn ad [tab]
_svn:33: bad set of key/value pairs for associative array
```

さて、ここで`brew`でZshを入れる。

```sh
$ brew install zsh

$ which zsh 
/usr/local/bin/zsh

$ zsh --version
zsh 5.6.2 (x86_64-apple-darwin18.0.0)
```

ところが、`fpath`の値が古いままになっている。

```sh
$ print -l $fpath 
/usr/local/share/zsh/site-functions
/usr/share/zsh/site-functions
/usr/share/zsh/5.3/functions
```

これを、ちゃんと新しく入ったZshに合わせる。

```sh
$ fpath=(/usr/local/share/zsh/site-functions /usr/local/share/zsh/functions)

$ svn add --[tab]
Completing option
--auto-props                  --non-recursive             
--config-dir                  --parents                   
--config-option               --password                  
--depth                       --password-from-stdin       
--force                       --quiet                     
--force-interactive           --targets                   
--no-auth-cache               --trust-server-cert         
--no-auto-props               --trust-server-cert-failures
--no-ignore                   --username                  
--non-interactive    
```

できた！

というわけで、少なくとも僕の環境では、`fpath`の値がおかしかったのが原因でした。

以下はobsoleteな情報ですが、参考のため残しておきます。

## 現象と原因

zshのコマンド補完を有効にした状態で、svnのサブコマンドを補完しようとすると以下のようなエラーが出る。

```sh
$ svn a[tab]
_svn:33: bad set of key/value pairs for associative array
```

`svn add`まで打ってから補完しようとすると、`add`なんてコマンド知らんと怒られる。

```sh
$ svn add [tab]
Completing unknown svn command: add
```

原因はSubversion関連の補完の関数`_svn`で、`svn help`のパースに失敗しているから。まず、その関数の置き場所を調べる。`zsh`が調べるパスは`fpath`に入っている。

```sh
$ echo $fpath
/usr/local/share/zsh/site-functions /usr/share/zsh/site-functions /usr/share/zsh/5.3/functions
```

今回の場合は、`/usr/share/zsh/5.3/functions/_subversion`の以下の場所が原因。

```zsh
  if [[ -n $state ]] && (( ! $+_svn_cmds )); then
    typeset -gHA _svn_cmds
    if _cache_invalid svn-cmds || ! _retrieve_cache svn-cmds; then
      _svn_cmds=(
  ${=${(f)${${"$(_comp_locale; _call_program commands svn help)"#l#*Available subcommands:}%%Subversion is a tool*}}/(#s)[[:space:]]#(#b)([a-z]##)[[:space:]]#(\([a-z, ?]##\))#/$match[1] :$match[1]${match[2]:+:${${match[2]//[(),]}// /:}}:}
      )
      _store_cache svn-cmds _svn_cmds
    fi
  fi
```

ここで、まだ`_svn_cmds_`が定義されておらず、キャッシュにも入っていなければ、`svn help`を実行し、その結果をパースすることで連想配列を作成、その結果を`_svn_cmds`へ代入している。以下、この連想配列を使ってsvnのコマンド補完を行っている。しかし、なんらかの原因で`svn help`の結果のパースに失敗し、連想配列`_svn_cmds`の作成に失敗している。

## 応急処置

ネットでググると、同様な問題を抱えている人が何人かおり、`svn help`を実行してパースするところを修正することで対応しているらしいのだが、それらのパッチを適用してもうちの環境ではうまくいかなかった。そこで、力技で対応する。

まず、正しく補完が動いている環境で、`_svn_cmds`がどういう値を持っているかを見てみる。`_svn_cmds`は`typeset -gHA _svn_cmds`として定義されている。このうち`-g`は「グローバル変数にしなさい」という指定なので、外から見ることができる。ついでに`-H`は「値を隠しなさい」、`-A`は「連想配列として宣言しなさい」 という指定である。

さて、別の環境で`svn a[tab]`と打って、無事に補完された後(つまり`_svn_cmds`が定義された後)に、`_svn_cmds`の値を表示する。

```sh
$ echo $_svn_cmds 
:patch: :status:stat:st: :help:?:h: :propdel:pdel:pd: :switch:sw: :diff:di: :propget:pget:pg: :changelist:cl: :cat: :move:mv:rename:ren: :resolved: :unlock: :propedit:pedit:pe: :propset:pset:ps: :update:up: :add: :list:ls: :relocate: :cleanup: :import: :mkdir: :blame:praise:annotate:ann: :lock: :proplist:plist:pl: :checkout:co: :delete:del:remove:rm: :info: :merge: :export: :copy:cp: :upgrade: :mergeinfo: :resolve: :revert: :commit:ci: :log:
```

普通に表示すると連想配列の「値(value)」しか表示されない。両方表示するには`(kv)`をつける。

```sh
$ echo ${(kv)_svn_cmds} 
patch :patch: status :status:stat:st: help :help:?:h: propdel :propdel:pdel:pd: switch :switch:sw: diff :diff:di: propget :propget:pget:pg: changelist :changelist:cl: cat :cat: move :move:mv:rename:ren: resolved :resolved: unlock :unlock: propedit :propedit:pedit:pe: propset :propset:pset:ps: update :update:up: add :add: list :list:ls: relocate :relocate: cleanup :cleanup: import :import: mkdir :mkdir: blame :blame:praise:annotate:ann: lock :lock: proplist :proplist:plist:pl: checkout :checkout:co: delete :delete:del:remove:rm: info :info: merge :merge: export :export: copy :copy:cp: upgrade :upgrade: mergeinfo :mergeinfo: resolve :resolve: revert :revert: commit :commit:ci: log :log:
```

コマンドがキー、そのコマンドの別名をコロンをデリミタとしてつなげたものが値であることがわかる。で、これが得られるように`_subverion`の内部の関数を書き換えればよいのだが、それはzsh力の低い僕にはちと厳しい。なのでこの値をそのまま突っ込んでしまう。

まず、元ファイル`_subversion`を適当な場所、例えばホームディレクトリにコピーする。

```sh
$ cp /usr/share/zsh/5.3/functions/_subversion .subversion.mine
```

手元においた`.subversion.mine`の該当箇所を以下のように修正。

```zsh
  if [[ -n $state ]] && (( ! $+_svn_cmds )); then
    typeset -gHA _svn_cmds
    if _cache_invalid svn-cmds || ! _retrieve_cache svn-cmds; then
    _svn_cmds=(
    patch :patch: status :status:stat:st: help :help:\?:h: propdel :propdel:pdel:pd: switch :switch:sw: diff :diff:di: propget :propget:pget:pg: changelist :changelist:cl: cat :cat: move :move:mv:rename:ren: resolved :resolved: unlock :unlock: propedit :propedit:pedit:pe: propset :propset:pset:ps: update :update:up: add :add: list :list:ls: relocate :relocate: cleanup :cleanup: import :import: mkdir :mkdir: blame :blame:praise:annotate:ann: lock :lock: proplist :proplist:plist:pl: checkout :checkout:co: delete :delete:del:remove:rm: info :info: merge :merge: export :export: copy :copy:cp: upgrade :upgrade: mergeinfo :mergeinfo: resolve :resolve: revert :revert: commit :commit:ci: log :log:)
     _store_cache svn-cmds _svn_cmds
    fi
  fi
```

ここで、`help :help:\?:h:`の`?`　のところはエスケープしないといけないことに注意。

これを、たとえば`.zshrc`の最後に

```zsh
[ -f ~/.subversion.mine ] source .subversion.mine
```

とか書いておけば、`.subversion.mine`がある環境では勝手に読み込んでくれる。

## まとめ

Mac上でのzshでsubversionの補完が効かなくなった場合の応急処置を書いた。これが応急処置であることは自覚しているので、恒久的に治す方法があれば教えてくださるとうれしいです。
