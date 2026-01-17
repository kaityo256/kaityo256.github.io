---
layout: post
title: "C++のクラスの宣言と翻訳単位"
tags: [programming, qiita]
permalink: cpp_translation_unit
---

# C++のクラスの宣言と翻訳単位

## はじめに

クラスのメソッドの中身をcppファイルに書くかヘッダに書くかの違いをあまり意識してこなかった。インクルードガードとか`#pragma once`とかあれば(コンパイル時間とか除いて)同じだと思っていた。しかし、いろいろ試してみて「あ、僕ってC++全然知らなかったんだな」と思ったので覚書。

なお、僕はC++の規格書を読むのが趣味とかC++警察とかそういう怖い方面の人じゃないので、以下は自分で試したことのみにもとづいて憶測で書いています。あしからず。

## クラスの定義と実装

以下の2つのファイルを考える。

```cpp
#include <stdio.h>
class Hoge{
  private:
    void private_function(void){
      printf("This is private\n");
    }
  public:
    void public_function(void){
      printf("This is public\n");
    }
};
```

```cpp
#include <stdio.h>
class Hoge{
  private:
    void private_function(void);
  public:
    void public_function(void);
};

void Hoge::private_function(void){
  printf("This is private\n");
}

void Hoge::public_function(void){
  printf("This is public\n");
}
```

`test1.cpp`はメソッドの中身がクラス定義の中に書いてあるのに対し、`test2.cpp`はメソッドの中身がクラスの定義の外に書いてある。僕はこれらは同じことだと思っていたが、コンパイルしてみると、前者はオブジェクトファイルに何も出力されず、後者は実体が吐き出される。

```shell-session
$ g++ -c test1.cpp test2.cpp  
$ nm -C test1.o  

$ nm -C test2.o
0000000000000018 T Hoge::public_function()
0000000000000000 T Hoge::private_function()
                 U puts
```

この状態で、こんな`main`関数を書いてみる。

```cpp
class Hoge{
  public:
    void private_function(void);
    void public_function(void);
};

int
main(void){
  Hoge h;
  h.public_function();
  h.private_function();
}
```

`private`な関数をわざと`public`で宣言しなおしている。これを`test1.o`とリンクしても(中身が空だからあたりまえだが)定義がないと怒られる。

```shell-session
$ g++ main.cpp test1.o 
/tmp/ccPaxeUm.o: In function `main':
main.cpp:(.text+0x10): undefined reference to `Hoge::public_function()'
main.cpp:(.text+0x1c): undefined reference to `Hoge::private_function()'
collect2: error: ld returned 1 exit status
```

`test2.o`には実体があるから、リンク＆実行できる。

```shell-session
$ g++ main.cpp test2.o
$ ./a.out
This is public
This is private
```

`private`とか`public`というのはコンパイル時の制約であって、オブジェクトファイルには何も書いてないから、普通にprivateメソッドを呼び出すことができる。

## クラス内で定義されたメソッドの実体

さて、クラス内に定義されたメソッドの中身はオブジェクトファイルに出力されなかった。そこで、こんなコードを書いてみる。

```cpp
#include <stdio.h>
class Hoge{
  private:
    void private_function(void){
      printf("This is private\n");
    }
  public:
    void public_function(void){
      printf("This is public\n");
    }
};

void
func(void){
  Hoge h;
  h.public_function();
}
```

クラスの宣言には何も手を加えず、`Hoge::public_function`を呼ぶ関数`func`を定義してみた。これをコンパイルするとこうなる。

```shell-session
$ g++ -c test3.cpp
$ nm -C test3.o 
0000000000000000 T func()
0000000000000000 W Hoge::public_function()
                 U puts
```

ファイルスコープ中で呼ばれる可能性がある`Hoge::public_function()`のみ実体化された。

そこで、クラス宣言をちょっといじって、`private_function`を呼ぶ`call_private`メソッドを追加し、それも呼んでやる。

```cpp
#include <stdio.h>
class Hoge{
  private:
    void private_function(void){
      printf("This is private\n");
    }
  public:
    void public_function(void){
      printf("This is public\n");
    }
    void call_private(void){
      private_function();
    }
};

void
func(void){
  Hoge h;
  h.public_function();
  h.call_private();
}
```

コンパイルすると、`private_function`の中身もオブジェクトファイルに吐かれる。

```shell-session
$ g++ -c test4.cpp  
$ nm -C test4.o
0000000000000000 T func()
0000000000000000 W Hoge::call_private()
0000000000000000 W Hoge::public_function()
0000000000000000 W Hoge::private_function()
                 U puts
```

この状態で、先程のprivate無視コードとリンクしてみる。

```shell-session
$ g++ main.cpp test4.o    
$ ./a.out
This is public
This is private
```

うん、呼べた。

## 別々に翻訳させてみる

こんな`hpp`ファイルを書く。

```cpp
#pragma once
#include <stdio.h>

class Hoge{
  public:
    void sub1(void){
      printf("sub1\n");
    }
    void sub2(void){
      printf("sub2\n");
    }
};
```

このうち、`Hoge::sub1`だけを呼ぶファイル、`sub2`だけをよぶファイル、両方を呼ぶファイルを作る。

```cpp
#include "hoge.hpp"
void sub1(void){
  Hoge h;
  h.sub1();
}
```

```cpp
#include "hoge.hpp"
void sub2(void){
  Hoge h;
  h.sub1();
}
```

```cpp
#include "hoge.hpp"
void sub12(void){
  Hoge h;
  h.sub1();
  h.sub2();
}
```

それぞれコンパイルしてみると、予想どおり呼ばれた奴だけ翻訳される。

```shell-session
$ g++ -c sub1.cpp sub2.cpp sub12.cpp 
$ nm -C sub1.o 
0000000000000000 T sub1()
0000000000000000 W Hoge::sub1()
                 U puts
$ nm -C sub2.o
0000000000000000 T sub2()
0000000000000000 W Hoge::sub2()
                 U puts

$ nm -C sub12.o
0000000000000000 T sub12()
0000000000000000 W Hoge::sub1()
0000000000000000 W Hoge::sub2()
                 U puts
```

それぞれのオブジェクトファイルに実体が書いてあるから、~~このままリンクすると当然のことながらぶつかる。~~すみません、初稿でコピペミスしてました。同じ定義を参照しているけれど、ぶつからずにリンクが通る。

 
```cpp
void sub1(void);
void sub2(void);
void sub12(void);

int
main(void){
  sub1();
  sub2();
  sub12();
}
```

```shell-session
$ g++ main2.cpp sub1.o sub2.o sub12.o 
$ ./a.out
sub1
sub2
sub1
sub2
```

ちなみに、最適化オプションによって、クラスのメンバ関数がオブジェクトファイルに出力されるかどうかが決まる。こんな感じ。

```shell-session
$ g++ -O1 -c sub1.cpp sub2.cpp sub12.cpp 
$ nm -C sub*.o

sub1.o:
0000000000000000 T sub1()
                 U puts

sub12.o:
0000000000000000 T sub12()
                 U puts

sub2.o:
0000000000000000 T sub2()
                 U puts
```

`-O1`を指定すると`Hoge::sub1()`その他がインライン展開され、オブジェクトファイルには含まれなくなった。

メソッドの中身を`hoge.cpp`に逃がす。

```cpp
#pragma once
class Hoge{
  public:
    void sub1(void);
    void sub2(void);
};
```

```cpp
#include <stdio.h>
#include "hoge.hpp"
void Hoge::sub1(void){
  printf("sub1\n");
}
void Hoge::sub2(void){
  printf("sub2\n");
}
```

こうすると、先程の`sub1.cpp`とかを翻訳しても、オブジェクトファイルは参照だけになって実体が書き込まれない。実体は`hoge.o`のみに書き込まれる。

```shell-session
$ g++ -c sub1.cpp sub2.cpp sub12.cpp hoge.cpp 
$ nm -C sub1.o
0000000000000000 T sub1()
                 U Hoge::sub1()
$ nm -C sub2.o
0000000000000000 T sub2()
                 U Hoge::sub2()
$ nm -C sub12.o
0000000000000000 T sub12()
                 U Hoge::sub1()
                 U Hoge::sub2()
$ nm -C hoge.o
0000000000000000 T Hoge::sub1()
0000000000000018 T Hoge::sub2()
                 U puts
```

この状態でも当然ぶつからない。

```shell-session
$ g++ main2.cpp sub1.o sub2.o sub12.o hoge.o 
$ ./a.out
sub1
sub2
sub1
sub2
```

## まとめ

クラスのメソッドの定義がヘッダに書いてある場合、そのメソッドを翻訳したコードの読み込み先は、そのヘッダを読み込んだファイルのオブジェクトファイルになる。ちょっと考えたらすごく当たり前のことなんだけど、いままで意識したことがなかった。また、クラスの定義内に中身があるメソッドは「そのファイルスコープ中で呼ばれる可能性があるメソッド」のみ翻訳される。いくつかのコンパイラで試したけど、全部そういう動作だったから、きっと規格で決まってるんでしょうね。

## 追記

コメント欄で「クラス内のメンバー関数定義はinline指定になるから」と教えていただいた。inline指定された場合、それをインライン化するかどうかはコンパイラに任され、多くの場合コンパイルオプションに依存する。なので、こんなことがおきる。

```cpp
#include <stdio.h>
inline void func(void){
  printf("Hello\n");
}

void func2(void){
  func();
}
```

`func`にインライン展開を指示し、それを`func2`から呼んでいる。これをインライン展開するかどうかも、`func`の実体をオブジェクトファイルに保存するかどうかもコンパイラに任されている。

~~なので、inline指定された関数を外部から呼ぶと、コンパイルオプション依存のコードになる。~~

さて、コメント欄で指摘されている通り、規格上、inline指定された関数は、それを呼び出す全ての翻訳単位で同一の定義がされていなければならない。なので、ある翻訳単位でinline指定した関数を、別の関数から(通常の関数のように)呼び出すのは規格違反であり、何が起きても文句は言えない。今回試した環境では、コンパイルオプションに依存してリンクできたりできかったりする。

```cpp
void func(void);

int
main(void){
  func();
}
```

```shell-session
$ g++ callinline.cpp inline.cpp # 最適化レベル最低ではリンクできる
$ ./a.out  # 実行もできる
Hello

$ g++ -O1 callinline.cpp inline.cpp $ 最適化レベルを上げるとリンクできない
/tmp/ccmwqs0k.o: In function `main':
callinline.cpp:(.text+0x5): undefined reference to `func()'
collect2: error: ld returned 1 exit status
```

これは、最適化レベルを上げると`func`が`func2`にインライン展開され、funcの定義がオブジェクトファイルに保存されないから。

うわぁ、ちょっとひいた。

コメント欄で教えていただいた[[C++]そのinline、大丈夫？](http://qiita.com/kktk-KO/items/075ce9a784d5d8296d53)には、リンク順序に依存して結果が変わり、コンパイラは警告もエラーも出さない例が挙げられている。

ドン引き・・・
