---
layout: post
title: "std::fill_nをmemcpyで書いてみた"
tags: [programming, qiita]
permalink: filln_memcpy
---

# std::fill_nをmemcpyで書いてみた

## はじめに

インテルコンパイラでコンパイルすると、たまに_intel_fast_memcpyって関数が呼ばれている。これが何やってるかわからないが、もし速くメモリコピーできる手段があるならそれを使えばfillも速くなるんじゃないかと思ってやってみた。

## コード

コードはこんな感じ。fillforが普通にfor文回してfill。myfillはmemcpyを使って倍々ゲームでデータをコピーしていく。

```cpp
#include <stdio.h>
#include <string.h>
#include <algorithm>
#include <sys/time.h>
#include <stdint.h>

const int S = 28;
const int N = (1<<S)-1;
int a[N];

double mytime(void){
  timeval tv;
  gettimeofday(&tv,NULL);
  return tv.tv_sec + (double)tv.tv_usec*1e-6;
}

void
myfill(int *a, const int N, const int value){
  a[0] = value;
  for(int i=0;i<S;i++){
    const int s = 1 << i;
    memcpy((void*)(&a[s]),(void*)(&a[0]),s*sizeof(int));
  }
}

void
fillfor(int *a, const int N, const int value){
  for(int i=0;i<N;i++){
    a[i] = value;
  }
}

#define measure(func,name) {\
  double s1 = mytime();\
  func(a,N,12345);\
  double s2 = mytime();\
  printf("%s %f\n",name,s2-s1);};

int
main(void){
  printf("N=%d\n",N);
  std::fill_n(a,N,0); //最初に触っておく
  measure(std::fill_n,"fill_n  ");
  measure(fillfor    ,"fillfore");
  measure(myfill     ,"myfill  ");
  for(int i=0;i<N;i++){ //一応チェック
    if(a[i] != 12345){
      printf("Error\n");
    }
  }
}

```

環境はIntel(R) Core(TM) i7-2700K CPU @ 3.50GHz、キャッシュ  8192 KB。コンパイラのバージョンはそれぞれ以下の通り。

```shell-session
$ icpc --version
icpc (ICC) 12.1.4 20120410
Copyright (C) 1985-2012 Intel Corporation.  All rights reserved.

$ g++ --version
g++ (GCC) 4.4.7 20120313 (Red Hat 4.4.7-11)
```
若干古いが気にしない。

## 実行結果

```shell-session
$ g++ -O0 fill.cc;./a.out 
N=268435455
fill_n   0.479488
fillfore 0.617751
myfill   0.125472

$ g++ -O3 fill.cc;./a.out 
N=268435455
fill_n   0.115933
fillfore 0.115964
myfill   0.130052

$ icpc -O0 fill.cc;./a.out 
N=268435455
fill_n   0.490290
fillfore 0.596837
myfill   0.126500

$ icpc -O3 fill.cc;./a.out 
N=268435455
fill_n   0.055505
fillfore 0.055506
myfill   0.141159
```

というわけで、最適化無しだとmemcpyで倍々ゲームが速かったが、最適化したらfill_nとfor文は同じで、memcpy呼ぶ奴は遅くなった。

## ストリーミングSIMDの効果

吐いたコード見てみると、g++は愚直にmovdqaで一個ずつデータをコピーしてる。icpcも、配列サイズを知らせないとmovdqaを吐くが、サイズを教えてやるとmovntdq (ストリーミング SIMD命令)出している。memcpy呼ぶ奴は、想定通り内部で_intel_fast_memcpyをcallしている。

g++との性能差がストリーミングSIMD命令で決まってるか確認するため、icpcにストリーミングSIMDを出させるかどうか指示する。指示オプションは-opt-streaming-storesで、デフォルトはauto (コンパイラに判断させる)。

```shell-session
$ icpc -O3 -opt-streaming-stores never fill.cc;./a.out # 絶対使うな
N=268435455
fill_n   0.115863
fillfore 0.115882
myfill   0.137723

$ icpc -O3 -opt-streaming-stores always fill.cc;./a.out # 絶対使え
N=268435455
fill_n   0.056443
fillfore 0.056552
myfill   0.141629
```

ということなので、g++との性能差はストリーミングSIMD命令の有無の模様。これだけのサイズだとキャッシュに収まらないので、最初からキャッシュを介さずにストアしてしまったほうが速い。

## まとめ

for文とstd::fill_nは性能が同じで、かつ速いので、変に工夫せず普通にstd::fill_nを使えば良さそう。
