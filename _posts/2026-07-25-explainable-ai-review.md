---
layout: post
title: 説明可能AI(XAI)の現状と展望
tags: [machine-learning]
permalink: explainable-ai-review
---

## はじめに

研究室ミーティングで以下のような話をしました。

[What is XAI? @ Speakerdeck](https://speakerdeck.com/kaityo256/what-is-xai)

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

XAIという言葉が初めて使われた例を詳しく知りませんが、おそらく最初期の論文は2004年のM. Van Lentらの論文であろうと思われます。[^fsc]

[^fsc]: M. Van Lent, W. Fisher, and M. Mancuso, “An Explainable Artificial Intelligence System for Small-Unit Tactical Behavior,” in Proceedings of the National Conference on Artificial Intelligence (AAAI), 900–907 (2004).


これはFSC(Full Spectrum Command)という軍事訓練のゲームを題材に、AIにより行動するユニットの振る舞いを説明しようとする研究で、その過程でXAIという言葉を提案しています。

![fsc.png](/assets/images/explainable-ai-review/fsc.png)

しかし、XAIという言葉そのものの出現は比較的新しいものの、その概念はAI研究が始まった当初からありました。最初期のAIモデルとしてエキスパートシステムというものがあります。エキスパートシステムは1970年代に開発されたもので、商用化に成功した最初期のAIと言えると思います。エキスパートシステムは、基本的には巨大な「if-then-else」の集合体であり、その振る舞いは人間の専門家の意思決定を真似るものでした。巨大な知識データベースを用いて、質問に対してなんらかの答えを返しますが、「なぜその回答に至ったか」を人間にわかるように説明させよう、という試みがなされました。

ただし、この時代のXAI研究は「ブラックボックスであるAIの中身を解析しよう」というよりは「最初から人間が理解可能な形でモデルを作ろう」という方向の研究が多かったように見えます。

W. R. Swartout and J. D. Moore, “Explanation in expert systems: A survey,” Univ. Southern California, Los Angeles, CA, USA, Tech. Rep. ISI/RR-88-228, (1988).

## AIの発展とリスク

2010年代になってから、急速にAIが発達するようになります。AIにできることが増える一方、AIが起こす「不思議なミス」も目立つようになります。その一つが「ハルシネーション」です。ハルシネーションという言葉は以前より論文で見かけましたが、一般に広く知られるようになったのはJanelle Shaneによるブログがきっかけであったと思われます。[^janelle]

[^janelle]: [https://nautil.us/this-neural-net-hallucinates-sheep-237006](https://nautil.us/this-neural-net-hallucinates-sheep-237006)


このブログにおいてJaelleは、Microsoft Azureの画像認識アプリケーションが、「ただの草原」に、そこに写っていない「羊」を「幻視(hallucinate)」することを報告しました。以後、AIが真実に基づかない間違い、例えば存在しない参考文献や書籍を捏造することが「ハルシネーション」と呼ばれるようになりました。

![hullcination](/assets/images/explainable-ai-review/hallucination.jpg)

ブログで挙げられている例です。明らかに羊は写っていないにもかかわらず、キャプショニングAIはそこに羊を見出しています。

「AIが人間と異なる理解をしている」ことを明らかにする例として、敵対的サンプル(Adversarial Example)という攻撃があります。[^panda]

[^panda]: I. J. Goodfellow, et al. “Explaining and Harnessing Adversarial Examples,” in International Conference on Learning Representations (ICLR), (2015).

![panda](/assets/images/explainable-ai-review/panda.png)

有名な例は、パンダの画像に、人間には認識できないような微小なノイズを追加し、AIにテナガザル(Gibbon)と認識させるものです。もともと57.7%の自信度で「パンダ」と認識していたAIが、うまく調整されたノイズを追加された画像について99.3%の自信度で「テナガザル」と認識しています。このように「人間にはパンダにしか見えない画像を、AIには別の画像に見せる」ような攻撃が可能です。

このような性質は、AIの社会実装においても大きな問題になります。Eykholtらは、交通標識に黒や白のステッカーをうまくつけることで、AIの認識を誤らせる例を紹介しています。

![stop](/assets/images/explainable-ai-review/stop.png)

上記は、「止まれ」のサインの画像に黒や白の長方形を加えることで、「速度制限45マイル」にご認識させる例です。

これは、単に「うまく調整された画像を用意することで、AIと人間で異なる解釈をさせることができる」というデモンストレーションのみならず、「人間とAIは本質的に認識方法が違う」ということを示しています。つまり、「人間にはこう見えているから、AIもそう解釈してくれるだろう」という期待が危険だということです。このような例からも「AIはなぜそのような解釈をしているか」を明らかにする必要性があることがわかります。

## AIの説明可能性の追求

ハルシネーションという言葉が画像のキャプショニングの誤りから広まったせいか、画像認識の分野において「説明可能性」の研究が進んでいました。

有名な例は「狼ーハスキー問題」です。シベリアン・ハスキーは、顔が狼に似ている犬種です。Ribeiroらは、うまく調整したデータを用いることで、「狼」と「ハスキー」を見分けることができるように訓練された分類器が、実は「狼」や「ハスキー」の顔ではなく、背景に雪があるかどうかで判別していることを明らかにしました。[^wolf]

[^wolf]: M. T. Ribeiro, S. Singh, and C. Guestrin, “Why Should I Trust You?: Explaining the Predictions of Any Classifier,” in KDD, 1135–1144 (2016).

![wolf](/assets/images/explainable-ai-review/wolf.png)


写真のキャプショニングにたいして「どの部分に注目してその判定をしたか」を可視化する手法として、Grad-CAMという手法が提案されています。[^gradcam]

![gradcam](/assets/images/explainable-ai-review/gradcam.png)

上記の例では「Cat」の判断に、正しく猫の位置を、「Dog」の判断に犬の位置を参照していることがわかります。

[^gradcam]: R. R. Selvaraju et al., “Grad-CAM: Visual Explanations from Deep Networks via Gradient-Based Localization,” in ICCV, 618–626 (2017).

## DARPA XAI PROJECT

XAI研究の必要性が高まるなか、DARPA(Defence Advanced Research Projects Agency, 米国国防高等研究計画局)は、大規模なXAIのプロジェクトを立ち上げました。[^darpa]

[^darpa]: [https://www.darpa.mil/research/programs/explainable-artificial-intelligence](https://www.darpa.mil/research/programs/explainable-artificial-intelligence)

![darpa](/assets/images/explainable-ai-review/darpa.png)

これは2017年から2021年までの5年のプロジェクトです。報道によれば、予算は(確認できるかぎりで)7500万ドルとのことですが、DARPAの予算説明書(Budget Justification Book)を見ると、9000万ドル近い予算が組まれていたようです。[^budget]

[^budget]: [https://datainnovation.org/2018/10/fighting-military-ai-research-undermines-social-and-economic-progress/](https://datainnovation.org/2018/10/fighting-military-ai-research-undermines-social-and-economic-progress/)

このプロジェクトでDARPAは、説明可能なモデル(explainable model)と説明インタフェース(explaination interface)の実装を目標に掲げています。

そんな中、Adadi and BerradaはXAIのレビュー論文を公開しました。[^adadi]

[^adadi]: A. Adadi and M. Berrada, "Peeking Inside the Black-Box: A Survey on Explainable Artificial Intelligence (XAI)," in IEEE Access, 6, 52138-52160, (2018).

論文の公開は2018年であり、ちょうどDARPAのXAIプロジェクトが走っている最中です。Google Scholarによれば、本論文は2026年7月時点で9969回と、一万回近い引用数があり、XAIの標準的なレビュー論文となっています。

Adadiらは、XAI研究の論文381報を調べ、XAI研究を扱う論文が指数関数的に増加していることを指摘しています。

![papers](/assets/images/explainable-ai-review/papers.png)

また、AdadiらはXAIの必要性について、以下の4点にまとめました。

* 正当化のための説明(Explain to Justify)
  * モデルはなぜそのような判断をしたのか、特に、モデルの判断にバイアスや偏見が含まれていないかをどのように保証するか。
* 制御のための説明(Explain to Control)
  * モデルに説明可能性を実装することで、これまで知られていなかった脆弱性を明らかにし、修正する。
* 改善のための説明(Explain to Improve)
  * 人間が「説明」を通してモデルの振る舞いを詳しく知ることで、モデルの精度や効率を上げることができる。
* 発見のための説明(Explain to Discover)
  * モデルに判断を「説明」させることで、これまで知られていなかった内容を発見できる。例えば囲碁の手を説明させることで、新しい定石を発見するなど。

## XAIへの批判

XAIについては、批判も多くあります。特に「定義が曖昧である」という批判が多いですが、AdadiらはGoogleのP. Norvigの以下の発言を引用しています。[^norvig]

[^norvig]: P. Norvig, “Google’ s Approach to Artificial Intelligence and Machine Learning,” UNSW Sydney, June 22, (2017).

> そもそも人間が判断をうまく説明できないではないか。AIの信頼性は、その出力の信頼性をずっと観察することによって保証されるべきであろう。

また、GradCAMのような、一見もっともらしい「説明」についても、さらにそれを「騙す」ことができることが報告されています。Ghorbaniらは、画像の分類について、結論を変えずにその特徴マップを変更できることを示しました。[^llama]

[^llama]: A. Ghorbani et al., “Interpretation of Neural Networks Is Fragile,” AAAI (2019).

![llama](/assets/images/explainable-ai-review/llama.png)

上記の例では、AIは「ラマ」を検出していますが、上段では正しくラマの顔を見てラマと判断しているように見えますが、下段ではラマと認識させつつ、全く別の場所に注目させ、その上で自信度も71.1%から94.8%に上げることができています。つまり、「説明可能性」すら「騙す」ことができることが示されました。

## 物理とXAI

一方、物理学、特に統計力学からAIの内部を理解しよう、という試みが増えています。

![ising](/assets/images/explainable-ai-review/ising.png)

例えば上記では、イジングモデルやポッツモデルといったスピン系の「スピン状態」から「温度」を推定させる回帰器を作成したところ、ニューラルネットワークの中間層に秩序変数がエンコードされていることを明らかにした図です。[^kashiwa]

[^kashiwa]: K. Kashiwa, Y. Kikuchi, and A. Tomiya,  Prog. Theor. Exp. Phys, 2019, 083A04 (2019)

これは、ニューラルネットワークが、秩序変数を自発的に「発見」したことを意味します。また、その事実が「内部重みの解析によりわかった」ことも重要です。内部重みを調べることで、AIは嘘をつきようがないからです。

また、Deep Boltzmann Machineにおいて、学習によって内部重み同士に相関がうまれ、常磁性相、強磁性相、そしてスピングラス相に対応する「相」が現れることが報告されています。[^ichikawa]

[^ichikawa]: Y. Ichikawa and K. Hukushima, J. Phys. Soc. Jpn., 91, 114001 (2022).

![dbm](/assets/images/explainable-ai-review/dbm.png)

Deep Neural Networkにおいても、学習によって「入力相」と「出力相」の両端から「凍って」いき、中間は液相になっているように見えることが報告されています。[^yoshino]

[^yoshino]: H. Yoshino, SciPost Phys. Core, 2, 005 (2020).

![yoshino](/assets/images/explainable-ai-review/yoshino.png)

これらの研究では、スピン系と相転移という統計力学の観点から機械学習モデルを理解しようとしています。また、「性能の良いモデルを作成する」というよりは、「主に数値計算により生成した、素性がよくわかったデータを訓練データとすることで、モデルが何を学び、内部状態がどうなったかを調べる、という共通点もあります。このような研究では、もともとスピングラスを専門とする研究者の参入が目立つような気がします。

## AIと社会実装と規制

AIの社会実装に向けて、その危険性から規制が始まっています。動きが早かったのはEUです。EUは「EU AI Act」と呼ばれるAIの規制を始めています。[^euaiact]

[^euaiact]: [https://artificialintelligenceact.eu/](https://artificialintelligenceact.eu/)

EU AI Actでは、AIによるリスクを以下の四段階に分類しています。

* 許容できないリスク (Unacceptable Risk)
  * 例えばSocial Scoringと呼ばれるような、これまでの行動からその人の信頼性などをランクづけするようなAIや、サブリミナル効果等を利用して人の思考を操作するようなAIは、「許容できないリスク」とされています。
* 高いリスク (High Risk)
  * AIを、雇用、教育、重要な施設、法律、医療などに応用する場合、注意が必要であると指摘しています。
* 限定的なリスク (Limited Risk)
  * 例えばチャットボットや、AIで生成された動画や画像などは、ユーザは「AIと話している」「AIによって生成された」と知らされるべきである、と指摘しています。
* 最小限のリスク (Minimal Risk)
  * 例えばゲームの思考ルーチンや、スパムフィルターのような機械学習モデルについては、規制の対象外です。

EUは段階的に規制を始めています。このうち、「許容できないリスク」に分類されたAIは、2025年2月2日から禁止されました。「高いリスク」「限定的なリスク」についても、もうすぐ(2026年8月2日)規制が開始されます。「最小限のリスク」については規制対象外です。

今は本格的な規制はEUが先行していますが、おそらくアメリカや日本などでもなんらかの法整備がなされるものと思います。

アメリカでは、NIST(National Institute of Standards and Technology, 米国国立標準技術研究所)がXAIについてのレポートを公開しました(NISTIR 8312)。[^nist]

[^nist]: P. J. Phillips et al., Four Principles of Explainable Artificial Intelligence, NISTIR 8312 (2021). [https://doi.org/10.6028/NIST.IR.8312](https://doi.org/10.6028/NIST.IR.8312)

この中でNISTは、XAIについて以下の四原則を定めています。

* 説明（Explanation）:
  * システムは、その出力や処理過程について、根拠または理由を提示する、あるいはそれらを付随情報として含む。
* 意味の理解可能性（Meaningful）:
  * システムは、想定される利用者が理解できる説明を提供する。
* 説明の正確性（Explanation Accuracy）:
  * 説明は、出力が生成された理由を正しく反映し、またはシステムの処理過程を正確に表している。
* 知識の限界（Knowledge Limits）:
  * システムは、設計された条件の範囲内で、かつ出力に十分な確信を持てる場合にのみ動作する。

「知識の限界」は重要です。AIはしばしば「知らないこと」や「できないこと」についても回答したり動作しようとしたりします。知らないことは「知らない」、できないことは「できない」とちゃんと答えられるシステムを作りましょう、それがXAIとして重要だ、という指摘です。

## まとめ

XAIについて、僕が知る背景や展望を簡単にサーベイしました。XAIの概念は古くからあり、その言葉も2004年まで遡りますが、XAIという言葉が広く知られるようになったのは、DARPAのXAI Projectがきっかけだろうと思います。XAIについては言葉の定義もそうですが、「どうしたらXAIが達成できたといえるのか」という「ゴール」も曖昧であるところが研究の難しさとなっています。

一方、近年ではAIの振る舞いや内部構造を物理、特に統計力学の知識を使って解析しようという研究が盛んに行われています。これらの研究ではXAIという言葉は使われていませんが、広い意味ではXAIと位置づけられるのではないかと思います。特に、制限ボルツマンマシン(Restricted Boltzmann Machine)に代表されるようなエネルギーベースモデル(energy-based model, EBM)は、モデルとしての性能は他のState-of-the-artのモデルに及びませんが、統計力学との相性がよいため、その解析でいろんなことがわかるのではないかと期待して研究を進めています。

XAIの概念は古いですが、その研究は比較的新しく、今はその知見を一つ一つ積み重ねている段階だと思います。それが単に知識の集合体で終わるのか、それともAI研究の重要な分野として整理されるのかはまだわかりません。しかし、日々AIを使っているからこそ、AIをブラックボックスにせず、内部をしっかり理解する必要性を感じます。私はその一環としてXAIの研究を続けています。早くその成果を公開できるように頑張ります。

## 参考文献


