---
layout: post
title: "__int128にvpternlogdしたい"
tags: [programming, devtools, qiita]
permalink: vpternlog_int128
---

# __int128にvpternlogdしたい

## はじめに

AVX512Fには`vpternlogd`という、任意の三項論理演算を実現する命令がある。ちょうど手元にこれを使ったら高速化できそうなプログラムがあったのだが、そこで扱ってるデータ型が`__int128`、つまりGCC拡張の128ビット整数だった。これに`vpternlogd`を使おうとしたらなかなか素直にいかなかったので覚書。

## やりたいこと (スカラ版)

3つのビットフィールドがあった時、同じ桁に一つだけビットがたっていたら1、それ以外は0、という演算がしたい。つまり、テーブルにするとこんな感じ。

| src1 | src2 | src3 | result |
|:-:|:-:|:-:|:-:|
| 0  | 0  | 0  | 0  |
| 0  | 0  | 1  | 1  |
| 0  | 1  | 0  | 1  |
| 0  | 1  | 1  | 0  |
| 1  | 0  | 0  | 1  |
| 1  | 0  | 1  | 0  |
| 1  | 1  | 0  | 0  |
| 1  | 1  | 1  | 0  |


これをビット演算で実現すると、たとえばこんな感じになるだろう。

```cpp
  result = (src1 & src2 & src3) ^ (src1 ^ src2 ^ src3);
```

128ビット整数にランダムなビット列を与えて、上記のビット演算を実装するとこんな感じになるだろう。

```cpp
  __attribute__((aligned(64))) __int128 t1 = rand_bit();
  __attribute__((aligned(64))) __int128 t2 = rand_bit();
  __attribute__((aligned(64))) __int128 t3 = rand_bit();
  std::cout << "Input" << std::endl;
  std::cout << i2b(t1) << std::endl;
  std::cout << i2b(t2) << std::endl;
  std::cout << i2b(t3) << std::endl;
  std::cout << "Output" << std::endl;
  // Scalar
  __int128 t4 = (t1 & t2 & t3) ^ (t1 ^ t2 ^ t3);
  std::cout << i2b(t4) << std::endl;
```

ここで`rand_bit`は適当に作ったランダムなビット列を生成する関数で、`i2b`は整数をビット列の文字列に変換する関数。実行結果はこんな感じ。

```shell-session
Input
10011010010110111010001011001000100100000100011111000111000101011010110000101111110011111010010011100100110011101000000010001110
01110101001000000011010111000101100001111100011100110110011001111000110001100101011011001001111101111001101001100011110111010110
10001111111001000001000100100001110110010110011110001010111100001101011001000001010000110110101010000001011100111001100101110000
Output
01100000100111111000011000101100010011101010000001111001100000100111001000001010101000000101000100011100000110010010010000101000
```

確かに、３つの入力うち1つだけビットが立っている桁のみ、結果のビットが立っている。

## `vpternlogd`版

さて、`vpternlogd`は、この`result`の8ビットフィールドを即値で与えることで、任意の三項論理演算を一度に行うことができる。上記のテーブルの例なら、与えるべき即値は2+4+16 = 22となる。

## `_mm_ternarylogic_epi32`

まず、`__int128`は、32ビット整数4個分のデータを持っているのだが、ざっと探した感じ、それがメモリ上で連続しているという保証を見つけることができなかった。でもまぁ連続で取られているだろうと思って、

```cpp
__int128 t1 = rand_bit();
__m128i x1 = _mm_load_si128((__m128i*)(&t1));
```

みたいなコードを書いた。これで128ビットのデータがxmmレジスタに乗ったことにしよう。

さて、`vpternlogd`がxmmレジスタを引数に取ってくれればそのまま呼ぶだけ。これに対応する組み込み関数は`_mm_ternarylogic_epi32`なので、これが動けば

```cpp
  __m128i x1 = _mm_load_si128((__m128i*)(&t1));
  __m128i x2 = _mm_load_si128((__m128i*)(&t2));
  __m128i x3 = _mm_load_si128((__m128i*)(&t3));
  __m128i x4 = _mm_ternarylogic_epi32(x1,x2,x3,22);
```

みたいに呼ぶだけで良い。しかし、上記を実行するとSIGILLで落ちてしまう。調べてみると、`vpternlogd`がxmmやymmレジスタを呼ぶにはAVX512VL拡張が必要。手元にあったKNLにあるフラグはAVX512F, PF, ER, CDで、VLには対応していなかった。というわけでそこをなんとかしないといけない。

## インラインアセンブラ版

どうせxmmとzmmは同じデータを共有しているんだから、xmmをzmmにして、そのまま`vpternlogd`を呼んでしまえば良い。インラインアセンブラで書くとこんな感じ。

```cpp
__attribute__((noinline))
__m128i ternlog(__m128i x1, __m128i x2, __m128i x3){
__asm__ (
 "vpternlogd $22,%zmm2,%zmm1,%zmm0\n\t"
);
}
```

呼び出し規約として、引数の`__m128i`は`xmm0`, `xmm1`に順番に入っているはずで、返り値が`__m128i`の時は単に`xmm0`に値を突っ込めばよかったはず。どうせ上位ビットはどうなっていようが関係ないので、それをそのままzmmレジスタにしてしまっている。

なお、インライン展開されると結果がおかしくなるので、インライン展開を抑制している。この関数を使うとこんな感じになる。

```cpp
  __m128i x4 = ternlog(x1,x2,x3);
  std::cout << i2b(x4) << std::endl;
```

結果も正しく計算できている。

## `_mm512_ternarylogic_epi32`

インラインアセンブラ版は毎回callが入ってしまうので遅い。もしかしたらインラインアセンブラ込みで正しくインライン展開させる方法があるのかもしれないが、少なくとも僕は知らない。というわけで組み込み関数を使ってみる。最初はinsert系命令でxmmをymmに、ymmをzmmにinsertしていくのかと思ったけど、対応する命令`vinserti32x4`とか`vinserti32x8`がそれぞれAVX512VL, AVX512DQ拡張なので使えない。そんなわけで`__int128`を64バイトアラインにして、無理やりzmmにロード、結果も無理やりzmmから`__int128`にストアしてみる。こんな感じ？

```cpp
  __attribute__((aligned(64))) __int128 t1 = rand_bit();
  __attribute__((aligned(64))) __int128 t2 = rand_bit();
  __attribute__((aligned(64))) __int128 t3 = rand_bit();
  __m512i z1 = _mm512_load_si512((__m512i*)(&t1));
  __m512i z2 = _mm512_load_si512((__m512i*)(&t2));
  __m512i z3 = _mm512_load_si512((__m512i*)(&t3));
  __m512i z4 = _mm512_ternarylogic_epi32(z1,z2,z3,22);
  __attribute__((aligned(64))) __int128 t5[4];
  _mm512_store_si512((__m512i*)(t5),z4);
  std::cout << i2b(t5[0]) << std::endl;
```

一応`__int128 t5[4]`として64バイト分の領域を確保して、そこに値を突っ込んでいるが、これで良いのがあまり自信が無い。とりあえず結果は正しそう。

## 組み込み関数をインライン展開＋最適化させる

一度`__int128`をzmmにロードして、`vpternlogd`をかける方法でうまくいきそうだったので、それを関数にしてコンパイラによる最適化に期待してみる。

```cpp
__int128
ternlog512(__int128 &t1, __int128 &t2, __int128 &t3){
  __m512i z1 = _mm512_load_si512((__m512i*)(&t1));
  __m512i z2 = _mm512_load_si512((__m512i*)(&t2));
  __m512i z3 = _mm512_load_si512((__m512i*)(&t3));
  __m512i z4 = _mm512_ternarylogic_epi32(z1,z2,z3,22);
  __attribute__((aligned(64))) __int128 t[4];
  _mm512_store_si512((__m512i*)(t),z4);
  return t[0];
}
```

入力される`__int128`は64バイトアラインされていることが前提。これはこう呼べる。

```cpp
  __attribute__((aligned(64))) __int128 t1 = rand_bit();
  __attribute__((aligned(64))) __int128 t2 = rand_bit();
  __attribute__((aligned(64))) __int128 t3 = rand_bit();
  std::cout << i2b(ternlog512(t1,t2,t3)) << std::endl;
```

希望としては、`ternlog512`がインライン展開され、不要なロードストアが最適化されてほしい。上記のアセンブリはこうなる。

```nasm
        vmovups   64(%rsp), %zmm1
        vmovups   128(%rsp), %zmm0
        movq      %r11, 192(%rsp)
        movq      %r8, 200(%rsp)
        vpternlogd $22, 192(%rsp), %zmm0, %zmm1
```

あ、なんかできてるっぽい。`rand_bit`の結果が`64(%rsp)`、`128(%rsp)`、`192(%rsp)`にはいっていて、それをそのままzmmに`vmovups`して、`vpternlogd`が呼ばれている。

#まとめ

GCC拡張の128ビット整数型`__int128`に対して、AVX-512の三項論理演算命令`vpternlogd`をかけてみた。`vpternlogd`にxmmを渡せなかったり、組み込み関数でxmmからzmmに簡単に変換できなかったりといろいろあったが、最終的には理想的なアセンブリが吐かれるコードを作ることができた。

しかし、AVX-512は便利そうな命令多いんだけど、いろいろ拡張があって、いざ使おうとすると「対応してません (Illegal instruction)」ってすげなく言われるのつらい。

上記のソースコードは以下においてある。

https://gist.github.com/kaityo256/51e6dde4a94fdb411591193f6f6bbc31

## 参考にしたサイト

* [vpternlogd by tanakmura
さん](http://qiita.com/tanakmura/items/5dce53ae3d68a89fa981)
* [Intel Architecture Instruction Set Extensions Programming Reference (PDF)](
https://software.intel.com/sites/default/files/managed/07/b7/319433-023.pdf)
