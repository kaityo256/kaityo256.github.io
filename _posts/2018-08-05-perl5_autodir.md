---
layout: post
title: "CentOS 7.4でホームディレクトリに勝手にperl5というディレクトリが作られるのを防ぐ"
tags: [programming, linux, qiita]
permalink: perl5_autodir
---

# CentOS 7.4でホームディレクトリに勝手にperl5というディレクトリが作られるのを防ぐ

## 現象

CentOS 7.4で、ホームディレクトリに`perl5`というディレクトリが作られる。消しても、再度ログインするか、シェルを立ち上げるとまた作られてしまう。

```shell-session
$ ls
perl5             # perl5というディレクトリがある
$ rm -rf perl5    # perl5を消す
$ ls              # 消えた状態
$ 
$ bash            # bashを起動
Attempting to create directory /home/username/perl5 # 勝手に作る
$ ls
perl5
```

## 原因

これは、`perl-homedir`パッケージがインストールされているから。

```shell-session
$ yum list installed |grep perl-homedir
perl-homedir.noarch                    1.008010-4.el7                  @base  
```

## 対応方法

## perl-homedirをアンインストール

perl-homedirが原因なので、それをアンインストールしてしまえば良い。

```shell-session
$ sudo yum remove perl-homedir
$ rm -rf perl5 
$ bash # シェルを立ち上げても作られない
$ 
```

## .perl-homedirに`PERL_HOMEDIR=0`を設定する

`$HOME/.perl-homedir`に、`PERL_HOMEDIR=0`と記述しておくと、`perl5`が作られなくなる。

```shell-session
$ echo PERL_HOMEDIR=0 > .perl-homedir    # $HOME/.perl-homedirを作成
$ cat .perl-homedir
PERL_HOMEDIR=0
$ rm -rf perl5
$ bash
$ ls    # perl5が作られていない
$
```

## まとめ

CentOS 7.4において、ホームディレクトリに`perl5`というディレクトリが作られるのは`perl-homedir`というパッケージが原因であり、それをアンインストールするか、ホームディレクトリに`.perl-homedir`を作り、`PERL_HOMEDIR=0`と書いておけば作られなくなる。

## 参考

* [[CentOS] attempting to create directory /root/perl5](https://lists.centos.org/pipermail/centos/2014-July/144666.html)
* [How to disable automatic PERL5LIB setting in CentOS7.4](https://stackoverflow.com/questions/47873097/how-to-disable-automatic-perl5lib-setting-in-centos7-4)
