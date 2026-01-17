---
layout: post
title: "OpenMPでshared指示できるもの、できないもの"
tags: [programming, hpc, qiita]
permalink: openmp_shared
---

# OpenMPでshared指示できるもの、できないもの

## はじめに

C++でOpenMPを使った並列化をする際、parallelリージョンでクラスのメンバ変数をshared指定できないのだが、そのことを書いた日本語の記事が、[大昔に自分で書いた記事](http://d.hatena.ne.jp/kaityo/20120523/1337743800)しか見つけられなかったので、あらためてこっちにも書いておく。

## 現象

クラスのメンバ変数をOpenMPのshared指定するとエラーで怒られる。例えばこんなコード。

```cpp
#include <iostream>
#include <omp.h>
#include <vector>
class Hoge {
private:
  std::vector<int> v;
public:
  void func(void) {
    int tid;
    #pragma omp parallel shared(v) private(tid)
    {
      tid = omp_get_thread_num();
      #pragma omp critical
      v.push_back(tid);
    }
    for (unsigned int i = 0; i < v.size(); i++) {
      std::cout << v[i] << std::endl;
    }
  }
};
int
main(void) {
  Hoge h;
  h.func();
}
```

これは、スレッド番号を自分のメンバ変数である`std::vector<int>`に貯めることを意図したコードだが、g++でコンパイルするとこんなエラーが出る。

```shell-session
$ g++ -fopenmp test.cpp 
test.cpp: メンバ関数 ‘void Hoge::func()’ 内:
test.cpp:10:48: エラー: ‘Hoge::v’ is not a variable in clause ‘shared’
     #pragma omp parallel shared(v) private(tid)

```

icpcだとこんなエラーになる。

```shell-session
$ icpc -fopenmp test.cpp 
test.cpp(10): error: invalid entity for this variable list in omp clause
      #pragma omp parallel shared(v) private(tid)
                                  ^

compilation aborted for test.cpp (code 2)

```

## 回避策1

一度テンポラリな変数に受けてからコピーすれば大丈夫。例えばこんな感じ。

```cpp
#include <iostream>
#include <omp.h>
#include <vector>
class Hoge {
private:
  std::vector<int> v;
public:
  void func(void) {
    int tid;
    std::vector<int> vtmp;
    #pragma omp parallel shared(vtmp) private(tid)
    {
      tid = omp_get_thread_num();
      #pragma omp critical
      vtmp.push_back(tid);
    }
    for (unsigned int i = 0; i < vtmp.size(); i++) {
      v.push_back(vtmp[i]);
    }
    for (unsigned int i = 0; i < v.size(); i++) {
      std::cout << v[i] << std::endl;
    }
  }
};
int
main(void) {
  Hoge h;
  h.func();
}
```

```shell-session
$ g++ -fopenmp test2.cpp  

$ OMP_NUM_THREADS=4 ./a.out 
1
2
0
3

```
## 回避策2

どうせ無指定の変数はsharedになるはずであるし、critical指定していれば良いはずなので、shared指定を外すという方法もある。

```cpp
#include <iostream>
#include <omp.h>
#include <vector>
class Hoge {
private:
  std::vector<int> v;
public:
  void func(void) {
    int tid;
    #pragma omp parallel private(tid)
    {
      tid = omp_get_thread_num();
      #pragma omp critical
      v.push_back(tid);
    }
    for (unsigned int i = 0; i < v.size(); i++) {
      std::cout << v[i] << std::endl;
    }
  }
};
int
main(void) {
  Hoge h;
  h.func();
}
```

なんか不安なのだが、とりあえず正しく動いているように見える。

## 原因？

クラスのメンバ変数はOpenMPでshared指定できず、一度テンポラリ変数に落として後でコピーする必要がある。これについて、そのものズバリの回答(というか仕様)を見つけられないのだが、[StackOverflowでの回答その1](http://stackoverflow.com/a/5007203)や[その2](http://stackoverflow.com/a/5007203)によれば、

* クラス変数は、実行時までインスタンス化されていない
* なのでコンパイラは、コンパイル時にそのアドレスを知ることができない
* sharedなら良いが、private化するにはデータをコピーしなければならず、それはできないからエラーになる

という理屈らしい。ただ、これだとprivate指定してエラーになるのはわかるが、上記のようにshared指定したらエラーになることの説明ができない気がする？

## staticメンバとconst変数

コンパイル時にアドレスが決まっていればいいの？ということで、メンバ変数をstaticにしてみる。

```cpp
#include <iostream>
#include <omp.h>
#include <vector>
class Hoge {
private:
  static std::vector<int> v;
public:
  void func(void) {
    int tid;
    #pragma omp parallel shared(v) private(tid)
    {
      tid = omp_get_thread_num();
      #pragma omp critical
      v.push_back(tid);
    }
    for (unsigned int i = 0; i < v.size(); i++) {
      std::cout << v[i] << std::endl;
    }
  }
};
std::vector<int> Hoge::v;
int
main(void) {
  Hoge h;
  h.func();
}
```

これをg++に食わすとエラーになる。

```shell-session
$ g++ -fopenmp test4.cpp
test4.cpp: In member function 'void Hoge::func()':
test4.cpp:10:48: error: 'Hoge::v' is predetermined 'shared' for 'shared'
```

これはこういうことが起きているらしい。

* コンパイラは`Hoge::v`がstaticなので、デフォルトでsharedだと判断する
* なのにプログラマが明示的にshared指定したので「二重指定だ」と怒る

コンパイラの判断と一致しているのだから怒ることないじゃん、と思うのだが・・・

なお、staticメンバでなく、const変数についてもg++はデフォルトでshared判定をするため、プログラマが明示的にshared指定すると「二重指定だ！」と怒られる。

```cpp
#include <iostream>
#include <omp.h>

const int c = 1;

int
main(void){
  int x[10];
#pragma omp parallel for shared(c)
  for(int i=0;i<10;i++){
    x[i] = c;
  }
  for(int i=0;i<10;i++){
    std::cout << x[i] << std::endl;
  }
}
```

```shell-session
$ g++ -fopenmp test5.cpp
test5.cpp: In function 'int main()':
test5.cpp:9:35: error: 'c' is predetermined 'shared' for 'shared'
```

ちなみに、インテルコンパイラ(icpc)だと、staticメンバのshared指定についてはエラー、const変数のshared指定については通る。

```shell-session
$ icpc -fopenmp test4.cpp # 怒る

test4.cpp(10): error: invalid entity for this variable list in omp clause
      #pragma omp parallel shared(v) private(tid)
                                  ^

compilation aborted for test4.cpp (code 2)

$ icpc -fopenmp test5.cpp # 通る
```

さらに言えば、富士通コンパイラだと、メンバ変数のshared指定はできないが、staticメンバもconst変数もshared指定できる。

まとめるとこんな感じ。

| shared指定するもの | g++ | インテルコンパイラ | 富士通コンパイラ |
|:-:|:-:|:-:|:-:|
| メンバ変数  | × | × | × |
| staticメンバ  | ×  | × | ○ |
| const変数  | ×  | ○ | ○ |

## まとめ

OpenMPよくわかんない。
