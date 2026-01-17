---
layout: post
title: "git rebase -iでまとめたコミットがemptyになった時の対処法"
tags: [linux, qiita]
permalink: git_rebase_empty
---

# git rebase -iでまとめたコミットがemptyになった時の対処法

## はじめに

コミットログの整理のため、git rebase -i でいくつかのコミットを整理することを考える。しかし、rebaseの途中にできたパッチが空になると、rebaseが失敗する。その時のエラーメッセージや対処法が分かりづらかったのでメモ。

## 現象

こんな感じの作業をする。

1. 「Hello」という内容のテキストファイルtest.txtを作る
2. test.txtに「foo」を追加する。
3. test.txtに「bar」を追加する。
4. やっぱり気が変わって「foo」「bar」を削除する
5. test.txtに「baz」を追加する

実際の作業はこんな感じ。最初のコミットにstartというタグをつけてある。

```
rm -rf rebasetest
mkdir rebasetest
cd rebasetest
git init .
echo "Hello" > test.txt
git add test.txt
git ci -m "initial commit"
git tag start
echo "foo" >> test.txt; git ci -m "added foo"
echo "bar" >> test.txt; git ci -m "added bar"
echo "Hello" > test.txt; git ci -m "removes foo and bar"
echo "baz" >> test.txt; git ci -m "added baz"
```

現在、歴史はこうなっている。

```
$ git log --oneline --decorate=full  
a66d81b (HEAD -> refs/heads/master) added baz
3f47582 removes foo and bar
5ee48a3 added bar
747d57c added foo
b9a1466 (tag: refs/tags/start) initial commit
```

この歴史をrebase -iで改変し、4つのコミットをまとめよう。

```
$ git rebase -i start
```

エディタが立ち上がるので、最初以外のコミットを全部squashしてしまおう。

```
pick 747d57c added foo
s 5ee48a3 added bar
s 3f47582 removes foo and bar
s a66d81b added baz
```

すると以下のようなことを言われて失敗する。

```
You asked to amend the most recent commit, but doing so would make
it empty. You can repeat your command with --allow-empty, or you can
remove the commit entirely with "git reset HEAD^".
interactive rebase in progress; onto b9a1466
Last commands done (3 commands done):
   s 5ee48a3 added bar
   s 3f47582 removes foo and bar
Next command to do (1 remaining command):
   s a66d81b added baz
You are currently rebasing branch 'master' on 'b9a1466'.

No changes

Could not apply 3f47582c9591141b87f0a1f6b4592904f9cb297f... removes foo and bar
```

これは、rebaseがコミットから順番にパッチを作っていく際、「foo追加」「bar追加」「fooとbarを削除」までまとめたときに、パッチが空になってしまうから。

そのまま強引に続けて、最初の3つのコミットを「did nothing」に、次に「did nothing+added baz」を「added baz」にまとめる。

```
$ git rebase --continue
[detached HEAD 2903756] did nothing
 1 file changed, 2 deletions(-)
[detached HEAD 10276ff] added baz
 Date: Mon Jan 30 18:52:29 2017 +0900
 1 file changed, 1 insertion(+), 2 deletions(-)
Successfully rebased and updated refs/heads/master.
```

この状態で歴史はこうなっている。

```
$ git log --oneline --decorate=full
10276ff (HEAD -> refs/heads/master) added baz
4a953e1 # This is a combination of 2 commits. # This is the 1st commit message:
b9a1466 (tag: refs/tags/start) initial commit
```

余計なコミット「4a953e1」が残ってしまった。


## 対処法

rebase -iが途中でとまったところでは、歴史はこうなっている。

```
$ git log --oneline --decorate=full
4a953e1 (HEAD) # This is a combination of 2 commits. # This is the 1st commit message:
b9a1466 (tag: refs/tags/start) initial commit
```

ここで、新たな中間コミット「4a953e1」ができている。

こいつをなんとかしないといけないので、`git commit --amend --allow-empty`でコミットを修正する。エディタが立ち上がるので、コミットメッセージを「did nothing」としよう。


```
$ git commit --amend --allow-empty  
[detached HEAD 6758568] did nothing
 Date: Mon Jan 30 18:52:29 2017 +0900
```

新たなコミット「6758568」が出来上がる。現時点での歴史はこうなっており、「added baz」の修正はまだ適用されていない。

```
$ git log --oneline --decorate=full 
6758568 (HEAD) did nothing
b9a1466 (tag: refs/tags/start) initial commit
```

この状態で`git rebase --continue`すると、残っていた修正が適用される。コミットログを「added baz」にまとめよう。

```
$ git rebase --continue
[detached HEAD a45be5a] added baz
 Date: Mon Jan 30 18:52:29 2017 +0900
 1 file changed, 1 insertion(+)
Successfully rebased and updated refs/heads/master.
```

これで所望の歴史になった。

```
$ git log --oneline --decorate=full  
a45be5a (HEAD -> refs/heads/master) added baz
b9a1466 (tag: refs/tags/start) initial commit
```

## まとめ

`git rebase -i`で複数のコミットをまとめた結果、パッチが空になるときのエラーと対処法がわかりづらいのでまとめた。プログラムでこういうことはあまりないけど、文章を推敲していたりすると「延々追加したけど、やっぱり削除して、前のコミットと同じ状態に戻る」ということがわりとあるので、それをrebase -iするとこの問題にぶつかる。無論、不要だとわかっているコミットがわかっていればスキップするなりなんなりすればいいだけなんだけど、個人的には`git rebase`にも`--allow-empty`オプションがあってもいいんじゃないかな〜と思った。

##  追記

余計な中間コミットが残った状態で`git rebase --continue`してしまった場合も、対処は簡単で、もう一度`rebase -i`すれば良い。

`git rebase --continue`した直後はこうなっている。

```
$ git log --oneline --decorate=full
10276ff (HEAD -> refs/heads/master) added baz
4a953e1 # This is a combination of 2 commits. # This is the 1st commit message:
b9a1466 (tag: refs/tags/start) initial commit
```

中間コミット「4a953e1」が残った状態。この状態でさらに`git rebase -i start`をする。

```
$ git rebase -i start
pick 4a953e1 # This is a combination of 2 commits. # The first commit's message is:
s 10276ff added baz

Successfully rebased and updated refs/heads/master.
```

これで所望の歴史になった。

```
$ git log --oneline
a45be5a (HEAD -> refs/heads/master) added baz
b9a1466 (tag: refs/tags/start) initial commit
```
