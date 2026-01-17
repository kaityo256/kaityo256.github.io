---
layout: post
title: "整数を419378回インクリメントするとMacのg++が死ぬ"
tags: [programming, devtools, qiita]
permalink: mac_gpp_crash
---

# 整数を419378回インクリメントするとMacのg++が死ぬ

## はじめに

[C++でアスタリスクをつけすぎると端末が落ちる](https://qiita.com/kaityo256/items/d54439246edc1cc58121)という記事を書いたら、[@tanakh](https://twitter.com/tanakh)さんから

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">ソースコードのサイズには線形なんじゃなかろうか / 他5コメント <a href="https://t.co/Rm9c0ceWpa">https://t.co/Rm9c0ceWpa</a> “C++でアスタリスクをつけすぎると端末が落ちる - Qiita” <a href="https://t.co/JrrLZu8WT8">https://t.co/JrrLZu8WT8</a></p>&mdash; Hideyuki Tanaka (@tanakh) <a href="https://twitter.com/tanakh/status/966958426231197696?ref_src=twsrc%5Etfw">2018年2月23日</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

というコメントがありまして。

なるほど確かにソースコードのサイズはアスタリスクの数の二乗に比例するので、コンパイル時間とソースコードのサイズの関係は線形だなぁ、と。

ただ、内部で型のテーブルとか作ってると思うんで[^2]、これが単純にソースコードのサイズの問題なのか調べるために、今度はもう少し簡単なコードを書いてみて、コンパイル時間やコンパイラが利用するメモリを調べてみようと思ったわけですよ。

[^2]: いや、コンパイラ屋さんじゃないのでよく知らんけど。
## 今回のトリビアの種

こんなのを書きました。

```gen.rb
def generate(n)
  open("test.cpp","w") do |f|
    f.puts <<EOS
#include <cstdio>
int
main(void){
  int i=0;
EOS
    n.times do
      f.puts "  i++;"
    end
    f.puts <<EOS
  printf("%d\\n",i);
}
EOS
  end
end

n = 100
n = ARGV[0].to_i if ARGV.size > 0
generate(n)
```

これは、単に`i++;`を並べるだけのコードです。

```shell-session
$ ruby gen.rb 5 
```

とかすると、

```test.cpp
#include <cstdio>
int
main(void){
  int i=0;
  i++;
  i++;
  i++;
  i++;
  i++;
  printf("%d\n",i);
}
```

が出力されます。数字を増やすと`i++;`の行数が増えていきます。これを、以前の記事と同じくらいのサイズになるように調整して、コンパイラの負荷を調べてみようと思ったわけです。

まず10万行くらいから行きますかね。

```shell-session
$ ruby gen.rb 100000
$ wc test.cpp
  100006  100008  700067 test.cpp
$ gtime -f "%e %M" g++ test.cpp
2.53 205680
```

楽勝ですね。じゃ、50万行。

```shell-session
$ ruby gen.rb 500000 
$ gtime -f "%e %M" g++ test.cpp
g++: internal compiler error: Segmentation fault: 11 (program cc1plus)
Please submit a full bug report,
with preprocessed source if appropriate.
See <https://github.com/Homebrew/homebrew-core/issues> for instructions.
Command exited with non-zero status 4
3.47 515904
```

・・・ん？なんかメモリを使い切る前に変な死に方したぞ。

「10万行では死なず、50万行では死にました。ということは、どこかにぎりぎり死ぬ行数があるはずですね。これってトリビアになりませんかね。」

このトリビアの種、つまりこういうことになります。

「整数をXXXXXX回インクリメントするコードを食わせると、コンパイラが死ぬ」

実際に調べてみた。

## 調査コード

どこで死ぬかを二分探索するわけだが、面倒なのでスクリプトにやらせよう。手抜きだが、こんな感じのスクリプトになると思う。

```increments.rb
def generate(n)
  open("test.cpp","w") do |f|
    f.puts <<EOS
#include <cstdio>
int
main(void){
  int i=0;
EOS
    n.times do
      f.puts "  i++;"
    end
    f.puts <<EOS
  printf("%d\\n",i);
}
EOS
  end
end

def search
  s = 100000
  e = 500000
  while (e != s && e != s+1)
    n = (e+s)/2
    generate(n)
    if system("g++ test.cpp 2> /dev/null")
      puts "#{n} OK"
      s = n
    else
      puts "#{n} NG"
      e = n
    end
  end
end

search
```

単純に10万行から50万行の間を二分探索していくコード。コンパイルが成功したかは`system`の返り値で判定している。

さっそく実行してみよう。実行環境は前回と同じでこんな感じ。

* 測定環境
  * MacOS X High Sierra
  * プロセッサ 3.3 GHz Intel Core i5
  * メモリ 8GB
  * g++ (Homebrew GCC 7.2.0) 7.2.0

```shell-session
$ ruby increments.rb
300000 OK
400000 OK
450000 NG
425000 NG
412500 OK
418750 OK
421875 NG
420312 NG
419531 NG
419140 OK
419335 OK
419433 NG
419384 NG
419359 OK
419371 OK
419377 OK
419380 NG
419378 NG
```

というわけで、419377回インクリメントするコードならコンパイルできて、419378回インクリメントするコードを食わすとg++が死ぬ。

* 他に調べたこと
 * メモリが半分の4GBしか積んでないMac Book Proで試しても同じ結果になったので、メモリの問題ではない。
 * Linuxでは同じバージョンのGCCでもエラーにならない(追記：より大きなサイズではUbuntuでも死んだそうです)
 * インテルコンパイラも大丈夫
 * clang++ではMacでもエラーにならない

Windowsは調べてない。

## まとめ

こうしてこの世界にまた一つ
新たなトリビアが生まれた[^1]。

整数を419378回[^3]インクリメントするコードを食わせると、g++ (Homebrew GCC 7.2.0)が死ぬ。

[^1]: えーと、もともとはソースコードサイズとコンパイル時間の関係を調べようかと思ってたんだっけ。まぁいいや。気になったら誰かやって。

[^3]: しかし419378って数字、中途半端だな。なんで決まってるんだろ？
