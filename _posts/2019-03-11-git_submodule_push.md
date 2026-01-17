---
layout: post
title: "git submoduleを更新してpushを忘れてしまった時"
tags: [linux, qiita]
permalink: git_submodule_push
---

# git submoduleを更新してpushを忘れてしまった時

## はじめに

gitのsubmoduleは、慣れると便利なのだろうが、gitに慣れていないとすぐHEADが外れたり、見慣れないエラーメッセージが出て戸惑ったりする。今回、別の場所で更新したsubmoduleをpushし忘れてしまったので、そうするとどうなるか、どう復帰すればよいかをメモ。

## 再現手順

ロボ太君は家で作業していた。それはmainというリポジトリの中に、submoduleとしてsubというリポジトリを含むものだ。subがライブラリであり、mainからそれを使うのだが、まだどちらも枯れておらず、両方修正する必要がある。それを模すために、ローカルで二つのリポジトリを作ろう。

## submoduleの追加まで

適当なディレクトリ、たとえばtempというディレクトリを作成しよう。

```sh
$ mkdir temp
$ cd temp
```

そこに、submodule用のリポジトリ`sub`を作る。ベアリポジトリの作成、clone、ファイル作成、最初のcommitとpushまでやっておこう。

```sh
$ git init --bare sub.git
Initialized empty Git repository in /path/to/temp/sub.git/

$ git clone sub.git
Cloning into 'sub'...
warning: You appear to have cloned an empty repository.
done.

$ cd sub
$ echo "sub" >> sub.txt
$ git add sub.txt
$ git commit -m "initial commit"
[master (root-commit) f6e78d2] initial commit
 1 file changed, 1 insertion(+)
 create mode 100644 sub.txt
$ git push
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Writing objects: 100% (3/3), 224 bytes | 224.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To /path/to/temp/sub.git
 * [new branch]      master -> master
$ cd ..
```

ここまでで、subというリポジトリができた。次に、これをsubmoduleとして保持するmainというリポジトリを作ろう。

```sh
$ git init --bare main.git
Initialized empty Git repository in /path/to/temp/main.git/
$ git clone main.git
Cloning into 'main'...
warning: You appear to have cloned an empty repository.
done.
```

空のリポジトリを作って、cloneした。これにsubmoduleとして、先程作ったsubを登録し、コミットしてからpushしよう。

```sh
$ cd main
$ git submodule add ../sub.git
Cloning into '/path/to/temp/main/sub'...
done.

$ git commit -m "initial commit"  
[master (root-commit) 0b0122a] initial commit
 2 files changed, 4 insertions(+)
 create mode 100644 .gitmodules
 create mode 160000 sub

$ git push
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Delta compression using up to 4 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 295 bytes | 295.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To /path/to/temp/main.git
 * [new branch]      master -> master
```

ここまでで、こんな状況になった。

![image0.png](/assets/images/git_submodule_push/image0.png)

リモートにmainとsubというbareリポジトリがあり、ローカルにはmainがsubをsubmoduleとして管理し、subの「4699237」というハッシュを持ったコミットを指している。これが、ロボ太君が家で仕事を始める前の状態である。

## submoduleの更新とコミット忘れまで

さて、ロボ太君は、submoduleであるsubを少し修正した。

```sh
$ cd sub
$ echo "sub2" >> sub.txt
$ git ci -m "reivses sub.txt"
[master 4b274dd] reivses sub.txt
 1 file changed, 1 insertion(+)
```

submoduleのコミットのハッシュが4699237から4b274ddに更新された。

すると、mainリポジトリでも、自分が管理しているsubmoduleが変わったことを検知する。

```sh
$ git status
On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   sub (new commits)

no changes added to commit (use "git add" and/or "git commit -a")
```

そこで、ロボ太君は新しいコミットハッシュを参照するようにadd、commit、pushしてやる。

```sh
$ git add sub
$ git commit -m "revises sub"
[master 83d5f3d] revises sub
 1 file changed, 1 insertion(+), 1 deletion(-)
$ git push
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Delta compression using up to 4 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (2/2), 273 bytes | 273.00 KiB/s, done.
Total 2 (delta 0), reused 0 (delta 0)
To /path/to/temp/main.git
   0b0122a..83d5f3d  master -> master
```

さて、ここでmainリポジトリはpushしたが、subリポジトリのpushは忘れていることに注意。この段階でリモートとローカルはこうなっている。

![image1.png](/assets/images/git_submodule_push/image1.png)

mainリポジトリの最新のコミット83d5fd3は、自分の配下にあるsubリポジトリのコミットハッシュは4b274ddだと思っている。しかし、subリポジトリのpushを忘れているので、originのsubリポジトリには「4b274dd」は無い。

## 別の場所でclone --recursive

さて、ここまで家で作業したロボ太君は、そろそろ職場に行くことにする。念の為、push忘れがないか見てみよう。

```sh
$ git log --graph --oneline 
* 83d5f3d (HEAD -> master, origin/master) revises sub
* 0b0122a initial commit
```

うん、コミット忘れもないし、masterとorigin/masterが同じところを指してるな、と満足したロボ太君は、職場に行って、先程作業したリポジトリをclone --recursiveして驚くことになる[^1]。

[^1]: 別の場所でcloneしたことを模すために、ここでは別名(main2)でcloneしている。

```sh
$ git clone --recursive main.git main2
Cloning into 'main2'...
done.
Submodule 'sub' (/path/to/temp/sub.git) registered for path 'sub'
Cloning into '/path/to/temp/main2/sub'...
done.
error: Server does not allow request for unadvertised object 4b274dd998ccf9244be0f42bb693f4513d28e5f9
Fetched in submodule path 'sub', but it did not contain 4b274dd998ccf9244be0f42bb693f4513d28e5f9. Direct fetching of that commit failed.
```

見慣れないメッセージ「Server does not allow request for unadvertised object」というのを見て、ロボ太君は焦ることになる。しかし、その後のメッセージ「Fetched in submodule path 'sub', but it did not contain 4b274dd..」を見て「ハッ」と気づく。

「**やっちまった！ submoduleのpush忘れだ！**」

clone --recursiveした直後の状態はこうなっている。

![image2.png](/assets/images/git_submodule_push/image2.png)

mainは最新の状態がpushされているが、originのsubの状態は古い。なので、subをリモートから持ってきたあとに、mainが指しているはずである4b274ddというコミットが無い。

この仕事は急ぎだ。pushしに家に戻る時間はない。幸い、家で変更した修正は軽微なもので、こっちで適当に修正すれば今日職場で作業するのには十分だ。とりあえず適当に作業して、あとで家に帰ったらマージしよう。

まず、submoduleのcloneに失敗しているので、それをなんとかする。subディレクトリに入って、masterをcheckoutする。

```sh
$ git co master
Already on 'master'
Your branch is up to date with 'origin/master'.
```

これで、とりあえずsub内はちゃんとした(HEADが古いコミットを指している)状態になった。mainリポジトリにもその変更を反映させよう。

```sh
$ cd ..
$ git add sub 
$ git commit -m "updates sub" 
[master deda9ab] updates sub
 1 file changed, 1 insertion(+), 1 deletion(-)
```

これで、少なくともmainのsubmoduleの指す先が存在するコミットに変更できた。今はこんな状態になっている。

![image3.png](/assets/images/git_submodule_push/image3.png)

mainの指すsubのコミットが古いが、やむを得ない。ロボ太君はこれでとりあえず作業を初めた。職場を出る時、今度は両方pushするのを忘れないようにしなければ。家に帰ったら、家での作業をマージする作業が待っている・・・

## まとめ

gitのsubmoduleを修正したあと、pushし忘れて他の場所でcloneなりfetch/mergeしようとすると「Server does not allow request for unadvertised object」というメッセージが出る。慣れた人は「あ、push忘れた！」と気づくのだろうが、僕は時間がかかったので、ここにメモとして残しておく。
