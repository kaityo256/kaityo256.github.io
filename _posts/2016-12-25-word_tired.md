---
layout: post
title: "Wordさんは今日もおつかれです"
tags: [document, qiita]
permalink: word_tired
---

# Wordさんは今日もおつかれです

## TL;DR

* Wordは箇条書きを作る度に膨大な情報がコピーされ、それは元の箇条書きを消しても残る(Windows/Mac共通)
* Wordは文章を編集するたびに、中身が断片化する。一度断片化したら元には戻らない(Mac版のみ)
* 断片化、参照されていない箇条書き情報については「名前をつけて保存」しても解消しないが、「全て選択してコピー、新規作成したファイルに貼り付け」で解消する。

## 2018年9月19日追記

 本稿にはもともと「Windowsで作成したWordファイルをMacで修正すると断片化する？」という仮説が追記として掲載されていましたが、実際には「作成環境に関係なく、Mac版Wordで編集すると断片化する」ことがわかりましたので、後で読む方の混乱を避けるためにその追記を削除しました。

## はじめに

Wordファイルを扱っていて「だんだん重くなっていく」と感じたことはないだろうか。特に、代々引き継がれてきたファイルほど、修正や保存が重くなる、と感じたことはないだろうか？あなたのその感覚は正しい。長い間修正され続け、重くなったWordファイルを、個人的に「疲れたファイル」と呼んでいる。この記事では、Wordがなぜ「疲れる」のかを説明したい。

## 基本的な構造

Wordのdocxファイルがzip圧縮されたXMLだというのはよく知られているが、細かい仕様についてはあまりちゃんとしたドキュメントが見当たらない。Wordファイルをそのままunzipすると、こんな感じのファイル構成になっている(ファイルによって内容が若干異なる)。

* [Content_Types].xml
* _rels
    * .rels
* docProps
    * app.xml
    * core.xml
* word
    * _rels
        * document.xml.rels
    * theme
        * theme1.xml
    * document.xml
    * fontTable.xml
    * settings.xml
    * styles.xml
    * numbering.xml
    * webSettings.xml

このうち重要なのはwordディレクトリで、ドキュメントの内容がdocument.xmlに、スタイルがstyles.xmlに、箇条書きや番号付きリストの情報がnumbering.xmlに入っている。

## Case1: ドキュメントのフラグメンテーション

document.xmlの中身は、w:bodyの中にw:p要素がずらずらならんでいる形になっている。たとえば、以下のようなWordファイルを考える。

![image0.png](/assets/images/word_tired/image0.png)

単に「あいうえお」とだけ書かれたファイル。このファイルの/word/document.xmlのw:bodyの中身は、

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

となっている。w:p要素の中にはw:r要素があり、その中にスタイルを指定するw:rPr要素と、中身のテキストを指定するw:t要素が入っている。

さて、この「あいうえお」の途中に、数字の1を挿入してみよう。こんな感じ。

![image1.png](/assets/images/word_tired/image1.png)

このファイルのw:bodyの中身はこうなる。

```xml
<w:p>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      あいう1
    </w:t>
  </w:r>
  <w:bookmarkStart w:id='0' w:name='_GoBack'/>
  <w:bookmarkEnd w:id='0'/>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      えお
    </w:t>
  </w:r>
</w:p>
```

つまり、「あいう1」と「えお」で分断される。Wordのバージョンや設定によっては、英数字だけ別フォントになるので「あいう」「1」「えお」で分断されることはあるのだが、ここでは同じフォントを使っているにもかかわらず分断されてしまう。

さて、挿入した「1」を削除してみよう。こんな感じ。

![image2.png](/assets/images/word_tired/image2.png)

このファイルの中身はこうなる。

```xml
<w:p>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      あいう
    </w:t>
  </w:r>
  <w:bookmarkStart w:id='0' w:name='_GoBack'/>
  <w:bookmarkEnd w:id='0'/>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      えお
    </w:t>
  </w:r>
</w:p>
```

つまり、一度分断された要素は、二度とくっつかない。文章を修正するたびに、一見同じパラグラフに属す文字たちが、どんどん分断され、断片化がひどくなっていく。当然、その分ファイルサイズも大きくなるし、読み書きも重くなっていく。

## Case2: 箇条書きでたまるゴミ

以下のような番号付きリストを含むファイルを考える。

![image3.png](/assets/images/word_tired/image3.png)

対応するxmlはこんな感じになっている(実際には三要素あるが、一つだけ表示している)。

```xml
    <w:p>
      <w:pPr>
        <w:pStyle w:val='a3'/>
        <w:numPr>
          <w:ilvl w:val='0'/>
          <w:numId w:val='1'/>
        </w:numPr>
        <w:ind w:leftChars='0'/>
      </w:pPr>
      <w:r>
        <w:t>
          Test
        </w:t>
      </w:r>
    </w:p>
```
ここで、w:pPr要素には、スタイル番号(w:pStyleのw:val)と、箇条書き番号(w:numIdのw:val)や、箇条書きレベル(w:ilvlのw:val)などが指定されている。このうち、箇条書き情報はword/numbering.xmlに入っている。w:numbering要素の中にw:abstractNum要素とw:num要素がある。w:num要素は、先ほどのw:numIdに対応する。w:num要素はこんな形になっている。

```xml
  <w:num w:numId='1'>
    <w:abstractNumId w:val='0'/>
  </w:num>
```

つまり、実際の箇条書きスタイルの指定はabstractNumに入っており、w:num要素は、numIdと、w:abstractNumIdとの対応をつける仕組みになっている。微妙にnumIdが1スタートで、w:abstractNumIdが0スタートなのが気になるが、とりあえず気にしないことにする。

このとき、先の箇条書きに対応するabstractNum要素はこんな感じになっている。

```xml
<w:abstractNum w:abstractNumId='0' w15:restartNumberingAfterBreak='0'>
  <w:nsid w:val='330A54B9'/>
  <w:multiLevelType w:val='hybridMultilevel'/>
  <w:tmpl w:val='21E8373A'/>
  <w:lvl w:ilvl='0' w:tplc='0409000F'>
    <w:start w:val='1'/>
    <w:numFmt w:val='decimal'/>
    <w:lvlText w:val='%1.'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='420' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
  <w:lvl w:ilvl='1' w:tplc='04090017' w:tentative='1'>
    <w:start w:val='1'/>
    <w:numFmt w:val='aiueoFullWidth'/>
    <w:lvlText w:val='(%2)'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='840' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
  <w:lvl w:ilvl='2' w:tplc='04090011' w:tentative='1'>
    <w:start w:val='1'/>
    <w:numFmt w:val='decimalEnclosedCircle'/>
    <w:lvlText w:val='%3'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='1260' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
  <w:lvl w:ilvl='3' w:tplc='0409000F' w:tentative='1'>
    <w:start w:val='1'/>
    <w:numFmt w:val='decimal'/>
    <w:lvlText w:val='%4.'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='1680' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
  <w:lvl w:ilvl='4' w:tplc='04090017' w:tentative='1'>
    <w:start w:val='1'/>
    <w:numFmt w:val='aiueoFullWidth'/>
    <w:lvlText w:val='(%5)'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='2100' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
  <w:lvl w:ilvl='5' w:tplc='04090011' w:tentative='1'>
    <w:start w:val='1'/>
    <w:numFmt w:val='decimalEnclosedCircle'/>
    <w:lvlText w:val='%6'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='2520' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
  <w:lvl w:ilvl='6' w:tplc='0409000F' w:tentative='1'>
    <w:start w:val='1'/>
    <w:numFmt w:val='decimal'/>
    <w:lvlText w:val='%7.'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='2940' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
  <w:lvl w:ilvl='7' w:tplc='04090017' w:tentative='1'>
    <w:start w:val='1'/>
    <w:numFmt w:val='aiueoFullWidth'/>
    <w:lvlText w:val='(%8)'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='3360' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
  <w:lvl w:ilvl='8' w:tplc='04090011' w:tentative='1'>
    <w:start w:val='1'/>
    <w:numFmt w:val='decimalEnclosedCircle'/>
    <w:lvlText w:val='%9'/>
    <w:lvlJc w:val='left'/>
    <w:pPr>
      <w:ind w:left='3780' w:hanging='420'/>
    </w:pPr>
  </w:lvl>
</w:abstractNum>
```

実際のファイルには、レベル0の箇条書きしか存在しないが、Wordはレベル8までのスタイルをあらかじめ指定してしまう。ここまでをまとめると、

* document.xml内において、箇条書きのスタイルはw:numIdで指定されている。
* numbering.xml内において、w:numIdで指定された番号と、実際のスタイルの対応はw:num要素が結びつけている。
* 箇条書きのスタイルはabstractNum要素で指定される。このとき、使われていなくてもレベル0からレベル8までのスタイルが自動的に生成される。

レベル0しか使っていないのに、レベル8まで定義してしまうのはちょっとどうかと思うが、まぁここまではよいと思う。しかし、Wordが「疲れる」のはここからである。

先の箇条書きを増やしてみよう。適当に項目を増やし、箇条書きを指定すると、番号が連番になるが、ポップアップで「番号を振りなおす」が出てくるので、それを使って振りなおしてみよう。こんな感じの画面になる。

![image4.png](/assets/images/word_tired/image4.png)

この状態で、numbering.xmlを見てみるとこうなっている。

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

中身は省略したが、二つのw:abstractNum要素は、w:abstractNumId以外は全く同じものである。つまり、レベル0から8まで定義されたw:abstractNum要素が、丸々コピーされ、別のw:abstractNumIdが振られている。実は、Wordの箇条書きが同じグループに属すかどうかは、numIdではなく、その先のabstractNumIdで決まる。したがって、二つの番号付きリスト「Test」と「Test2」まったく同じスタイルを使っているにもかかわらず、そのスタイルは重複して保存されている。

さて、先程追加した「Test2」の項目を削除してしまおう。画面としてはこうなる。

![image5.png](/assets/images/word_tired/image5.png)

もう予想がつくと思うが、この状態で、numbering.xmlはこうなっている。

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

もうdocument.xmlで、w:numId=2を指すスタイルを持つパラグラフは存在しない。にも関わらず、w:numId=2のw:num要素と、それが指すw:abstractNum要素は削除されない。つまり、ガーベジコレクタが無い。実際に、それなりに長く編集されたWordファイルを見てみると、リストが10個程度しかないにも関わらず、abstractNum要素は100個近く定義されていた。これは増えることはあっても減ることは無い。

## まとめ

Wordファイルは、編集を続けるとドキュメント内部はどんどん断片化が進み、かつ箇条書きリストも、使われていないスタイルの情報が蓄積されていき、結果として「疲れて」いく。ここで示した「疲れ」はごく一部であり、他にも「疲れる」要素があるようだ。そういう意味において、Wordファイルは長く編集するのに全く向いていない。しかし、どうしても「最終生成物がWordファイルでなければならない」ということもあるだろう。その場合でも、可能であればLaTeXやMarkdownその他、軽量なテキストファイルで作成し、最後にpandocなどでdocxファイルに変換する、といった形で運用したいものである。

なお、この文章はイエローハットでタイヤ交換中に書きなぐったものなので、乱文、乱筆はご容赦願いたい。


## 追記(2017年1月12日)

断片化について調べたところ、Mac版でのみ発生することが判明。環境は Word for Mac 15.29.1。

最初に適当な文章を書いてみる。Macで新規作成した。例えばこんな感じ。

![image6.png](/assets/images/word_tired/image6.png)

対応するXMLはこんな感じ。

```xml
<w:p w14:paraId='327CD58E' w14:textId='226AB9B2' w:rsidR='00F167FC' w:rsidRDefault='00645B7A'>
  <w:pPr>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      これがもともとの文章です。
    </w:t>
  </w:r>
</w:p>
```

カーソル位置を次のパラグラフに移動してあり、かつ最初のパラグラフしか表示していないので、w:bookmarkStart/Endは表示されていない。

文章の一部を修正(もともと→元々)し、*カーソル位置を次のパラグラフに移動してから*保存。

![image7.png](/assets/images/word_tired/image7.png)

対応するXMLは・・・

```xml
<w:p w14:paraId='327CD58E' w14:textId='40DE6DDB' w:rsidR='00F167FC' w:rsidRDefault='005F074C'>
  <w:pPr>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      これが元々
    </w:t>
  </w:r>
  <w:r w:rsidR='00645B7A'>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      の文章です。
    </w:t>
  </w:r>
</w:p>
```

ほら、断片化した。

さらに修正(文章→文)してみる。

![image8.png](/assets/images/word_tired/image8.png)

```xml
<w:p w14:paraId='327CD58E' w14:textId='2FCF4912' w:rsidR='00F167FC' w:rsidRDefault='005F074C'>
  <w:pPr>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      これが元々
    </w:t>
  </w:r>
  <w:r w:rsidR='00C35731'>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      の文
    </w:t>
  </w:r>
  <w:r w:rsidR='00645B7A'>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      です。
    </w:t>
  </w:r>
</w:p>
```

三分割。

さらに修正(これが→コレが)してみる。

![image9.png](/assets/images/word_tired/image9.png)

```xml
<w:p w14:paraId='7362ADCA' w14:textId='5A8BA363' w:rsidR='00645B7A' w:rsidRDefault='00B53597'>
  <w:r>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      コレが
    </w:t>
  </w:r>
  <w:r w:rsidR='005F074C'>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      元々
    </w:t>
  </w:r>
  <w:r w:rsidR='00C35731'>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      の文
    </w:t>
  </w:r>
  <w:r w:rsidR='00645B7A'>
    <w:rPr>
      <w:rFonts w:hint='eastAsia'/>
    </w:rPr>
    <w:t>
      です。
    </w:t>
  </w:r>
</w:p>
```

修正するたび、断片増えるね！

同様な修正をWindowsでやってみても断片化しない。というわけで、Word for Macの実装がとってもアレだった、ということでFA?

## 関連記事

この記事に興味を持った人は[Windowsメモ帳の「右端で折り返す」で入る謎の改行コード](http://qiita.com/kaityo256/items/4b97a025a528fea3583d)も読んでみると面白いかも。
