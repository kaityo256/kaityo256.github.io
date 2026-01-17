---
layout: post
title: "Wordさんの疲れ表示スクリプト"
tags: [programming, document, qiita]
permalink: word_tired_script
---

# Wordさんの疲れ表示スクリプト

## はじめに

[Wordさんは今日もおつかれです](http://qiita.com/kaityo256/items/c15889dbb7acb2632c6e)を書くのに使ったスクリプトを

https://github.com/kaityo256/wordlookstired

に置いておきます。何かの参考になればと思って。

## 仕組み

まず、docxファイルをテンポラリディレクトリに展開します。Rubyからunzipするのは地味に面倒なので、外部コマンドとしてunzipを呼んじゃうのが楽です(本番コードでやっちゃだめよ)。

で、REXMLでファイルを読み込んで、`REXML::Formatters::Pretty`で表示させると良い感じです。

以上を行う手抜きスクリプトはこんな感じになります。

```ruby
require 'rubygems'
require 'tmpdir'
require 'rexml/document'

def show(dir)
  f = open(dir + '/word/document.xml') 
  doc = REXML::Document.new(f.gets(nil))
  formatter = REXML::Formatters::Pretty.new
  e =  REXML::XPath.first(doc.root,'w:body/w:p')
  formatter.write(e, $stdout)
  puts
end

if ARGV.size ==0
  puts "Please specify input file"
  exit
end
inputfile = ARGV[0]

Dir.mktmpdir(nil,'./') do |dir|
  `cd #{dir};unzip ../#{inputfile}`
  show(dir)
end

```



例えば、先のgithubのcase1ディレクトリにあるtest1.docxの中身はこんな感じになっています。

![image0.png](/assets/images/word_tired_script/image0.png)


これを

```shell-session
$ ruby showdoc.rb test1.docx
```

としてスクリプトに食わせると、

```xml
<w:p>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      あいうえお
    </w:t>
  </w:r>
  <w:bookmarkStart w:id='0' w:name='_GoBack'/>
  <w:bookmarkEnd w:id='0'/>
</w:p>
```

みたいに表示されます。Dir.mktmpdirのブロック内でunzipすると、ブロック終了時にいらないファイルがごそっと消えて地味に便利。

## 箇条書きの表示

箇条書きの表示も同様です。単に開くファイルが`/word/document.xml`から`/word/numbering.xml`になるだけです。略記の為に、attributesとか使ってみましょう。

```ruby
require 'rubygems'
require 'tmpdir'
require 'rexml/document'

def show_pretty(e)
  formatter = REXML::Formatters::Pretty.new
  formatter.write(e,$stdout)
  puts
end

def show(dir)
  f = open(dir + '/word/numbering.xml') 
  doc = REXML::Document.new(f.gets(nil))
  formatter = REXML::Formatters::Pretty.new
  REXML::XPath.each(doc.root,'w:abstractNum') do |e|
    print "<w:abstractNum " 
    e.attributes.each do |k,v|
      print " #{k}='#{v}'"
    end
    puts "> ... </w:abstractNum>"
  end
  REXML::XPath.each(doc.root,'w:num') do |e|
    show_pretty(e)
  end
end

if ARGV.size ==0
  puts "Please specify input file"
  exit
end
inputfile = ARGV[0]

Dir.mktmpdir(nil,'./') do |dir|
  `cd #{dir};unzip ../#{inputfile}`
  show(dir)
end
```

これを先のgithubのリポジトリのcase2ディレクトリで、以下のように実行します。

```shell-session
$ ruby shownumbering2.rb test3.docx 
```

実行結果はこんな感じになります。

```xml
<w:abstractNum  w:abstractNumId='0' w15:restartNumberingAfterBreak='0'> ... </w:abstractNum>
<w:abstractNum  w:abstractNumId='1' w15:restartNumberingAfterBreak='0'> ... </w:abstractNum>
<w:num w:numId='1'>
  <w:abstractNumId w:val='0'/>
</w:num>
<w:num w:numId='2'>
  <w:abstractNumId w:val='1'/>
</w:num>
```

役に立つかわかりませんが、他にもdocxファイルの疲れの可視化とかしたい人とかの参考になれば。
