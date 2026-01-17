---
layout: post
title: "clang++でrandom_shuffleの乱数生成器にrand()を使った時の問題点"
tags: [programming, devtools, qiita]
permalink: random_shuffle_rand
---

# clang++でrandom_shuffleの乱数生成器にrand()を使った時の問題点

clang++とGNU g++でrandom_shuffleの動作が違って困ったことの覚書。

## 現象

clang++でrandom_shuffleの乱数生成器にrand()を使った時、srandを0以外の比較的小さな値を入れて呼んだ直後にシャッフルすると、先頭要素がシャッフルされない。

## コード例
以下のようなコードを書いた。0から9までの整数を要素に持つ配列を、random_shuffleでシャッフルする。乱数生成器はrand()を使い、シャッフルする直前にsrandする。

```cpp
#include <iostream>
#include <algorithm>
#include <vector>
#include <stdlib.h>
//----------------------------------------------------------------------
int
myrand(const int max) {
  double r = static_cast<double>(rand()) / (static_cast<double>(RAND_MAX) + 1.0);
  return static_cast<int>(r * max);
};
//----------------------------------------------------------------------
int
main(int argc, char **argv){
  const int N = 10;
  for(int i=1;i<10;i++){
    int a[N] = {0,1,2,3,4,5,6,7,8,9};
    srand(i);
    std::random_shuffle(a,a+N,myrand);
    for(int j=0;j<N;j++){
      std::cout << a[j];
    }
    std::cout<< std::endl;
  }
}
//----------------------------------------------------------------------
```
## 実行結果
環境はMacOS X。g++のバージョンはg++ (MacPorts gcc49 4.9.2_1) 4.9.2、clang++のバージョンはApple LLVM version 6.0 (clang-600.0.57) (based on LLVM 3.5svn)。

```sh
$ g++ random_shuffle.cc; ./a.out
9347128065
7645139208
7039421568
9705623418
5701438962
6709231458
9574203618
1476538902
3518960472
8917526340
```
```sh
$ clang++ random_shuffle.cc; ./a.out
2150497386
0286735941
0369472851
0415786239
0528496173
0685731249
0861527439
0942875163
0127583469
0283197645
```
g++ではちゃんとシャッフルされているが、clang++では、最初の例(srand(0)の直後)以外では、先頭要素が必ず0になっている。つまり、ちゃんとシャッフルできていない。

## randとsrandの挙動

0からMAX-1までの整数を返す乱数を手抜きで作りたいとき、標準rand()を使って、doubleにキャストしてRAND_MAXで割ってからMAXをかけてintにキャストする、みたいなことをすることが多いと思う。

ところが実は、標準のrandはsrandに0以外の小さな整数を入れると、最初に返す擬似乱数が(RAND_MAXに比べて)非常に小さい値になる。なのでそれをdoubleにキャストしてRAND_MAXで割ると必ずゼロになる。つまり、srandに比較的小さい値を入れて、上記の方法で0からMAX-1までの乱数を作ろうとすると、一番最初は必ず0が返る。これはg++でもclang++でも同じ挙動になる。

```cpp
#include <stdio.h>
#include <stdlib.h>

int
main(void){
  const int max = 10;
  for(int i=0;i<10;i++){
    srand(i);
    const int r = rand();
    const double f = static_cast<double>(r)/(static_cast<double>(RAND_MAX)+1.0);
    const int r2 = static_cast<int>(max*f);
    printf("%d: %d\n",r2,r);
  }
}
```
```sh
0: 16807
0: 33614
0: 50421
0: 67228
0: 84035
0: 100842
0: 117649
0: 134456
0: 151263
```

## clangのrandom_shuffle

乱数生成器が最初に0を返すと最初の要素が動かないので、おそらくrandom_shuffleのソースはこういう形なのであろう、という予想がつく。実際にはイテレータで書いてあるのだろうが、わかりやすさのため配列で書く。

```cpp
for(int i=0;i<N-1;i++){
  const int r = rand(hoge)%hogehoge;
  std::swap(a[i],a[i+r]);
}
```
つまり、先頭から順番にswapしていくが、一度swapしたものはもう触らない、というアルゴリズム。また、乱数生成器が全て0を返した時に全くシャッフルされないことも予想できる(実際そうなっている)。

で、実際にソースを見るとこうなってた。テンプレートで書いてあったが、同じアルゴリズムを配列で書きなおす。

```cpp
void
shuffle(int a[N]){
  int first = 0;
  int last = N;
  int d = last - first;
  for(--last;first<last;++first,--d){
    int i = myrand(d);
    std::swap(a[first],a[first+i]);
  }
}
```
まぁ、予想通り、一度swapした要素はもう触らず、自分と最後の要素の間のどれかとswap、というアルゴリズムだった。

## まとめ

clang++でrandom_shuffleの乱数生成器にrand()を使うと、srand()を呼んだ直後に最初の要素がシャッフルされない問題は、

* srandに小さな値を入れた直後、randは小さな値を返す。それをRAND_MAXで割ってから、maxをかけてintにキャストすると0が返る。
* LLVMのrandom_shuffleの実装では、乱数生成器が0を返した場合はその要素は動かない。

という二つの原因により発生していることがわかった。

原因がわかってしまえば対策は簡単で、srandを呼んだ直後、randを何度か空まわししておけば良い。なお、**srandに小さな値を入れるのが本質ではない**ので、例えば`srand(seed+RAND_MAX/2)`とかやってもだめ。こうすると最初の要素が必ず5(10の半分)になる。要するに、要素数N、srandに与える種をseedとすると、シャッフル後の最初の要素が`(seed/RAND_MAX)*N`番目の要素になるということ。

もちろんrandom_shuffleではなくshuffleを使ったり、乱数生成器もrandじゃなくてもっとちゃんとしたのを使うのが正しいんだけれど、環境によってはなかなかそうもいかないので。
