---
layout: post
title: 説明可能AI(XAI)の現状と展望
tags: [machine-learning]
permalink: explainable-ai-review
---

## はじめに

研究室ミーティングで以下のような話をしました。

[What is XAI?](https://speakerdeck.com/kaityo256/what-is-xai)

最近、うちの研究室では説明可能AI(eXplainable Artificial Intelligence, XAI)の研究を進めています。ただ、XAIの概念は定義が曖昧であり、また研究の「ゴール」も明確ではありません。以下では、XAI研究の現状と展望を簡単にサーベイします。

## XAIとは？

XAIとは、eXplainable Artificial Intelligenceの略で、説明可能AIと訳されます。これは、ブラックボックスになりがちな機械学習モデルの振る舞いを、人間に理解できるようにしよう、というものです。XAIは、主に以下の3つの疑問に応えようとします。

* 説明可能性(Explainability): なぜそのモデルはそのような判断をしたのか？
* 信頼性(Trustworthiness): そのモデルの決定を信頼できるか？
* 確実性(Reliability): そのモデルはどのような時に失敗するか？

TrustworthinessとReliabilityは、どちらも日本語では「信頼性」と訳されることが多いですが、Trustworthinessはモデルの出力がどれくらい信頼できるか(確実な知識に基づいた出力なのか、それともモデルの推定を含むのか)を表す指標なのに対して、Reliabilityは、モデルがどのような時に間違えるかを調べる指標です。

## なぜXAIが必要か？

近年、AIの発展が著しく、AIは様々なことができるようになってきました。一方、モデルが複雑化し、その中身はブラックボックスになりがちです。

例えば自動運転車が急ブレーキを踏んで事故が発生したとします。運転AIに「なぜブレーキを踏んだのか？」と聞いても、例えば「急にネコが飛び出してきて横切ったから」などと、「人間にとって納得感の高い答え」を生成してしまうかもしれません。今でもAIは、正しさよりも「ユーザの納得感」を重視する傾向にあるため、AIに理由を聞いても「本当の事故原因」につながる答えを返さない可能性があります。

このような「AIの判断」を、その根拠や過程を明らかにし、人間が理解できるようにする手法を開発しようとする試みがXAIです。

## XAIの起源

XAIという言葉が初めて使われた例を詳しく知りませんが、おそらく最初期の論文は2004年の以下の論文であろうと思われます。

M. Van Lent, W. Fisher, and M. Mancuso, “An Explainable Artificial Intelligence System for Small-Unit Tactical Behavior,” in Proceedings of the National Conference on Artificial Intelligence (AAAI), 900–907 (2004).

これはFSC(Full Spectrum Command)という軍事訓練のゲームを題材に、AIにより行動するユニットの振る舞いを説明しようとする研究で、その過程でXAIという言葉を提案しています。

![fsc.png](/assets/images/explainable-ai-review/fsc.png)

しかし、XAIという言葉そのものの出現は比較的新しいものの、その概念はAI研究が始まった当初からありました。最初期のAIモデルとしてエキスパートシステムというものがあります。エキスパートシステムは1970年代に開発されたもので、商用化に成功した最初期のAIと言えると思います。エキスパートシステムは、基本的には巨大な「if-then-else」の集合体であり、その振る舞いは人間の専門家の意思決定を真似るものでした。巨大な知識データベースを用いて、質問に対してなんらかの答えを返しますが、「なぜその回答に至ったか」を人間にわかるように説明させよう、という試みがなされました。

ただし、この時代のXAI研究は「ブラックボックスであるAIの中身を解析しよう」というよりは「最初から人間が理解可能な形でモデルを作ろう」という方向の研究が多かったように見えます。

W. R. Swartout and J. D. Moore, “Explanation in expert systems: A survey,” Univ. Southern California, Los Angeles, CA, USA, Tech. Rep. ISI/RR-88-228, (1988).

## AIの発展とリスク

2010年代になってから、急速にAIが発達するようになります。AIにできることが増える一方、AIが起こす「不思議なミス」も目立つようになります。その一つが「ハルシネーション」です。ハルシネーションという言葉は以前より論文で見かけましたが、一般に広く知られるようになったのはJanelle Shaneによるブログがきっかけであったと思われます。

https://nautil.us/this-neural-net-hallucinates-sheep-237006

このブログにおいてJaelleは、Microsoft Azureの画像認識アプリケーションが、「ただの草原」に、そこに写っていない「羊」を「幻視(hallucinate)」することを報告しました。以後、AIが真実に基づかない間違い、例えば存在しない参考文献や書籍を捏造することが「ハルシネーション」と呼ばれるようになりました。

![hullcination](/assets/images/explainable-ai-review/hallucination.jpg)