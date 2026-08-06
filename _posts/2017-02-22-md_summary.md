---
layout: post
title: "分子動力学法関連の記事まとめ"
tags: [programming, hpc, physics, qiita]
permalink: md_summary
---

# 分子動力学法関連の記事まとめ

#　はじめに

Qiitaに書いてきた分子動力学法(Molecular Dynamics method, MD)関連の記事が溜まってきたのでまとめておく。新しいの書いたら追記していくかもしれない。僕が書いた奴じゃないのも含めている。

## 僕が書いた奴

## 分子動力学法ステップ・バイ・ステップ

分子動力学法をスクラッチから書いてみようというもの。

* [その1](https://kaityo256.github.io/mdstep1)　 $O(N^2)$のルーチンまで
* [その2](https://kaityo256.github.io/mdstep2)　 ペアリストの構築とBookkeeping法
* [その3](https://kaityo256.github.io/mdstep3)　 メッシュ探索
* [その4](https://kaityo256.github.io/mdstep4) 　少しだけ高速化
* [その5](https://kaityo256.github.io/mdstep5) 　温度制御法を三種類実装してみる
* [その6](https://kaityo256.github.io/mdstep6) 　圧力測定ルーチンの実装

## SIMD化関連

* [LJの力計算をフルアセンブラで書いてみる](https://kaityo256.github.io/lj_asm) 　AVX2命令を使ってフルアセンブラでLennard-Jonse系の力計算を書いてみた。
* [LJの力計算を組み込み関数で書いてみる](https://kaityo256.github.io/lj_intrinsic) 　上記を組み込み関数で書き直した。
* [LJの力計算を組み込み関数で書いて馬鹿SIMD化](https://kaityo256.github.io/lj_simd_intrinsic)　 組み込み関数で書いたところを4倍にループアンロールして馬鹿SIMD化してみた。
* [LJの力計算のSIMD化(たぶん完結編)](https://kaityo256.github.io/lj_simd_final) 　ペアリストを使った計算。ちなみにちっとも完結していない。

## LJの力計算のSIMD化ステップ・バイ・ステップ

SIMD化しようと苦闘する過程を晒そうという試み。

* [その0](https://kaityo256.github.io/lj_simd0)　 SIMD化の方針について
* [その1](https://kaityo256.github.io/lj_simd1) 　ペアのループのソフトウェアパイプライニング
* [その2](https://kaityo256.github.io/lj_simd2) 　ソフトウェアパイプライニングの改良
* [その3](https://kaityo256.github.io/lj_simd3) 　ループの4倍展開
* [その3.5](https://kaityo256.github.io/lj_simd3_5) 　展開したループのSIMD化の途中経過。デバッグ方法など
* [その4](https://kaityo256.github.io/lj_simd4) 　実測(遅かった・・・○|￣|＿)
* [その5](https://kaityo256.github.io/lj_simd5) 　i粒子でソートしたものをソフトウェアパイプライニングしたものをSIMD化
* [その6](https://kaityo256.github.io/lj_simd6) 　ベクトルの転置を先にしたら早くなった話


## 数値積分法についての話題

* [Velocity Verlet法とシンプレクティック積分](https://kaityo256.github.io/velocity_verlet) Velocity Verlet法がシンプレクティック積分になることの確認等
* [Lie-Trotter公式の打切り誤差を調べる](https://kaityo256.github.io/lie_trotter_error) シンプレクティック積分の構築に使われるLie-Trotter公式の打切り誤差を確認
* [時間反転対称性とシンプレクティック積分](https://kaityo256.github.io/time_reversal_symplectic) 
* [Lie-Trotter公式における二次の対称分解](https://kaityo256.github.io/lie_trotter_sym2) 分子動力学法で、おそらく最も使われている二次のシンプレクティック積分(二次の対称分解)の精度の確認
* [シンプレクティック変換と運動方程式の関係について](https://kaityo256.github.io/symplectic_transform) 時間発展がシンプレクティックであることと、運動方程式が満たすべき条件の関係について
* [ヤコビの公式とヤコビアンの性質と一般化リュービルの定理](https://kaityo256.github.io/jacobi_formula)

## 解析力学の話

* [解析力学の幾何学的側面](https://kaityo256.github.io/classical_mechanics1) シンプレクティック積分と影のハミルトニアン
* [解析力学の幾何学的側面 II](https://kaityo256.github.io/classical_mechanics42) 解析力学に現れる様々な多様体とリュービル演算子のエルミート性の持つ意味について
* [解析力学の幾何学的側面 III](https://kaityo256.github.io/classical_mechanics3) 運動方程式のベクトル場のdivergenceとヤコビアンの関係、および非ハミルトン系の場合について
* [解析力学の幾何学的側面 IV](https://kaityo256.github.io/classical_mechanics) 微分形式を用いた運動方程式の幾何表現と、拡大空間について
* [解析力学の幾何学的側面 V](https://kaityo256.github.io/classical_mechanics5) 解析力学における温度の幾何学的定義について


## その他の話題

* [調和振動子に作用させた熱浴のエルゴード性](https://kaityo256.github.io/thermostat_ergodicity)　調和振動子系をNose-Hooverで制御すると温度が正しく制御されない理由と回避方法
* [分子動力学法における熱浴の保存量](https://kaityo256.github.io/md_thermostat_conserved) Nose-Hoover法や多変数熱浴における数値積分の保存量について
* [MDループのソフトウェアパイプライニング：ステップ・バイ・ステップ](https://kaityo256.github.io/md_pipeline) 力計算カーネルをソフトウェアパイプライニングすることでIPCの向上をはかる


## @kohnakagawa さんによるMD関連の記事

SIMD化、GPGPU化で早いコードを書く @kohnakagawa さんによるMD関連の記事まとめ。


## GPGPU関連

* [GPUを用いた分子動力学法におけるVerlet list構築](http://qiita.com/kohnakagawa/items/76105c1e49a6fa92f9a0)
* [続 GPUを用いた分子動力学法におけるVerlet list構築 ~チューニング編~](http://qiita.com/kohnakagawa/items/1229b49704becabaa526)

## AVX命令を用いたVerlet list構築のSIMD化
* [その1](http://qiita.com/kohnakagawa/items/9bbf48f835278ab7b345) 　4倍アンロール+SIMD化
* [その2](http://qiita.com/kohnakagawa/items/3ed5ced6a1e1527728d6) 　データのパック
* [その3](http://qiita.com/kohnakagawa/items/4a8f679f548c4324c6da) 　外側をアンロール
* [その4](http://qiita.com/kohnakagawa/items/d105dfadae79e038af2e) 　細かいチューニング

## その他の話題

* [Thrustを用いたhistogram作成](http://qiita.com/kohnakagawa/items/ac2a89cba84aca159049) MDで必要となるヒストグラム作成の高速化
* [分子動力学シミュレーションにおける力計算のSIMD化　最内ループ展開と最外ループ展開のときの性能比較](http://qiita.com/kohnakagawa/items/0e775b5a6dfede34e809)
* [LJ力計算のGPGPU化　作用反作用の法則を使わないやり方がベストなのか？](http://qiita.com/kohnakagawa/items/1ab988e10cd7666bcf72)

## まとめ

パッケージソフト使うのもいいけど、MDをゼロから組むのも高速化するのも楽しいからみんなでやろう！相互作用を限定すればコード量も大したことないし、ホットスポットがはっきりしているから高速化しやすいしね。
