---
layout: post
title: Gitのブランチの実装
tags: [zenn]
permalink: inside_the_branch
---

# Gitのブランチの実装

## はじめに

Gitのブランチがどう実装されているか見てみましょう、という記事です。実装は今後変更される可能性があります。とりあえず以下はWSL2のUbuntuのGit 2.25.1で動作確認したものです。

## HEADとブランチの実体

![head](https://github.com/kaityo256/zenn-content/raw/main/articles/inside_the_branch/head.png)

通常、GitではHEADがブランチを、ブランチがコミットを指しています。例えばカレントブランチが`master`である場合を考えましょう。`HEAD`の実体は`.git/HEAD`というファイルで、`master`の実体は`.git/refs/heads/master`になっています。それを見ていきましょう。

適当なディレクトリ`test`を作って、その中で`git init`しましょう。

```sh
mkdir test
cd test
git init
```

この時点で`.git`が作られ、その中に`HEAD`が作られます。見てみましょう。

```sh
$ cat .git/HEAD
ref: refs/heads/master
```

`HEAD`は`refs/heads/master`を指しているよ、とあります。しかし、`git init`直後はまだこのファイルはありません。

```sh
$ cat .git/refs/heads/master
cat: .git/refs/heads/master: そのようなファイルやディレクトリはありません
```

この状態で`git log`しても「歴史が無いよ」と言われます。

```sh
$ git log
fatal: your current branch 'master' does not have any commits yet
```

さて、適当なファイルを作って、`git add`、`git commit`しましょう。

```sh
$ echo "Hello" > hello.txt
$ git add hello.txt
$ git commit -m "initial commit"
[master (root-commit) c950332] initial commit
 1 file changed, 1 insertion(+)
 create mode 100644 hello.txt
```

初めて`git commit`した時点で、`master`ブランチの実体が作られます。

```sh
$ cat .git/refs/heads/master
c9503326279796b24be86bdf9beb01c1af2d2b95
```

先ほど作られたコミットオブジェクト`c950332`を指していますね。このように、通常は`HEAD`はブランチのファイルの場所を指し、ブランチのファイルはコミットオブジェクトのハッシュを保存しています。`git log`で見てみましょう。

```sh
$ git log --oneline
c950332 (HEAD -> master) initial commit
```

`HEAD -> master`と、`HEAD`が`master`を指していることが明示されています。

## Detached HEAD状態

さて、直接コミットハッシュを指定して`git checkout`してみましょう。

```sh
$ git checkout c950332
Note: switching to 'c950332'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -c with the switch command. Example:

  git switch -c <new-branch-name>

Or undo this operation with:

  git switch -

Turn off this advice by setting config variable advice.detachedHead to false

HEAD is now at c950332 initial commit
```

これで、`HEAD`がブランチを介してではなく、直接コミットを指している状態、いわゆる「detached HEAD」になりました。この状態で`git log`を見てみます。

```sh
$ git log --oneline
c950332 (HEAD, master) initial commit
```

先ほどと異なり、`HEAD`と`master`の間の矢印が消えました。`HEAD`の中身を見てみましょう。

```sh
$ cat .git/HEAD
c9503326279796b24be86bdf9beb01c1af2d2b95
```

`HEAD`が直接コミットを指していることがわかります。

![detached_head](https://github.com/kaityo256/zenn-content/raw/main/articles/inside_the_branch/detached_head.png)

`master`に戻りましょう。

```sh
$ git switch master
$ cat .git/HEAD
ref: refs/heads/master
```

`.git/HEAD`の中身がブランチへの参照に戻ります。

## ブランチの作成と削除

`master`ブランチから、もう一つブランチを生やして見ましょう。

```sh
git switch -c branch
```

これで、`branch`ブランチが作られ、`master`の指すコミットと同じコミットを指しているはずです。まずは`git log`で見てみましょう。

```sh
$ git log --oneline
c950332 (HEAD -> branch, master) initial commit
```

`HEAD`は`branch`を指し、`branch`も`master`も`c950332`を指している状態です。ファイルの中身も確認しましょう。

```sh
$ cat .git/HEAD
ref: refs/heads/branch

$ cat .git/refs/heads/master
c9503326279796b24be86bdf9beb01c1af2d2b95

$ cat .git/refs/heads/branch
c9503326279796b24be86bdf9beb01c1af2d2b95
```

`.git/refs/heads/master`と同じ内容の`.git/refs/heads/branch`が作成されています。

では、人為的に`.git/refs/heads/`にもう一つファイルを作ったらどうなるでしょうか？

```sh
$ cp .git/refs/heads/master .git/refs/heads/branch2
$ ls .git/refs/heads
branch  branch2  master
```

`.git/refs/heads`内に、`branch2`というファイルが作成されました。`git log`を見てみましょう。

```sh
$ git log --oneline
c950332 (HEAD -> branch, master, branch2) initial commit
```

`branch2`が増え、`master`や`branch`と同じコミットを指していることが表示されました。すなわち、`git`は`git log`が叩かれた時、全てのブランチがどのコミットを指しているか調べています。また、ブランチの作成が、単にファイルのコピーで実装されていることがわかります。

作った`branch2`をgitを使って消しましょう。

```sh
$ git branch -d branch2
Deleted branch branch2 (was c950332).

$ ls .git/refs/heads
branch  master
```

問題なく消せます。`.git/refs/heads`にあったブランチの実体も消えました。つまり、ブランチの削除は単にファイルの削除です。

## 歴史の削除

`git init`直後はブランチの実体ファイルが無く、その状態で`git log`をすると「一つもコミットが無いよ」と言われました。それを見てみましょう。

現在、カレントブランチは`branch`で、最初のコミット`c950332`を指しています。

```sh
$ git log --oneline
c950332 (HEAD -> branch, master) initial commit
```

`branch`の実体を消してしまいましょう。

```sh
rm .git/refs/heads/branch
```

もう一度`git log`をしてみます。

```sh
$ git log
fatal: your current branch 'branch' does not have any commits yet
```

ブランチが無いので、「歴史がない」と判断されます。しかし、インデックスの実体`.git/index`は存在するため、`git diff`はできます。ちょっとファイルを修正して`git diff`してみましょう。

```sh
$ echo "Hi" >> hello.txt
$ git diff
diff --git a/hello.txt b/hello.txt
index e965047..2236327 100644
--- a/hello.txt
+++ b/hello.txt
@@ -1 +1,2 @@
 Hello
+Hi
```

この状態で`git add`、`git commit`することができます。

```sh
$ git add hello.txt
$ git commit -m "updates hello.txt"
[branch (root-commit) a35d7e4] updates hello.txt
 1 file changed, 2 insertions(+)
 create mode 100644 hello.txt
```

ブランチの実体がなかったため、これが最初のコミット(`root-commit`)とみなされ、ここでブランチが作成されます。

```sh
$ ls .git/refs/heads
branch  master
```

`master`に戻っておきましょう。

```sh
git switch master
```

## リモートブランチ

リモートブランチも、普通にブランチと同じようにファイルで実装されています。見てみましょう。

まずはリモートブランチ用のベアリポジトリを作ります。一つの上のディレクトリに掘りましょう。

```sh
git init --bare ../test.git
```

ベアリポジトリは、`.git`の中身がそのままディレクトリにぶちまけられたような内容になっています。見てみましょう。

```sh
$ tree ../test.git
../test.git
├── HEAD
├── branches
├── config
├── description
├── hooks
│   ├── applypatch-msg.sample
│   ├── commit-msg.sample
│   ├── fsmonitor-watchman.sample
│   ├── post-update.sample
│   ├── pre-applypatch.sample
│   ├── pre-commit.sample
│   ├── pre-merge-commit.sample
│   ├── pre-push.sample
│   ├── pre-rebase.sample
│   ├── pre-receive.sample
│   ├── prepare-commit-msg.sample
│   └── update.sample
├── info
│   └── exclude
├── objects
│   ├── info
│   └── pack
└── refs
    ├── heads
    └── tags

9 directories, 16 files
```

`git init`直後の`.git`ディレクトリと同じ中身になっていますね。

さて、こいつを`origin`に指定して、上流ブランチを`origin/master`にして`push`してやりましょう。

```sh
$ git remote add origin ../test.git
$ git push -u origin master
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Writing objects: 100% (3/3), 227 bytes | 227.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To ../test.git
 * [new branch]      master -> master
Branch 'master' set up to track remote branch 'master' from 'origin'.
```

これで、`origin/master`ブランチが作成され、`master`の上流ブランチとして登録されました。

```sh
$ git branch -vva
  branch                a35d7e4 updates hello.txt
* master                c950332 [origin/master] initial commit
  remotes/origin/master c950332 initial commit
```

`remotes/origin/master`ブランチが作成され、`master`ブランチの上流が`origin/master`になっています。

さて、`remotes/origin/master`の実体は、`.git/refs/remotes/origin/master`にあります。そこには、単にコミットハッシュが記録されているだけです。

```sh
$ cat .git/refs/remotes/origin/master
c9503326279796b24be86bdf9beb01c1af2d2b95
```

また、`master`の実体も同じコミットハッシュを指しているだけです。

```sh
$ cat .git/refs/heads/master
c9503326279796b24be86bdf9beb01c1af2d2b95
```

では、`master`の上流ブランチはどこで管理されているかというと、`.git/config`です。中身を見てみましょう。

```sh
$ cat .git/config
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[remote "origin"]
        url = ../test.git
        fetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
        remote = origin
        merge = refs/heads/master
```

このファイルの階層構造は`git config`でそのままたどることができます。

```sh
$ git config branch.master.remote
origin

$ git config remote.origin.url
url = ../test.git
```

また、`git log`は、リモートブランチも調べてくれます。

```sh
$ git log --oneline
c950332 (HEAD -> master, origin/master) initial commit
```

`origin/master`が、`master`と同じブランチを指していることがわかります。ちなみに、先ほど作った`branch`は、`master`と全く歴史を共有していないので、ここには現れません。

もう一つリモートリポジトリを増やしてみましょう。

```sh
git init --bare ../test2.git
git remote add origin2 ../test2.git
```

これで、`.git/config`には`origin2`の情報が追加されます。

```sh
$ cat .git/config
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[remote "origin"]
        url = ../test.git
        fetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
        remote = origin
        merge = refs/heads/master
[remote "origin2"]
        url = ../test2.git
        fetch = +refs/heads/*:refs/remotes/origin2/*
```

しかし、まだ`origin2`の実体は作られていません。

```sh
$ tree .git/refs/remotes
.git/refs/remotes
└── origin
    └── master

1 directory, 1 file
```

`origin`の実体がディレクトリで、その下に`master`ファイルがありますが、`origin2`というディレクトリが無いことがわかります。

さて、`master`ブランチの上流ブランチを`origin2/master`にして`push`しましょう。

```sh
$ git push -u origin2
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Writing objects: 100% (3/3), 227 bytes | 227.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To ../test2.git
 * [new branch]      master -> master
Branch 'master' set up to track remote branch 'master' from 'origin2'.
```

これで`origin2/master`の実体が作られます。

```sh
$ tree .git/refs/remotes
.git/refs/remotes
├── origin
│   └── master
└── origin2
    └── master

2 directories, 2 files
```

そして、`origin2/master`が`master`や`origin/master`と同じコミットハッシュを指します。

```sh
$ cat .git/refs/remotes/origin2/master
c9503326279796b24be86bdf9beb01c1af2d2b95
```

なので、`git log`に`origin2/master`も出てきます。

```sh
c950332 (HEAD -> master, origin2/master, origin/master) initial commit
```

## まとめ

Gitのブランチの実装を調べてみました。ブランチはファイルとして実装され、ブランチの作成はファイルのコピー、削除はファイルの削除になっています。また、`origin/master`みたいなリモートブランチは、`origin`はディレクトリとして実装されています。上流ブランチなどの情報は`.git/config`にあり、`git config`で表示できる情報は、そのまま`.git/config`内のファイルの構造に対応しています。なんというか、すごく「そのまま」実装されている印象ですね。

## 参考文献

* [Pro Git - 10.1 Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain)
