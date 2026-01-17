---
layout: post
title: "GCCのループ内の未定義動作検出能力"
tags: [devtools, qiita]
permalink: gcc_ub_detection
---

# GCCのループ内の未定義動作検出能力

## はじめに

数学の問題を解いていたはずが、いつのまにかGCCの未定義動作の検出能力の発展を調べることになった話。

## ディオファントス方程式

こんな問題を見つけた。

![image0.jpeg](/assets/images/gcc_ub_detection/image0.jpeg)

初出がどこかはよくわからないが、僕はこの記事で知った。

https://www.quora.com/How-do-you-find-the-positive-integer-solutions-to-frac-x-y%2Bz-%2B-frac-y-z%2Bx-%2B-frac-z-x%2By-4/answer/Alon-Amit

要するに

$$
\frac{x}{y+z}+
\frac{y}{z+x}+
\frac{z}{x+y} = 4
$$

の自然数解を求めなさい、という、典型的なディオファントス方程式である。

さて、僕はしばらく取り組んで見て解けなかったので、プログラムで探すことにした。ちょっとRubyで探したが見つからなかったので、「これは解が相当大きな数に違いない」と踏んで[^2]、C++で探すことにした。

[^2]: この予測は一応合ってましたね。一応。。。

そのままプログラムにしてもいいが、どうせこういう問題は基本対称式使うんだろ、と、対称式でバラすことにした。

対称式にバラすのはMathematicaにやらせる。

$$
In[1]:= Eliminate[{f == x/(y + z) + y/(z + x) + z/(x + y) - 4, 
  a == x + y + z, b == x y + y z + z x, c == x y z}, {x, y, z}]

Out[1]= c (-7 - f) == a^3 + a b (-6 - f)
$$

ここから、

$$
a^3 - 6 a b - 7c = 0
$$

の自然数解を求める問題に帰着された[^1]。これをそのままプログラムにするとこんな感じになるだろう。

```cpp
#include <cstdio>

int
main(void){
  const int max = 1000;
  for(int x = 1; x < max;x++){
    for(int y = 1; y < max;y++){
      for(int z = 1; z < max;z++){
        int a = x+y+z;
        int b = x*y+y*z+z*x;
        int c = x*y*z;
        if (a*a*a - 6 * a * b == 7*c){
          printf("%d %d %d\n",x,y,z);
        }
      }
    }
  }
}
```

ここまでが長い前置きであって、以下ではもう先のディオファントス方程式の話題は出てこない。この方程式にはちゃんと解があるので、数学の腕に覚えがある人は挑戦してみると面白いかもしれない。答と求め方は先の記事にある。

さて、このコードを、最適化オプション`-O2`以上でコンパイルすると、「未定義動作を伴うよ」と警告が出る。

```shell-session
$ g++ -O1 search.cpp       
$ g++ -O2 search.cpp       
search.cpp: In function ‘int main()’:
search.cpp:12:31: warning: iteration 307u invokes undefined behavior [-Waggressive-loop-optimizations]
     if (a*a*a - 6 * a * b == 7*c){
                               ^
search.cpp:6:3: note: containing loop
   for(int x = 1; x < max;x++){
   ^
```

これは、`7*c`が`int`の値を超えちゃうよ、ということを警告している。clang++はこれを教えてくれない。

```shell-session
$ clang++ -O3 search.cpp
$ 
```

というわけで、どういう時に未定義動作を検出してくれるかをざっと調べてみた。

## オーバーフローの検出

こんなコードを書いてみる。

```cpp
#include <cstdio>

void
func(void){
  for(int x = 0; x < 1000;x++){
    for(int y = 0; y < 1000;y++){
      for(int z = 0; z < 1000;z++){
        if (3 * x * y * z % 2  == 0){
          printf("%d %d %d\n",x,y,z);
        }
      }
    }
  }
}
```

これはGCCは未定義動作を検出してくれる。

```shell-session
$ g++ -O3 -c test1.cpp   
test1.cpp: In function 'void func()':
test1.cpp:8:19: warning: iteration 718 invokes undefined behavior [-Waggressive-loop-optimizations]
     if (3 * x * y * z % 2  == 0){
         ~~~~~~~~~~^~~
test1.cpp:5:20: note: within this loop
   for(int x = 0; x < 1000;x++){
                  ~~^~~~~~
```

ソースをちょっとだけ書き換えて見る。

```cpp
#include <cstdio>

void
func(void){
  for(int x = 0; x < 1000;x++){
    for(int y = 0; y < 1000;y++){
      for(int z = 0; z < 1000;z++){
        // if (3 * x * y * z % 2  == 0){
        if (3 * x * y * z % 2  == 1){
          printf("%d %d %d\n",x,y,z);
        }
      }
    }
  }
}
```

`3 * x * y * z % 2  == 0`を`3 * x * y * z % 2  == 1`に変えただけなのだが、これは文句言ってくれない。

intをcharにしてみる。

```cpp
#include <cstdio>

void
func(void){
  for(char x = 0; x < 100;x++){
    for(char y = 0; y < 100;y++){
      for(char z = 0; z < 100;z++){
        if (3 * x * y * z % 2  == 0){
          printf("%d %d %d\n",x,y,z);
        }
      }
    }
  }
}
```

問題としては`int`の場合と同様なことが起きそうなのだが、これもコンパイラは文句を言わない。


次に、`int`を`short`にしてみる。

```cpp
#include <cstdio>

void
func(void){
  for(short x = 0; x < 1000;x++){
    for(short y = 0; y < 1000;y++){
      for(short z = 0; z < 1000;z++){
        if (3 * x * y * z % 2  == 0){
          printf("%d %d %d\n",x,y,z);
        }
      }
    }
  }
}
```

これは文句を言う。

```shell-session
$ g++ -O3  -c test4.cpp 
test4.cpp: In function 'void func()':
test4.cpp:8:19: warning: iteration 718 invokes undefined behavior [-Waggressive-loop-optimizations]
     if (3 * x * y * z % 2  == 0){
         ~~~~~~~~~~^~~
test4.cpp:5:22: note: within this loop
   for(short x = 0; x < 1000;x++){
                    ~~^~~~~~
```

これらの違いはアセンブリちゃんと読めばわかるんだろうけど、面倒なので見てない。

## 配列の領域外参照のチェック

GCCはループ内にある配列の領域外参照のチェックをしてくれる。

```cpp
int a[10];
void
func(void){
  for(int i=0;i<20;i++){
    a[i] = i;
  }
}
```

このチェックは`-O1`から有効になる。

```shell-session
$ g++ -O0 -c index1.cpp 
$ g++ -O1 -c index1.cpp 
index1.cpp: In function 'void func()':
index1.cpp:5:10: warning: iteration 10 invokes undefined behavior [-Waggressive-loop-optimizations]
     a[i] = i;
     ~~~~~^~~
index1.cpp:4:16: note: within this loop
   for(int i=0;i<20;i++){
               ~^~~
```

また、二重ループを使っても検出可能。

```cpp
int a[10];
void
func(void){
  for(int j=0;j<4;j++){
    for(int i=0;i<4;i++){
      a[i+ j*4] = i;
    }
  }
}
```

```shell-session
$ g++ -O1 -c index2.cpp   
index2.cpp: In function 'void func()':
index2.cpp:6:17: warning: iteration 2 invokes undefined behavior [-Waggressive-loop-optimizations]
       a[i+ j*4] = i;
       ~~~~~~~~~~^~~
index2.cpp:4:16: note: within this loop
   for(int j=0;j<4;j++){
               ~^~
```

三重ループの検出は`-O3`から。

```cpp
int a[10];
void
func(void){
  for(int k=0;k<4;k++){
    for(int j=0;j<4;j++){
      for(int i=0;i<4;i++){
        a[i+ j*4 + k*16] = i;
      }
    }
  }
}
```

```shell-session
$ g++ -O2 -c index3.cpp  
$ g++ -O3 -c index3.cpp
index3.cpp: In function 'void func()':
index3.cpp:7:26: warning: iteration 3 invokes undefined behavior [-Waggressive-loop-optimizations]
         a[i+ j*4 + k*16] = i;
         ~~~~~~~~~~~~~~~~~^~~
index3.cpp:5:18: note: within this loop
     for(int j=0;j<4;j++){
                 ~^~
index3.cpp:7:26: warning: iteration 1 invokes undefined behavior [-Waggressive-loop-optimizations]
         a[i+ j*4 + k*16] = i;
         ~~~~~~~~~~~~~~~~~^~~
index3.cpp:4:16: note: within this loop
   for(int k=0;k<4;k++){
               ~^~
```

二次元配列で、単純連続アクセスとならない場合も、`-O3`で検出される。

```cpp
int a[10];
void
func(void){
  for(int j=0;j<10;j++){
    for(int i=0;i<10;i++){
      a[i+ j] = i;
    }
  }
}
```

```shell-session
$ g++ -O2 -c index2b.cpp 
$ g++ -O3 -c index2b.cpp 
index2b.cpp: In function 'void func()':
index2b.cpp:6:15: warning: iteration 9 invokes undefined behavior [-Waggressive-loop-optimizations]
       a[i+ j] = i;
       ~~~~~~~~^~~
index2b.cpp:4:16: note: within this loop
   for(int j=0;j<10;j++){
               ~^~~
```

## まとめ

GCCはループ変形時に、変数のオーバーフローや、配列の領域外参照を検出すると教えてくれる(こともある)。上記の全てのコードについて、clang++は何も言ってくれない。

## おまけ

上記の警告はあくまでループ変形に伴うものなので、以下のような自明な領域外参照については何も言ってくれない。

```cpp
int
func(void){
  int a[10];
  return a[11];
}
```

```shell-session
$ g++ -O3 -c index4.cpp 
$
```

ただし、上記のソースは`-O2`以上の最適化オプションと`-Warray-bounds`が指定された場合には指摘してくれる。

```shell-session
$ g++ -O1 -Warray-bounds -c index4.cpp 
$ g++ -O2 -Warray-bounds -c index4.cpp 
index4.cpp: In function 'int func()':
index4.cpp:4:14: warning: array subscript is above array bounds [-Warray-bounds]
   return a[11];
          ~~~~^
```

ちなみにclang++はオプション無しに警告してくれる。

```shell-session
$ clang++ -c index4.cpp
index4.cpp:4:10: warning: array index 11 is past the end of the array (which
      contains 10 elements) [-Warray-bounds]
  return a[11];
         ^ ~~
index4.cpp:3:3: note: array 'a' declared here
  int a[10];
  ^
1 warning generated.
```



[^1]: この変形がBrute force探索に良い形なのかどうかは知らない。とりあえず基本対称式を手でいじってどうにもならなかったので、プログラムでなんとかすることにしてこれを使うことにした。
