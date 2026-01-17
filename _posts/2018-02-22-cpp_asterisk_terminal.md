---
layout: post
title: "C++でアスタリスクをつけすぎると端末が落ちる"
tags: [programming, qiita]
permalink: cpp_asterisk_terminal
---

# C++でアスタリスクをつけすぎると端末が落ちる

## はじめに

CとかC++にはポインタを表すアスタリスク(＊)がありますね。例えば

```cpp
int *p;
```

なら`int`型へのポインタだし、

```cpp
int **p;
```

なら`int *`型へのポインタになります。

これ、`int *****p`といくらでも付けられるわけですが、いったいいくつまでつけられるんでしょうか。これってトリビアになりませんかね。

実際に調べてみた。

## スクリプト

こんな適当なスクリプトを書く。

```rb
n = 100
if ARGV.size > 0
  n = ARGV[0].to_i
end

puts "#include <cstdio>"
puts "int main(void){"
puts "int #{"*"*n}a;"
n.times do |i|
  puts "#{"*"*i}a = new (int#{"*"*(n-i-1)});"
end
puts <<EOS
printf("%x\\n",a);
}
EOS
```

実行するとこんな感じ。

```shell-session
$ ruby manyasterisk.rb 3
```

```test.cpp
#include <cstdio>
int main(void){
int ***a;
a = new (int**);
*a = new (int*);
**a = new (int);
printf("%x\n",a);
}
```

要するに、最大何個アスタリスクをつけるかを引数で指定し、その数だけnewするコードを吐く。

10とか指定するといい感じに鬱陶しくなる。

```test.cpp
#include <cstdio>
int main(void){
int **********a;
a = new (int*********);
*a = new (int********);
**a = new (int*******);
***a = new (int******);
****a = new (int*****);
*****a = new (int****);
******a = new (int***);
*******a = new (int**);
********a = new (int*);
*********a = new (int);
printf("%x\n",a);
}
```

これをコンパイルして、最大何個までいけるか調べてみよう。

## 実行結果

とりあえずアスタリスクを増やすにつれてコンパイルが重くなるので、timeで時間とメモリを測定してみよう。

* 測定環境
  * MacOS X High Sierra
  * プロセッサ 3.3 GHz Intel Core i5
  * メモリ 8GB
  * g++ (Homebrew GCC 7.2.0) 7.2.0

こんなシェルスクリプトで測る。

```test.sh
for i in 10 100 500 1000 1500 2000 2100 2200 2300 2500 3000
do
  ruby manyasterisk.rb $i > test.cpp
  gtime -f "$i %e %M" g++ test.cpp
done
```

Macに入ってる`time`は`-f`に対応してなかったので、

```shell-session
$ brew install gnu-time
```

でgtimeを入れた。

実行結果はこんな感じ。

```shell-session
10 0.10 19416
100 0.15 31316
500 1.52 315076
1000 6.26 1204280
1500 14.55 2393704
2000 29.08 3035956
2100 32.44 3860972
2200 36.10 4146356
2300 39.34 4496472
2500 48.04 5004156
3000 73.04 5643984
```

それぞれアスタリスクの数、実行時間、最大利用メモリ。これ以上大きくしようとしたら**端末が落ちた**のでやってない。

実行時間のアスタリスク数依存性はこんな感じ。

![image0.png](/assets/images/cpp_asterisk_terminal/image0.png)

アスタリスク数が多いところでは概ね$O(N^2)$ですかね。

メモリ使用量はこんな感じ。

![image1.png](/assets/images/cpp_asterisk_terminal/image1.png)

こっちはアスタリスク数にたいして線形っぽいですが、微妙です。

## まとめ

`int ******************a`みたいに、たくさんアスタリスクつけたらどこか(256個とか)でコンパイラに怒られるかと思ったのですが、メモリが許す限り1000個でも2000個でもつけられるみたいですね。僕は3000個超えたあたりでシステムが不安定になって端末が「予期しない理由」で落ちだしたのでそれ以上はやってませんが、メモリに余裕があるアスタリスク好きな人は1万個でも100万個でも好きなだけつければいいんじゃないでしょうか。

## 関連記事

* [コンパイラは関数のインライン展開を☓☓段で力尽きる](https://qiita.com/kaityo256/items/b4dc66c92338c0b92552)
