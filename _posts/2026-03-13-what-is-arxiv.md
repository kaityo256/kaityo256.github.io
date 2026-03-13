---
layout: post
title: arXivの話
tags: [academia]
permalink: what-is-arxiv
---

## はじめに

[arXiv](https://arxiv.org/)というサイトがあります。これはプレプリントサーバと呼ばれるもので、文字通りプレプリントを投稿、閲覧できるサービスです。このプレプリントサーバであるarXivについてちょっと説明してみたいと思います。

## プレプリントとは

論文は通常、雑誌に投稿され、査読を経て最終的に出版されます。論文の投稿から出版まで長くかかることもあるため、研究者たちは出版前の未発表論文を、その論文を読んで欲しい研究者に郵送する文化がありました。この未発表論文をプレプリントと呼びます。論文を書いて研究者に郵送するという文化は昔からありましたが、本格化したのは第二次世界大戦後、特に高エネルギー物理の分野においてだと思われます。

[アメリカ物理学会の記事](https://www.aps.org/archives/publications/apsnews/201909/preprints.cfm)によると、1960年代には送付されるプレプリントが膨大になり、研究者たちはそれらを効率的に管理できないか模索しはじめたようです。その試みの一つがSLAC国立加速器研究所(Stanford Linear Accelerator Center, SLAC)によるPreprints in Particles and Fields (PPF)で、研究者は購読料を支払って毎週プレプリントリストを受け取る仕組みでした。

1980年代になり、世界中のネットワークが接続されるようになり、いわゆる「インターネット」が生まれます。当時PrincetonにいたJoanne Cohnは、このインターネット上で電子的にプレプリントを送付する、メーリングリストを始めました。しかし、参加者が増え、論文リクエストに対応することが困難になったため、当時ロスアラモス国立研究所にいたPaul Ginspargが論文の登録を自動化するシステム、`xxx.lanl.gov`を立ち上げました。後のarXiv.orgです。1991年のことでした。

## arXivの歴史。

Paul Ginspargが立ち上げたシステムのアドレス`xxx.lanl.gov`からわかるように、このシステムはロスアラモス国立研究所(Los Alamos National Laboratory, LANL)で運用されていました。このシステムはメールベースのシステムであり、メールアドレスが分野を表していました。最初に立ち上げられたのが`hep-th`、すなわち「High Energy Physics + Theory」でしたが、そのうち「hep-ph (Phenomenology)」や「hep-lat (Lattice)」などが増えていきます。さらに1992年に`astro-ph`(Astro Physics, 宇宙物理)が、1993年に`cond-mat`(Condensed Matter, 物性物理)などが追加されました。物性物理の研究者がarXivのことをたまに`cond-mat`と呼ぶのはその名残です。

2001年にPaul Ginspargがコーネル大学に移籍したのに伴い、このシステムもコーネル大学に移管されます。この時に名前が`xxx.lanl.gov`から`arXiv.org`になりました。システム管理はコーネル大学に移管されましたが、その運営はPaul Ginspargが中心に行っていたようです。しかし、Natureに寄稿された[ArXiv at 20](https://doi.org/10.1038/476145a)という記事によると、「管理に毎日数時間取られることもあり、一年を通して休み無しになることもある(daily administrative activities associated with running it can consume hours of every weekday, year-round without holiday)」という状態になり、とても一人で管理できなくなったため、2011年にコーネル大学の図書館に完全に管理が移管され、Paul Ginspargはアドバイザリーボードとして運営に関わることになりました。以来、arXivはコーネル大学図書館が管理しています。

## arXivの財政

投稿数やDL数が増えるにつれて、arXivの運営費用も増えていきます。2010年にarXivが公開した[arXiv Business Model White Paper](https://info.arxiv.org/about/reports/whitepaper.html)によると、2009年のarXivの運営費は31万ドル(当時のレートで2800万円程度)でした。それに対して収入は38万ドルで、これだけ見れば7万ドルの黒字です。しかし、この経費は直接経費のみであり、大学が間接的に負担している施設費などを含めると4万ドルの赤字であると書いてあります。また、2012年には運営費が50万ドルに達すると予測しており、このままでは運営が継続できないとして、arXivを利用している学術機関に経済支援を要請することになりました。

具体的には、ダウンロード数によってTier 1からTier 3までランク付けし、Tier 1は年間4万ドル、Tier 2は3万2千ドル、Tier 3は2万3千ドルの負担を要請しています。これは、この規模のシステムとしては破格に安価だと思います。この申し出に対して、2010年には多くの大学が[arXiv 2010 supporters](https://info.arxiv.org/about/reports/2010_supporters.html)として費用を負担しました。このInstitutional Supportersの仕組みは、2012年に正式にmembership programとなり、利用料に応じた年会費モデルが採用されます。

さらに、2012年にはSimons Foundationが巨額の年間助成を始めました。これにより、arXivの資金源は

* 学術機関の年会費
* コーネル大学の予算
* Simons Foundation

の三本柱になります。[2024年度の会計報告](https://info.arxiv.org/about/reports/2024_arXiv_annual_report.pdf)では、収入が436万ドル、支出が481万ドルと、2009年の10倍以上の予算規模に膨れ上がっています。特にSimons FoundationやNSF等による支援は大きく、2024年度の総収入436万ドルのうち、200万ドルと、およそ45%を占めています。コーネル大学の負担も、2010年には5万ドルでしたが、2024年には76万ドルと、大きく増えています。

## arXivのモデレーション

arXivには査読システムはありませんが、モデレーションがあります。モデレーションとは簡単なチェック機能であり、投稿分野が適切か、内容が学術的かのチェックをして、適切な分野へ移したり、内容によっては掲載を拒否することになります。当初、モデレーションはGinspargが一人で行っていましたが、分野別のモデレータが導入されました。その後、自動フィルタが採用され、現在は自動フィルタによって適切に処理できなかった論文を人力でモデレートしています。

現在、arXivでは[200名以上のモデレータ](https://arxiv.org/moderators/)が対応しています。arXiv adminチームのブログ[A day in the life of the arXiv admin team](https://blog.arxiv.org/2018/01/19/a-day-in-the-life-of-the-arxiv-admin-team/)によると、毎日500〜600の新規投稿、それに加えて300から400の変更申請(リプレースや取り下げ、論文リファレンス追加など)があります。投稿のうち、概ね15%程度がオートマチックチェックでは対応できず、人間が対応することになります。要するに1000件近い投稿のうち、毎日150件程度は人間が対応する必要があり、モデレータが200名程度しかいないことを考えると、平日は毎日1件はモデレートしなければならない、という状況になっています。毎日1件というと少ないかもしれませんが、自動フィルタをすり抜けた「面倒」な案件が毎日来る、と思うと、僕ならかなり気が重くなります。

なお、モデレータはボランティアで、無報酬です。

## まとめ

プレプリントサーバーであるarXivの歴史と財政状況、モデレーションについて紹介しました。一人のプロジェクトとして始まったarXivは規模が膨れ上がり、現在では世界の研究を支える基盤となっています。当然ですが、非常に大規模なシステムなので、運用には大きなコストがかかっています。継続可能なサービスのためには学術機関の年会費だけで運用できるのが望ましいですが、現在、その予算の大部分は寄付などで支えられています。さらに、200名以上の無償のモデレータがほぼ毎日作業しています。世界的に使われているのに、コーネル大学という一機関の負担が非常に大きいのも気になるところです。

「arXivの裏には人がいて、手間もコストもかかっている」、その気持ちを忘れないようにしたいところです。

## 参考文献

* [ArXiv at 20](https://doi.org/10.1038/476145a)
* [Preprints Make Inroads Outside of Physics](https://www.aps.org/archives/publications/apsnews/201909/preprints.cfm)
* [arXiv Business Model White Paper](https://info.arxiv.org/about/reports/whitepaper.html)
* [A day in the life of the arXiv admin team](https://blog.arxiv.org/2018/01/19/a-day-in-the-life-of-the-arxiv-admin-team/)
