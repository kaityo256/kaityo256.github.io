---
layout: post
title: "Jcode.pmで「秋葉原UDX」をutf-8から自動判別でutf-8に出力すると文字化けする"
tags: [programming, qiita]
permalink: jcode_akihabara
---

# Jcode.pmで「秋葉原UDX」をutf-8から自動判別でutf-8に出力すると文字化けする

## はじめに

長いこと使ってる自作のスクリプトで、これまで問題を起こさなかったのに、急に文字化けしたので調べたら、Jcode.pmのconvertに、utf-8の文字列を自動判別でutf-8で出力しようとしたのが原因だったので覚書。

## 再現コード

以下が再現コード。手元のMac(Perl v5.16.3)とCentOS (Perl v5.8.8)で再現。スクリプトはutf-8で保存しておく。

```pl
#!/usr/bin/perl
use Jcode;

$val1 = Jcode->new("秋葉原UDX")->utf8;
print "$val1\n";

$val2 = Jcode->new("秋葉原UDX","utf8")->utf8;
print "$val2\n";

$val3 = Jcode->new("秋葉原")->utf8;
print "$val3\n";
```

出力結果。

```shell-session
$ perl test.pl
遘玖痩蜴欟DX
秋葉原UDX
秋葉原
```

とりあえず「秋葉原」は大丈夫だが、「秋葉原a」とか、「原」に半角英語をつなげると文字化けする。これはJCodeが入力文字列の自動判別に失敗しているためで、JCodeのconvertに入力文字列がUTF-8であることを教えてやれば大丈夫だし、スクリプトの最初に`use utf8;`と宣言すればもちろん大丈夫。

## どうでもいい覚書

今回の文字化けの原因はUTF-8の文字列をUTF-8にconvertするという無意味なコードのせい。これまで入力をUTF-8、出力をShift-JISにしてたのを、途中で出力もUTF-8に変更した際、変更の必要が無いにもかかわらず、Jcodeによるconvertが残っていたために発覚したもの。
