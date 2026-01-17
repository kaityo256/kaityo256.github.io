---
layout: post
title: ZshでプロンプトにGitリポジトリの情報を表示する
tags: [zenn]
permalink: zsh-vcs-prompt
---
## 概要

ZshでGitリポジトリの状態を表示するZshスクリプトを作ります。具体的には

* ブランチ名の表示
* 状態をブランチ名の色で表現
* 上流ブランチの有無と状態を色で表現

を実現します。ただ上記を実現したいだけの人は、vcs_infoかgit-promptを使った方が早いと思います。

## プロンプトをいじる

GitやSubversionのようなリポジトリを使っていると、そのリポジトリの状態を常に確認したくなります。Gitなら、ブランチ名や未コミット、未プッシュの状態をプロンプトに表示したいですね。他にも自分がrootかどうかをわかりやすくしたりなど、プロンプトをいろいろカスタマイズしている人は多いと思います。

で、当然のことながらそういうニーズのためにいろいろあるわけですが、せっかくなので一つ一つ機能を確認しながらそういうZshスクリプトを組んでみましょう。

最終的に、`git-prompt`という関数を作り、それが現在のGitリポジトリの状態を表示するようにして、その値を`PROMPT`なり`RPROMPT`なり好きなところに放り込む形とします。

コードは以下に公開しています。様々な状態のリポジトリを作るMakeファイルがあるので、デバッグ目的にも使えるます。

[https://github.com/kaityo256/zsh_vcs](https://github.com/kaityo256/zsh_vcs)

### 関数を作る

まずは関数を作って実行しましょう。`function`で作れます。以下のファイルを例えば`zshrc_git.zsh`という名前で作ります。

```sh
function git-prompt{
  echo "main"
}

git-prompt
```

`git-prompt`という関数を作り、それを呼び出しているだけです。実行してみます。

```sh
$ source zshrc_git.zsh
main
```

単に`echo`が実行されて、`main`と表示されただけです。

### 色をつける

リポジトリの状態を色で表現したいので、色をつけてみましょう。そのためには、`colors`というシェル関数を読み込みます。

```sh
autoload -U colors; colors
function git-prompt{
  echo "${fg[green]}main${reset_color}"
}

git-prompt
```

これを実行すると、緑色で`main`と表示されたはずです。

最初の`autoload -U colors; colors`は、シェル関数を読み込むイディオムです。`autoload func`は、単に`func`読み込むだけで実行しません。なので、すぐに使いたい場合は`autoload func;func`とします。`autoload -X func`と、`-X`オプションをつけるとすぐに実行してくれますが、このオプションでは、現在設定されているaliasを引き継ぎます。`ls`や`cp`などはユーザ側でaliasが設定されていることが多く、それをシェル関数の中に引き継ぐと誤動作する可能性が高いです。そこで、通常はaliasを引き継がないで読み込むオプション`-U`をつけて、`autoload -U func`とします。`-U`と`-X`は同時に指定できないため、すぐに使いたければ`autoload -U func; func`とします。

`colors`が実行されると、`fg[色]`が使えるようになります。例えば`${fg[green]}`は色を緑色にします。そのままだと他の表示も緑色のままになってしまうため、`${reset_color}`で色をもとに戻します。

### カレントブランチ名を取得する

カレントブランチは`git symbolic-ref --short HEAD`で取れます。

```sh
$ git symbolic-ref --short HEAD
main
```

ちなみに`--short`オプションは昔はありませんでした。このオプション無しだとこんな表示になります。

```sh
$ git symbolic-ref HEAD
refs/heads/main
```

ここからブランチ名を取得するにはsedとかが必要でしたが、今は`--short`で取れるので不要になりました。

また、Gitリポジトリでは無い場合は以下のような表示が標準エラー出力に出ます。

```sh
$ git symbolic-ref --short HEAD
fatal: not a git repository (or any of the parent directories): .git
```

したがって、標準エラー出力を`/dev/null`に飛ばして、標準出力になんか出たらそれがブランチ名、なにもなければGitリポジトリではない、ということになります。ここではHEADが取れていることは想定しないことにしましょう。

以上をまとめるとこんなスクリプトになります。

```sh
autoload -U colors; colors

function git-prompt {
  local branchname
  branchname=`git symbolic-ref --short HEAD 2> /dev/null`
  if [ -z $branchname ]; then
    return
  fi
  echo "${fg[green]}${branchname}${reset_color}"
}

git-prompt
```

ここで、if文の条件式の `[ -z $branchname ]`は、`test`コマンドの略記です。`-z`オプションは、続く文字列の長さが0の時に真となります。こんな感じです。

```sh
test -z "";echo $?      # => 0
test -z "hoge";echo $?  # => 1
```

なお、`test`は真の時に0を返すので注意が必要です。これで

```sh
if [ -z $branchname ]; then
  return
fi
```

は、`$branchname`が空文字、つまりGitのリポジトリでなければ真となり、その時は何もせずに`return`しろ、という意味になります。

### 状態を調べる

ブランチ名の色で状態を表現します。とりあえず未コミット無し、Untracked filesも無しの状態で緑、未コミットなし、Untracked filesありで黄色、それ以外は赤にしましょう。

まず、`git status`を実行して、`nothing to commit, working tree clean`と表示されたら緑です。それ以外で、`nothing added to commit but untracked files present (use "git add" to track)`と表示されたら黄色、それ以外は赤ですね。以上を素直に実装するとこんな感じになるでしょう。

```sh
autoload -U colors; colors

function git-prompt {
  local branchname branch st
  branchname=`git symbolic-ref --short HEAD 2> /dev/null`
  if [ -z $branchname ]; then
    return
  fi
  st=`git status 2> /dev/null`
  if [[ -n `echo "$st" | grep "^nothing to"` ]]; then
    branch="${fg[green]}($branchname)$reset_color"
  elif [[ -n `echo "$st" | grep "^nothing added"` ]]; then
    branch="${fg[yellow]}($branchname)$reset_color"
  else
    branch="${fg[red]}($branchname)$reset_color"
  fi

  echo "$branch"
}

git-prompt
```

新たに`branch`と`st`という変数を導入しました。`git stutus`の実行結果を`st`に受け、`nothing to`という文字列を含んでいたら緑、`nothing added`を含んでいたら黄色、それ以外は赤です。また、ブランチ名を丸括弧で囲みました。

リポジトリで試してみましょう。`kaityo256/zsh_vcs`リポジトリの中の`sample_dir`で`make`すると、いくつかディレクトリができます[^1]。

```sh
git clone https://github.com/kaityo256/zsh_vcs.git 
cd zsh_vcs
cd sample_dir
make
```

それぞれ

* `00` `git init`した直後(黄色になるはず)
* `01` `git init;git add`した直後(赤色になるはず)
* `02` `git init;git add;git commit`した直後(緑色になるはず)

です。実際に、

```sh
cd sample_dir
make
cd 00
source ../../zshrc_git.zsh 
```

とかやって、想定どおりの色でブランチ名が出てくるか確認すると良いでしょう。また、どこかのディレクトリで

```sh
git branch -m hoge
source ../../zshrc_git.zsh 
```

として、ちゃんとブランチ名が取れているか確認してみるのも良いかもしれません。

[^1]: Gitリポジトリの中に別のリポジトリ作るのは良くないけど、まぁ許して。

### 上流ブランチ

次に、上流ブランチの取得と、上流ブランチとの差分を調べましょう。上流ブランチの取得方法はいろいろありますが、`git config`で取るのが楽です。`git config branch.ブランチ名.remote`で、上流ブランチが設定されていれば取れます。上流ブランチがなければ何も表示されません。

リモートブランチを表示しても良いのですが、僕はどうせ`origin`しか使わないので、上流ブランチがあればブランチ名の横に`[up]`を表示し、その色で未プッシュかどうかを判定しましょう。

上流ブランチがある場合、未プッシュのコミットがあるかどうかは`git log 上流ブランチ..現在のブランチ`で調べることができます。何も表示されなければ差分はありません。

以上をまとめると、こんな感じになるでしょう。

```sh
  remote=`git config branch.${branchname}.remote 2> /dev/null`

  if [ -z $remote ]; then
    pushed=''
  else
    upstream="${remote}/${branchname}"
    if [[ -z `git log ${upstream}..${branchname}` ]]; then
      pushed="${fg[green]}[up]$reset_color"
    else
      pushed="${fg[red]}[up]$reset_color"
    fi
  fi

  echo "$branch$pushed"
```

難しいことは何もありません。`pushed`という変数を作り、

* 上流ブランチがなければ空文字列
* 上流ブランチがあれば`[up]`
  * ローカルと差分がなければ緑色
  * ローカルと差分があれば赤色

にしているだけです。また`sample_dir`でチェックしましょう。たとえば`03`なら

```sh
cd 03
source ../../zshrc_git.zsh 
```

とすると、緑色で`(main)[up]`と表示されるはずです。

それぞれのディレクトリの状態は、

* `03` リモートリポジトリを設定し、未プッシュなし (緑色で`[up]`が表示されるはず)
* `04` リモートリポジトリを設定し、未プッシュなし (赤色で`[up]`が表示されるはず)
* `05` リモートリポジトリを設定し、未コミットあり、未プッシュなし (赤色でブランチ名が、緑で`[up]`が表示されるはず)

となっています。

### RPROMPTに設定

さて、後は出てきた文字列をPROMPTなりRPROMPTなりに突っ込めばよいのですが、そのまま設定すると表示がおかしくなります。これは、色を変えているエスケープシーケンスの文字列を、文字としてカウントしてしまっているためです。これを防ぐには、色を変えるところを`%{`と`%}`で囲む必要があります。以上の修正をしたものが以下です。

```sh
autoload -U colors; colors

function git-prompt {
  local branchname branch st remote pushed upstream
  branchname=`git symbolic-ref --short HEAD 2> /dev/null`
  if [ -z $branchname ]; then
    return
  fi
  st=`git status 2> /dev/null`
  if [[ -n `echo "$st" | grep "^nothing to"` ]]; then
    branch="%{${fg[green]}%}($branchname)%{$reset_color%}"
  elif [[ -n `echo "$st" | grep "^nothing added"` ]]; then
    branch="%{${fg[yellow]}%}($branchname)%{$reset_color%}"
  else
    branch="%{${fg[red]}%}($branchname)%{$reset_color%}"
  fi

  remote=`git config branch.${branchname}.remote 2> /dev/null`

  if [ -z $remote ]; then
    pushed=''
  else
    upstream="${remote}/${branchname}"
    if [[ -z `git log ${upstream}..${branchname}` ]]; then
      pushed="%{${fg[green]}%}[up]%{$reset_color%}"
    else
      pushed="%{${fg[red]}%}[up]%{$reset_color%}"
    fi
  fi

  echo "$branch$pushed"
}

RPROMPT='`git-prompt`%{$fg_bold[cyan]%}[%~]%{$reset_color%}'
setopt prompt_subst
```

私の趣味でカレントディレクトリを右にシアンで表示していますが、これを左にするなり行をわけるなり、好きに設定すれば良いと思います。ちなみに最後の`setopt prompt_subst`は、プロンプトの中の変数を表示時に展開するものです。

## まとめ

ZshでGitリポジトリの状態を表示するスクリプトを作ってみました。必要最低限の状態表示なら30行ちょっとで書けちゃうので、シェルスクリプトに慣れていない人は、この機会にいろいろ遊んで見ると面白いんじゃないでしょうか。

## 参考文献

* [get current branch name](https://qiita.com/sugyan/items/83e060e895fa8ef2038c)
* [.zshrcで見かけるautoloadの意味と使い方](https://qiita.com/yuku_t/items/77c23390e52168a2754a)
