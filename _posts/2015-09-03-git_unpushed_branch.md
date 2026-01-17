---
layout: post
title: "未pushのコミットがある追跡ブランチをマージした上で削除しようとすると怒られる"
tags: [linux, qiita]
permalink: git_unpushed_branch
---

# 未pushのコミットがある追跡ブランチをマージした上で削除しようとすると怒られる

## 概要

トピックブランチでの作業が終わり、masterにマージしたので削除しようとすると怒られて「あれ？マージしたのに？」と思うことがある。実はマージ忘れで削除しようとした場合と、push忘れで削除しようとした場合で怒られ方が違う。いつも忘れていて、文句を言われる度に思い出すので覚書。以下、`ci = commit -a`、`co = checkout`にaliasしてあるので注意。

## マージ忘れ削除

マージを忘れたままブランチを削除してみる。
まずは適当なリポジトリを作る。

```shell-session
$ git init test
$ cd test
$ echo Hello > test.txt
$ git add test.txt
$ git ci -m "Initial commit" # 適当なファイル追加してコミット
```

この状態でトピックブランチtopicを作り、なんかコミットしておく。

```shell-session
$ git co -b topic
Switched to a new branch 'topic'

$ echo Hello2 >> test.txt
$ git ci -m "modifies test.txt" 
[topic 0f90d8e] modifies test.txt
 1 file changed, 1 insertion(+)
```

で、masterに戻ってtopicを削除しようとするとerrorが出て「マージしてないよ！」怒られる。

```shell-session
$ git co master
$ git branch -d topic
error: The branch 'topic' is not fully merged.
If you are sure you want to delete it, run 'git branch -D topic'.
```

この場合、出るのはエラー。

## push忘れ削除

リモートにpushを忘れたままブランチを削除してみる。

適当なリポジトリとベアリポジトリを作って、originとしてリモートに追加しておく(さっきのtestリポジトリは削除しておいた)。

```shell-session
$ git init --bare test.git
$ git init test 
$ cd test
$ echo Hello > test.txt
$ git add test.txt
$ git ci -m "Initial commit" # 適当なファイル追加してコミット
$ git remote add origin ../test.git    # リモート追加
$ git push --set-upstream origin master # リモートにプッシュ
```

同様にtopicブランチを作って、まず何もせずにプッシュする。

```shell-session
$ git co -b topic
Switched to a new branch 'topic'

$ git push --set-upstream origin topic  
Total 0 (delta 0), reused 0 (delta 0)
To ../test.git
 * [new branch]      topic -> topic
Branch topic set up to track remote branch topic from origin.
```

その後、何か修正してコミット、

```shell-session
$ echo Hello2 >> test.txt
$ git ci -m "modifies test.txt" 
[topic 950ee33] modifies test.txt
 1 file changed, 1 insertion(+)
```

masterにマージしてから削除しようとすると怒られる。

```shell-session
$ git co master
$ git merge topic
Updating e32d81f..950ee33
Fast-forward
 test.txt | 1 +
 1 file changed, 1 insertion(+)

$ git branch -d topic  
warning: not deleting branch 'topic' that is not yet merged to
         'refs/remotes/origin/topic', even though it is merged to HEAD.
error: The branch 'topic' is not fully merged.
If you are sure you want to delete it, run 'git branch -D topic'.
```

マージ忘れコミットではerrorが出たが、今度はwarning。「ブランチ'topic'は、HEADにはマージされているけど、リモートの'origin/topic'にマージされて無いよ」という内容。

ちゃんとpushした後は削除できる。

```shell-session
$  git co topic 
Your branch is ahead of 'origin/topic' by 1 commit.
  (use "git push" to publish your local commits)

$ git push 
Counting objects: 3, done.
Writing objects: 100% (3/3), 264 bytes | 0 bytes/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To ../test.git
   e32d81f..950ee33  topic -> topic

$ git co master
Switched to branch 'master'
Your branch is ahead of 'origin/master' by 1 commit.
  (use "git push" to publish your local commits)
 
$ git branch -d topic
Deleted branch topic (was 950ee33).  # 無事に削除される。
```

## まとめ

トピックブランチが追跡ブランチになっている場合、別のブランチにマージした後でも、リモートにpushを忘れたまま削除しようとすると警告がでる。ちゃんと警告の内容を読まないとマージ忘れのエラーと間違えて「あれ？マージしたのに」としばらく悩むかも。
