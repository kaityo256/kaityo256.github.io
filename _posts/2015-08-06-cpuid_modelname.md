---
layout: post
title: "cpuidを使ってmodel nameを取得する"
tags: [programming, qiita]
permalink: cpuid_modelname
---

# cpuidを使ってmodel nameを取得する

## はじめに

` cat/proc/cpuinfo` で出力されるvendor_idやmodel nameを、自分でcpuidを呼んで調べてみる。拡張インラインアセンブラ構文の確認と、C言語の可変長引数関数の自分用覚書。

## cpuid

cpuid命令の詳細はIntelウェブサイトの[日本語技術資料のダウンロード](http://www.intel.co.jp/content/www/jp/ja/developer/download.html)にある、「IA-32 インテル® アーキテクチャー・ソフトウェア・デベロッパーズ・マニュアル、中巻 A: 命令セット・リファレンス A-M 」にある。

例えばeaxに0を代入した状態でcpuid命令を発行すると、ebx, ecx, edxにそれぞれ"Genu"、"ntel"、"ineI"の文字列が入る(32bitレジスタなので4つのcharが入る)。これをebx、edx、ecxの順番に並べれば「GenuineIntel」となる。

model nameについては、eaxに0x80000002、0x80000003、0x80000004を入れてcpuidを呼ぶと、eax,ebx,ecx,edxに4バイトずつ情報が入ってくる。従って、model nameを得るには、合計3回cpuidを呼ばないといけない。

## インラインアセンブラ

cpuidを呼んだあとにeax,ebx,ecx,edxに入ってくる情報を変数にコピーする必要がある。これを拡張インラインアセンブラ構文でやる。例えばeaxに値を入れるところを、

```c++
uint32_t v = 0;
asm("nop" :: "a" (v));
```
とする。asmの:の後が拡張構文で、これはeaxにvの値を代入せよ、という意味。
また、

```c++
uint32_t a;
  asm("movl %%eax, %0" : "=r" (a));
```
とすれば、eaxの内容をaに代入できる。

まとめると、eaxにvの値を入れてcpuidを呼んで、eax〜edxの値を変数に読み出すところはこんな感じでできる。

```c++
  uint32_t eax, ebx, ecx, edx;
  asm("nop" :: "a" (v));
  asm("cpuid");
  asm("movl %%eax, %0" : "=r" (eax));
  asm("movl %%ebx, %0" : "=r" (ebx));
  asm("movl %%ecx, %0" : "=r" (ecx));
  asm("movl %%edx, %0" : "=r" (edx));
```
## ソースコード

何度もcpuidを呼んで、eax〜edxの値を読み出し、文字列として出力するコード。

```c++
//------------------------------------------------------------------------
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <stdarg.h>
//------------------------------------------------------------------------
void
cpuid(uint32_t v, uint32_t &a, uint32_t &b, uint32_t &c, uint32_t &d){
  uint32_t eax, ebx, ecx, edx;
  asm("nop" :: "a" (v));
  asm("cpuid");
  asm("movl %%eax, %0" : "=r" (eax));
  asm("movl %%ebx, %0" : "=r" (ebx));
  asm("movl %%ecx, %0" : "=r" (ecx));
  asm("movl %%edx, %0" : "=r" (edx));
  a = eax;
  b = ebx;
  c = ecx;
  d = edx;
}
//------------------------------------------------------------------------
int
put(int num, ...){
  va_list args;
  va_start(args,num);
  char buf[256];
  buf[num*4] = 0;
  for(int i=0;i<num;i++){
    uint32_t v = va_arg(args,uint32_t);
    memcpy(buf+4*i,(char*)(&v),4);
  }
  printf("%s",buf);
  va_end(args);
}
//------------------------------------------------------------------------
int
main(void){
  uint32_t eax, ebx, ecx, edx;
  cpuid(0,eax,ebx,ecx,edx);
  put(3,ebx,edx,ecx);
  printf("\n");
  cpuid(0x80000002,eax,ebx,ecx,edx);
  put(4,eax,ebx,ecx,edx);
  cpuid(0x80000003,eax,ebx,ecx,edx);
  put(4,eax,ebx,ecx,edx);
  cpuid(0x80000004,eax,ebx,ecx,edx);
  put(4,eax,ebx,ecx,edx);
  printf("\n");
}
//------------------------------------------------------------------------
```

手元のSandyBridgeマシンでの実行例。

```shell-session
$ g++ modelname.cc
$ ./a.out
GenuineIntel
       Intel(R) Core(TM) i7-2700K CPU @ 3.50GHz
$ cat /proc/cpuinfo| grep Intel
vendor_id	: GenuineIntel
model name	: Intel(R) Core(TM) i7-2700K CPU @ 3.50GHz
vendor_id	: GenuineIntel
model name	: Intel(R) Core(TM) i7-2700K CPU @ 3.50GHz
vendor_id	: GenuineIntel
model name	: Intel(R) Core(TM) i7-2700K CPU @ 3.50GHz
vendor_id	: GenuineIntel
model name	: Intel(R) Core(TM) i7-2700K CPU @ 3.50GHz
```

できてるっぽい。
