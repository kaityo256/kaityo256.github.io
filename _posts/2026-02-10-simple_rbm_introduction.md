---
layout: post
title: 制限ボルツマンマシンを触ってみる
tags: [machine-learning, programming]
permalink: simple_rbm_introduction
---

## はじめに

制限ボルツマンマシン(Restricted Boltzmann Machine, RBM)という機械学習モデルを簡単に扱えるPythonライブラリを開発、公開しました。

[github.com/watanabe-appi/simple_rbm](https://github.com/watanabe-appi/simple_rbm)

ローカルでも、Google Colabでも簡単に使えます。また、CuPyが使える環境なら、GPGPUによる加速もできます。以下ではこのライブラリの使い方を紹介します。

## 制限ボルツマンマシンとは

もともと、HintonとSejnowskiらによってボルツマンマシン(Boltzmann Machine)という連想記憶ネットワークが提案されました。このモデルはネットワーク上にスピンが配置されたような物理系に対応しており、定義されたエネルギーとボルツマン重みに従って状態を出現させます。うまくネットワークの重みを学習させることで、様々なデータを覚えさせることができます。しかし、ボルツマンマシンは理論的には興味深いものの、学習コストが高く、実用的ではありませんでした。そこで提案されたのが制限ボルツマンマシン(Restricted Boltzmann Machine, RBM)です。このモデルはユニットを「可視層」と「隠れ層」と呼ばれる2つのグループに分け、同じグループに属すユニット間には相互作用を結ばないことで、効率的に学習できるようになりました。

RBMは性能面では同規模のディープニューラルネットワークに及ばないことが多いものの、理論的には興味深く、物理的な背景を持つために研究対象として選ばれることが多いです。

![RBM](/assets/images/simple_rbm_introduction/rbm.png)