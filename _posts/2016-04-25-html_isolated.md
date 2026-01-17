---
layout: post
title: "HTMLの孤島発見スクリプト"
tags: [programming, qiita]
permalink: html_isolated
---

# HTMLの孤島発見スクリプト

## はじめに

長いことウェブサイトを管理してて、どこからもリンクされていないファイルが増えてきた。それを気軽にチェックしたかったのだが、そのために何かインストールしたりするのも面倒だし、いちいちそんなのGUIでチェックするのも鬱陶しい。それくらいどこかに転がってるだろうと思ってちょっと探したが見つからなかったので超手抜き孤島発見Rubyスクリプトを書いた。無責任無保証。

## 使い方

自分のウェブサイトのファイルがあるディレクトリ(例えばpublic_html)で、上記スクリプトを実行すると、どこからもリンクされていないと思われるhtmlファイルを報告する。

```shell-session
$ cd public_html
$ ruby linkchecker.rb
/path/to/public_html/foo.html is isolated.
/path/to/public_html/bar.html is isolated.
```

## スクリプト

```ruby
## Copyright kaityo256 2016
## Distributed under the Boost Software License, Version 1.0.
## (See accompanying file LICENSE_1_0.txt or copy at
## http://www.boost.org/LICENSE_1_0.txt)

def findlink(filename,h)
  dir = File.dirname(filename)
  open(filename){|f|
    f.gets(nil).scan(/a href=\"(.*?)\"/).each{|a|
      s = a[0]
      next if s =~ /^http/
      next if s =~/^#/
      if s=~/(.*?html)#/
        s = $1
      end
      next if s !~/html$/
      s =  File.expand_path(s,dir)
      h[s] = true
    }
  }  
end

h = Hash.new
files = Array.new
Dir.glob('./**/*').each{|filename|
  if filename =~ /html$/
    full = File.expand_path(filename)
    files.push full
    findlink(full,h)
  end
}

files.each{|f|
  if !h.has_key?(f)
    puts "#{f} is isolated."
  end
}
```


## 動作原理

Dir.globで、スクリプトを実行した場所から再帰的にhtmlファイルを探して全てリストアップ。それぞれを一括で読み込んで(`gets(nil)`)、リンクを全部調べる('scan')。見つかったリンクをフルパスになおしてハッシュに突っ込む。全てハッシュに突っ込んだら、全てのhtmlファイルがそのハッシュに存在するか調べ、なかったら報告する。

## 余談

何も指定しなければ、おそらくUTF-8じゃないと動かない(それ以外のファイルが来たら止まる)。また、複数のエンコーディングが混ざっている場合に対応させるのはちょっと面倒だと思う。
