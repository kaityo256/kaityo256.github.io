---
layout: post
title: "右プロンプトにリポジトリの状態を表示する"
tags: [linux, qiita]
permalink: right_prompt_git
---

# 右プロンプトにリポジトリの状態を表示する

## はじめに

左ないし右プロンプトにリポジトリの状態を表示したい。zshにはvcs_infoがあってそれを使えばいろいろできるのだが、vcs_infoが使えない環境があったので、シェルスクリプトの勉強も兼ねて自作する。

## 仕様

- zshのcolorを使う(bashで動作するかは知らない)
- git、subversionに対応する
- gitはブランチ名を表示し、色で状態を表す
- svnは色と文字列で状態を表す。

## リポジトリ判定

まず、カレントディレクトリがリポジトリかどうかを判定する必要がある。そのために、とりあえずgit statusや、svn statusを使う。

git statusとやって、"Not a git repository"とか返ってきたらそこはgitリポジトリではない。同様にsvn statusとやって、"hogehoge is not a working copy"と言われたらsvnリポジトリではない。

ただし、svnの場合は二つ注意が必要。まず、LANG=Cで無い場合には日本語で「hogehogeは作業コピーではありません」と表示されてしまう。gitは(少なくとも手元の環境では)LANGがja_JP.UTF-8とかになっていても英語で表示されているようだ。そこで、

```shell-session
$ LANG=C svn status
```
と、一時的にLANGをCにして実行する。

また、リポジトリが馬鹿でかい場合、svn statusの処理が遅い場合がある。そこで、「カレントディレクトリの状態のみ調べる」ことにする。そのためには、`--depth immediates`オプションを使えば良い。

そんなわけで、git/svn判定をする関数はこんな感じになった。

```zsh
function rprompt-st {
  if [[ ! `git status 2>&1` =~ "Not a git" ]]; then
    rprompt-git
  elif [[ ! `LANG=C svn status --depth immediates 2>&1` =~ "is not" ]]; then
    rprompt-svn
  fi
}
```

`git status`とやり、その結果を取得、文字列として正規表現マッチさせて「Not a git」が含まれていなかったらgitリポジトリなので、rprompt-gitを呼ぶ。svnも同様。

## Gitリポジトリの処理

## ブランチ名

まず、ブランチ名を取る。現在のブランチ(HEAD)が、どこへの参照になっているかを`git symbolic-ref HEAD`で取る。masterで実行すると

```shell-session
$ git symbolic-ref HEAD
refs/heads/master
```
と表示される。この表示のrefs/headsをsedで取り除けばブランチ名。こんな感じ。

```zsh
name=`git symbolic-ref HEAD 2> /dev/null | sed -e "s/refs\/heads\///g" `
```

## 状態

状態は`git status`で取る。"nothing to commit, working directory clean"と言われたら緑、"nothing added to commit but untracked files present"と言われたら黄色、それ以外は赤太字にしよう。

色はzshのcolorsを使う。予め`autoload -U colors;colors`しておく。

まず文字列stに状態を得る。

```zsh
st=`git status 2> /dev/null`
```
で、この文字列に「^nothing to」とかがマッチするか調べるのだが、echoしてからgrepし、その結果が空文字列かどうかで判定する。こんな感じ。

```zsh
  st=`git status 2> /dev/null`
  if [[ -z $name ]]; then
    return
  fi
  if [[ -n `echo "$st" | grep "^nothing to"` ]]; then
    color=${fg[green]}
  elif [[ -n `echo "$st" | grep "^nothing added"` ]]; then
    color=${fg[yellow]}
  elif [[ -n `echo "$st" | grep "^# Untracked"` ]]; then
    color=${fg_bold[red]}
  else
    color=${fg[red]}
  fi
```
念のためブランチ名が取れなかった時(nameが空文字だった時)はreturnしている。
で、得られたブランチ名`name`と、色を表現するエスケープシーケンス`color`を使って、右プロンプトを出力する。

```zsh
echo "(%{$color%}$name%{$reset_color%}) "
```

`$reset_color`は色等をもとに戻すエスケープシーケンス。

## Subversionリポジトリの処理

Subversionはブランチ/タグ名はディレクトリ名と一致しているので状態だけ表示する。`LANG=C svn status --depth immediates`して、ずらずら出てくる文字列に正規表現をかけ、マッチしたものを表示させる。

いろいろ出てくるが、とりえあず「C(衝突)」「A(追加)」「D(削除)」「M(修正)」だけ赤くして、それ以外でリポジトリで管理されていないファイル(?)がいる場合は黄色、そのどれでもなければ緑でN(Nothing to do)を表示しよう。こんな感じになる。

```zsh
  st=`LANG=C svn status --depth immediates 2>&1`
  if [[ $st =~ "is not" ]]; then
    return
  fi
  stt=""
  if [[ -n `echo $st | grep "^[CADM]"` ]];then
    color=${fg_bold[red]}
    if [[ -n `echo $st | grep "^C"` ]];then
      stt="${stt}C"
    fi
    if [[ -n `echo $st | grep "^A"` ]];then
      stt="${stt}A"
    fi
    if [[ -n `echo $st | grep "^D"` ]];then
      stt="${stt}D"
    fi
    if [[ -n `echo $st | grep "^M"` ]];then
      stt="${stt}M"
    fi
  elif [[ -n `echo $st | grep "^\?"` ]];then
    color=${fg[yellow]}
    stt="?"
  else
    color=${fg[green]}
    stt="N"
  fi
  echo "(%{$color%}$stt%{$reset_color%})"
```

念のためリポジトリでなかった場合(stに"is not ..."が含まれる場合)はreturnしている。「C(衝突)」「A(追加)」「D(削除)」「M(修正)」の順番でチェックし、その順番で文字列を追加している。文字列の追加は

```zsh
stt="${stt}C"
```
などとすれば良い。

## プロンプトの表示

個人的な趣味で、右プロントにcyanでカレントディレクトリを表示している。もしカレントがリポジトリなら、さらに()をつけて状態を表示するようにする。

こんな感じ。

```zsh
RPROMPT='`rprompt-st`%{$fg_bold[cyan]%}[%~]%{$reset_color%}'
setopt prompt_subst
```

`setopt prompt_subst`は、プロンプトが表示されるたびに、その内容を評価せよ、というもの。rprompt-stが、gitリポジトリならその表示を、svnならそっちを、どちらでもなければ何も表示しない関数になっており、その後にカレントディレクトリを表示する形になっている。

以上を全部まとめるとこんな感じ。

```zsh
autoload -U colors; colors

function rprompt-git {
  local name st color
  name=`git symbolic-ref HEAD 2> /dev/null | sed -e "s/refs\/heads\///g" `
  if [[ -z $name ]]; then
    return
  fi
  st=`git status 2> /dev/null`
  if [[ -n `echo "$st" | grep "^nothing to"` ]]; then
    color=${fg[green]}
  elif [[ -n `echo "$st" | grep "^nothing added"` ]]; then
    color=${fg[yellow]}
  elif [[ -n `echo "$st" | grep "^# Untracked"` ]]; then
    color=${fg_bold[red]}
  else
    color=${fg[red]}
  fi
  echo "(%{$color%}$name%{$reset_color%}) "
}

function rprompt-svn {
  local name st color stt
  st=`LANG=C svn status --depth immediates 2>&1`
  if [[ $st =~ "is not" ]]; then 
    return
  fi
  stt=""
  if [[ -n `echo $st | grep "^\s\?[CADM]"` ]];then
    color=${fg_bold[red]}
    if [[ -n `echo $st | grep "^C"` ]];then
      stt="${stt}C"
    fi
    if [[ -n `echo $st | grep "^A"` ]];then
      stt="${stt}A"
    fi
    if [[ -n `echo $st | grep "^D"` ]];then
      stt="${stt}D"
    fi
    if [[ -n `echo $st | grep "^\s\?M"` ]];then
      stt="${stt}M"
    fi
  elif [[ -n `echo $st | grep "^\?"` ]];then
    color=${fg[yellow]}
    stt="?"
  else
    color=${fg[green]}
    stt="N"
  fi
  echo "(%{$color%}$stt%{$reset_color%})"
}

function rprompt-st {
  if [[ ! `git status 2>&1` =~ "Not a git" ]]; then
    rprompt-git
  elif [[ ! `LANG=C svn status --depth immediates 2>&1` =~ "is not" ]]; then
    rprompt-svn
  fi
}

RPROMPT='`rprompt-st`%{$fg_bold[cyan]%}[%~]%{$reset_color%}'
setopt prompt_subst
```

これを`.zshrc.vcs`という名前とかで保存しておき、.zshrcに

```zsh
[ -f ~/.zshrc.vcs ] && source ~/.zshrc.vcs
```

と書いておくと幸せになるかも。

## まとめ

vcs_infoが使えたらそっちが早いと思うけれど、わけあって使えない環境だったり、vcs_infoが対応していない何かをやりたくなったら上記のスクリプトを修正して使うと良いかと。

## 追記(2015年9月2日)

svnの属性だけ修正した場合、Mが二桁目に出てくるので、それに対応するため`svn status`のgrep文を`grep "^\s\?[CADM]"`と、文頭に空白が入っても対応するようにした。
