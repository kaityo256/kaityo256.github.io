---
layout: post
title: "ARM SVEの組み込み関数を使う（その１）"
categories: C++, ARM, aarch64, SVE
permalink: sve_intrinsic1
---

# ARM SVEの組み込み関数を使う（その１）

## はじめに

みなさん、山に登っていますか？＞直喩

スパコン「富岳」が採用するA64fxという石はAArch64という64ビットARMの命令セットを採用していますが、さらにHPC向けにScalable Vector Extensions (SVE)という拡張命令セットを持っています。この命令セットは、名前が示す通りスケーラブル、つまりSIMD幅に依存しない形でプログラムが書けるようになっています。これを使って遊んでみましょう、というのが本稿の目的です。「その１」とついていますが、続くかどうかはノストラダムスにもわかりません。


* [その１：プレディケートレジスタ](https://qiita.com/kaityo256/items/71d4d3f6b2b77fd04cbb)←イマココ
* [その２：レジスタへのロード](https://qiita.com/kaityo256/items/ac1e84f1c79fdf478630)
* [その３：gather/scatter](https://qiita.com/kaityo256/items/7ced2749875e2bab89e6)
* [その４：水平演算](https://qiita.com/kaityo256/items/3d9767ed41fa450a4fe8)

リポジトリを以下に置いておきます。まだ開発中なので、記事を書きながら修正していくと思います。

[https://github.com/kaityo256/sve_intrinsic_samples](https://github.com/kaityo256/sve_intrinsic_samples)

## 環境構築

現在のところ、AAarch64+SVEという命令セットを実装した石は富士通のA64fxだけです。これを持っていないひとは、QEMU上で遊ぶと良いでしょう。AAarch64+SVEに対応したGCCが手軽に手に入るArch LinuxのDockerイメージを使うと良いと思います。

```Dockerfile
FROM archlinux
MAINTAINER kaityo256

ENV USER user
ENV HOME /home/${USER}
ENV SHELL /bin/bash

RUN useradd -m ${USER}
RUN echo 'user:userpass' | chpasswd

RUN pacman -Syyu --noconfirm
RUN pacman -S --noconfirm \
  aarch64-linux-gnu-gcc \
  git \
  vim \
  qemu \
  qemu-arch-extra

USER ${USER}
WORKDIR /home/${USER}

RUN echo 'alias vi=vim' >> /home/${USER}/.bashrc
RUN echo 'alias ag++="aarch64-linux-gnu-g++ -static -march=armv8-a+sve -O2"' >> /home/${USER}/.bashrc
```

emacsとか入れたい人は適宜追加してください。これを

```sh
docker build -t kaityo256/aarch64_env .
```

としてビルドし、

```sh
docker run -it kaityo256/aarch64_env
```

とすればAarch64+SVEのプログラムがかけるようになります。

```cpp
#include <iostream>
#include <arm_sve.h>

int main(){
  std::cout << svcntd() << std::endl;
}
```

こんなコードを書いて、以下のようにコンパイル、実行できます。

```sh
$ ag++ test.cpp
$ qemu-aarch64 ./a.out
8
```

コンパイルコマンドは

```sh
aarch64-linux-gnu-g++ -static -march=armv8-a+sve -O2 test.cpp
```

とかですが、面倒なので`ag++`とaliasしています。

`svcntd()`は、物理レジスタに64ビット変数が何個入るかを教えてくれます。8が返ってきたので、8*64で、QEMUとしては512ビットのレジスタを想定している、ということになります。以下、SVEの理念を完全に無視してレジスタが512ビット幅であることを前提に話します。

## プレディケートレジスタ

SVEはSIMD幅を固定しない命令セットであるため、基本的にマスクレジスタを使ったマスク処理を使うことになります。AVX2ではymmレジスタを、AVX-512ではマスクレジスタ(k0-k7)が用意されていましたが、SVEではp0からp15まで「プレディケートレジスタ」と呼ばれるレジスタが16本用意されています。これを使ってごりごりマスク処理しながらSIMD化していくのですが、

* SVEなのでレジスタの中身がイメージしにくい
* 対応する組み込み関数が大量にあってわかりにくい

という問題が(個人的に)あります。そこで、プレディケートレジスタの中身を見ながら動作確認をしてみましょう、というのが本稿の趣旨です。

プレディケートレジスタがハードウェア的にどう実装されているかよくわかりませんが、SVEが、8ビット整数のSIMD命令を備えていることから、最低でも512/8=64ビットの情報を持っていることになります。これを可視化する関数を書いてみましょう。

```cpp
void show_ppr(svbool_t tp) {
  int n = svcntb();
  std::vector<int8_t> a(n);
  std::vector<int8_t> b(n);
  std::fill(a.begin(), a.end(), 1);
  std::fill(b.begin(), b.end(), 0);
  svint8_t va = svld1_s8(tp, a.data());
  svst1_s8(tp, b.data(), va);
  for (int i = 0; i < n; i++) {
    std::cout << (int)b[n - i - 1];
  }
  std::cout << std::endl;
}
```

関数`show_ppr`は、プレディケートレジスタ`svbool_t`を受け取って、その中身を表示します。一応SVEの理念にしたがって、ベクトルの中に何個`int8_t`があるかを`svcntb`で数えています。ここでは`n`として64が返ってきます。そこで長さn=64の`int8_t`のvectorを作って、`a`を1に、`b`を0に初期化しておき、

1. SVEレジスタにaの要素(1)をベクトルに入るだけ(64個)ロード(svld1_s8)
2. レジスタからbへプレディケートレジスタ(tp)を使ってマスク処理しながらストア(svst1_s8)
3. bの中身を表示

という手順により、プレディケートレジスタの中身を可視化しています。このように、SVEの組み込み関数や型は基本的にsvという接頭辞がついています。

まず、組み込み型ですが、sv(型)_tという形です。

* svint8_t (8ビット符号あり整数)
* svuint8_t (8ビット符号なし整数)
* svfloat64_t (64ビット浮動小数点数=double)

といった具合で、欲しい型名を推定するのは難しくないと思います。

組み込み関数ですが、多くの場合「sv+アセンブリ命令_型情報」という形になっています。svst1_s8は、ストア命令の8ビット符号あり整数(shortのs?)という意味です。

これを使ってプレディケートレジスタの中身を見てみましょう。プレディケートレジスタには、多数の初期化関数があります。まずは全部1に初期化するものです。

```cpp
int main(){
  std::cout << "svptrue_b8" << std::endl;
  show_ppr(svptrue_b8());
  std::cout << "svptrue_b16" << std::endl;
  show_ppr(svptrue_b16());
  std::cout << "svptrue_b32" << std::endl;
  show_ppr(svptrue_b32());
  std::cout << "svptrue_b64" << std::endl;
  show_ppr(svptrue_b64());
}
```

svptrue_b8〜b64まであります。これをコンパイル、実行すると、こんな感じになります。

```txt
svptrue_b8
1111111111111111111111111111111111111111111111111111111111111111
svptrue_b16
0101010101010101010101010101010101010101010101010101010101010101
svptrue_b32
0001000100010001000100010001000100010001000100010001000100010001
svptrue_b64
0000000100000001000000010000000100000001000000010000000100000001
```

つまり、svptrue_bkは、「k/8ビットごとに1を立てるよ」という命令です。プレディケートレジスタをsvfloat64_tを使う命令に食わせた場合、この「svptrue_b64()」で立っているビットしか見ません(他のビットは無視されます)。これを間違えると結果がおかしくなるので注意しましょう。

## パターン

さて、プレディケートレジスタの初期化は、パターンを与えることができます。例えば`svptrue_b8()`という組み込み関数は、実は`svptrue_pat_b8(SV_ALL)`という関数と等価であり、

```nasm
ptrue p0.b, ALL
```

というアセンブリになります。これは「p0」というレジスタを、8ビットごとに(b)、全て「ALL」、ビットを立てなさい(ptrue)という命令です。この「ALL」のところにいろんなパターンを食わせることができます。実は

例えば、ALLの代わりにVL1を食わせると、「1つ目だけ」、VL2を食わせると「1つ目と2つ目」のビットが立ちます。組み込み関数では、SV_VL1、SV_VL2となります。VL2の場合を見てみましょう。

```cpp
int main(){
  std::cout << "svptrue_pat_b8(SV_VL2)" << std::endl;
  show_ppr(svptrue_pat_b8(SV_VL2));
  std::cout << "svptrue_pat_b16(SV_VL2)" << std::endl;
  show_ppr(svptrue_pat_b16(SV_VL2));
  std::cout << "svptrue_pat_b32(SV_VL2)" << std::endl;
  show_ppr(svptrue_pat_b32(SV_VL2));
  std::cout << "svptrue_pat_b64(SV_VL2)" << std::endl;
  show_ppr(svptrue_pat_b64(SV_VL2));
}
```

実行結果はこうなります。

```sh
svptrue_pat_b8(SV_VL2)
0000000000000000000000000000000000000000000000000000000000000011
svptrue_pat_b16(SV_VL2)
0000000000000000000000000000000000000000000000000000000000000101
svptrue_pat_b32(SV_VL2)
0000000000000000000000000000000000000000000000000000000000010001
svptrue_pat_b64(SV_VL2)
0000000000000000000000000000000000000000000000000000000100000001
```

svptrue_pat_b8

LSBから2つのビットが、k/8ビット毎にたっているのがわかると思います。

## まとめ

SVEを使うにあたって最初の関門(個人の感想です)である、プレディケートレジスタについてまとめました。僕はマニュアルを読んでもよく理解できず、こうして可視化しないと動作がなかなか理解できません。本稿が似たような人の症状改善につながれば幸いです。

## 参考文献

ほぼ公式マニュアルしかないのつらい。

* [Arm® A64 Instruction Set Architecture: Armv8, for Armv8-A architecture profile](https://developer.arm.com/docs/ddi0596/h/a64-sve-instructions-alphabetic-order)
* [ARM C Language Extensions for SVE](https://developer.arm.com/documentation/100987/0000/)
* [A64FX® Microarchitecture Manual 日本語](https://github.com/fujitsu/A64FX/blob/master/doc/A64FX_Microarchitecture_Manual_jp_1.3.pdf)
* [Arm SIMD intrinsic C++](https://qiita.com/NatsukiLab/items/ad6e9967f7eccadd9c99)

[つづく](https://qiita.com/kaityo256/items/ac1e84f1c79fdf478630)
