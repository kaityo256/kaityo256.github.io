---
layout: post
title: "PryでTempfileオブジェクトを評価するとFileと表示される"
tags: [programming, qiita]
permalink: pry_tempfile
---

# PryでTempfileオブジェクトを評価するとFileと表示される


## TL;DR

* Pryで`Tempfile`オブジェクトを評価すると、`File`と表示される
* これはPryのデフォルトインスペクタがppであり、`Tempfile`クラスが`print_pretty`の処理を`File`クラスに移譲しているから

## 現象

Pryで`Tempfile`オブジェクトを作って評価すると、`File`と表示される。

```pry
[1] pry(main)> f = Tempfile.new
=> #<File:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1401-kvolc2>
```

もちろん`Tempfile`クラスは`File`クラスではなく、`inspect`するとちゃんと`Tempfile`と表示される

```pry
[2] pry(main)> f.inspect
=> "#<Tempfile:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1401-kvolc2>"
```

そもそも`Tempfile`クラスは`File`クラスとis aの関係にない。

```pry
[3] pry(main)> f.is_a?(File)
=> false
```

irbではこのようなことは起きない。

```irb
irb(main):001:0> require "tempfile"
=> true
irb(main):002:0> f = Tempfile.new
=> #<Tempfile:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1422-in132m>
```

## 原因

TL;DRにも書いたが、原因はPryのデフォルトインスペクタがppであり、ppがオブジェクトの`pretty_print`を要求するが、`Tempfile`が`File`のDelegateClassになっており、`inspect`は自前で持っているが、`pretty_print`は持っていないので、その処理を`File`に移譲してしまうから。

従って、irbでもデフォルトインスペクタをppにすると同じことが起きる。

```irb
$ irb --inspect pp
irb(main):001:0> require "tempfile"
=> true
irb(main):002:0> f = Tempfile.new
=> #<File:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1493-fvvhrn>
irb(main):003:0> 
```

逆に、`Tempfile`に`pretty_print`を実装すればPryでもこの問題は起きない。

```pry
[1] pry(main)> f = Tempfile.new  # Fileと表示される
=> #<File:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1501-1z0rdk5>

[2] pry(main)> class Tempfile
[2] pry(main)*   def pretty_print(q)  # Tempfileクラスにpretty_printを追加
[2] pry(main)*     q.text inspect
[2] pry(main)*   end  
[2] pry(main)* end  
=> :pretty_print

[3] pry(main)> f  # Tempfileと表示される
=> #<Tempfile:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1501-1z0rdk5>
[4] pry(main)> 
```

また、Pryのデフォルトインスペクタをsimpleにしてもこの問題は起きない。

```pry
[1] pry(main)> f = Tempfile.new
=> #<File:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1569-1sbfpbu>

[2] pry(main)> f # デフォルトではFileと評価される
=> #<File:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1569-1sbfpbu>

[3] pry(main)> change-inspector simple
Switched to the 'simple' inspector!

[4] pry(main)> f # simpleインスペクタではTempfileと評価される
#<Tempfile:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1569-1sbfpbu>
```

## まとめ

ちょっとTempfileについて調べてたらPryの変な挙動を見つけたのでまとめてみた。`Tempfile`だけでなく、`inpsect`は実装しているが`pretty_print`は実装されていないDelegateClass全般で同じ問題がおきるはず。一番まっとうな解決策は`require "pp"`されたときに、`Tempfile`に`pretty_print`メソッドを追加することなんだろうけど、特に実害も無いし、issue立てたりプルリクを作るほどでも無い気がする・・・？

## その他

Pryのインスペクタにはもう一つ、clippedがある。これで`Tempfile`オブジェクトのinspectを評価すると`String`になってしまう。

```pry
[1] pry(main)> f = Tempfile.new
=> #<File:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1591-1uujsu6>

[2] pry(main)> f.inspect # デフォルトインスペクタではTempfileと表示される
=> "#<Tempfile:/var/folders/5x/jy4d20b97jgcsgf4mt7dwwqr0000gn/T/20180808-1591-1uujsu6>"

[3] pry(main)> change-inspector clipped
Switched to the 'clipped' inspector!

[4] pry(main)> f.inspect # clippedインスペクタではStringと表示されてしまう。
#<String:0x7fe23d102710>

[5] pry(main)> 
```

これは、Pryのclippedインスペクタが、[60文字を超えるとオブジェクトのクラス名+IDを表示する仕様](https://www.rubydoc.info/github/pry/pry/master/Pry#view_clip-class_method)だから。

```pry
[1] pry(main)> change-inspector clipped
Switched to the 'clipped' inspector!
[2] pry(main)> "X"*58
"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
[3] pry(main)> "X"*59
#<String:0x7ff6a60a5c18>
[4] pry(main)> 
```

そういう仕様だと言われたらそうなんだけど、`Tempfile`オブジェクトをinspectした結果が「String」とか言われたらちょっとびっくりしない？
