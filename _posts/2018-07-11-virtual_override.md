---
layout: post
title: "オーバーライドされた仮想関数にまつわる最適化"
tags: [programming, devtools, hpc, qiita]
permalink: virtual_override
---

# オーバーライドされた仮想関数にまつわる最適化

## はじめに

あるクラスから派生したクラスで、基底クラスのメソッドをオーバーライドしたとする。この時、派生クラスがコンパイル時にわかっているときに、コンパイラはそれを認識して最適化できるか試してみた。

使うコンパイラは以下の通り。

* g++ (Homebrew GCC 7.3.0_1) 7.3.0
* clang++ Apple LLVM version 9.1.0 (clang-902.0.39.2)
* icpc (ICC) 18.0.1 20171018

ただし、インテルコンパイラについては最後でちょっと触れるだけにする。

## ケース1: 静的な宣言

こんなコードを考える。

```test1.cpp
struct Hoge {
  int func() {
    return 1;
  }
};

int func() {
  Hoge h;
  return h.func();
}
```

関数`func`は常に1を返す関数であるが、それをコンパイラが認識できるか試す。これを

```shell-session
$ g++ -O3 -S test1.cpp
$ clang++ -O3 -S test1.cpp
```

などとしてアセンブリを見て、`func`が即値を返せるか調べる。

まずg++の場合。

```nasm
func():
LFB1:
        movl    $1, %eax
        ret
```

clang++の場合(不要な情報を削ってある)。

```nasm
func():
        pushq   %rbp
        movq    %rsp, %rbp
        movl    $1, %eax
        popq    %rbp
        retq
```

うん、どちらも即値で返せていますね。まぁこのあたりは認識して欲しい気がする。

## ケース2: newした場合

クラス`Hoge`をnewした場合はどうだろう？

```test2.cpp
struct Hoge {
  int func() {
    return 1;
  }
};

int func() {
  Hoge *h = new Hoge();
  return h->func();
}
```

g++の場合。

```nasm
func():
        subq    $8, %rsp
        movl    $1, %edi
        call    operator new(unsigned long)
        movl    $1, %eax
        addq    $8, %rsp
        ret
```

律儀にnewを呼んだりしているけど、即値で返していますね。

clang++の場合。

```nasm
func():
        pushq   %rbp
        movq    %rsp, %rbp
        movl    $1, %eax
        popq    %rbp
        retq
```

なんとclang++の場合はnewも不要と判断してしまう。

## ケース3: スマートポインタの場合

スマートポインタを使ってみよう。

```test3.cpp
#include <memory>
struct Hoge {
  int func() {
    return 1;
  }
};

int func() {
  std::unique_ptr<Hoge> h(new Hoge());
  return h->func();
}
```

g++の場合。

```nasm
func():
LFB1904:
        subq    $8, %rsp
        movl    $1, %edi
        call    operator new(unsigned long)
        movl    $1, %esi
        movq    %rax, %rdi
        call    operator delete(void*, unsigned long)
        movl    $1, %eax
        addq    $8, %rsp
        ret
```

律儀にnewとdeleteを呼んでいるけど、即値で返している。

clang++の場合。

```nasm
func():
        pushq   %rbp
        movq    %rsp, %rbp
        movl    $1, %eax
        popq    %rbp
        retq
```

先程と同様、即値で返す上にnewやdeleteも呼ばない。

## ケース4: オーバーライドした場合

さて、オーバーライドがからむ場合。基底関数のメソッドを派生クラスでオーバーライドするのだが、誰がオーバーライドしたかコンパイル時にわかる場合。

```test4.cpp
#include <memory>
struct Hoge {
  virtual int func() {
    return 1;
  }
};

struct Hoge1 : public Hoge {
  int func() {
    return 10;
  }
};

struct Hoge2 : public Hoge {
  int func() {
    return 20;
  }
};

int func() {
  std::unique_ptr<Hoge> h(new Hoge1());
  return h->func();
}
```

この場合だと、返り値としては1, 10, 20の三通りの可能性があるが、newされているのは`Hoge1()`なので返り値は10になることがわかる。それをコンパイラが見抜けるか。

g++の場合。

```nasm
func():
        subq    $8, %rsp
        movl    $8, %edi
        call    operator new(unsigned long)
        movq    vtable for Hoge1@GOTPCREL(%rip), %rdx
        movl    $8, %esi
        movq    %rax, %rdi
        addq    $16, %rdx
        movq    %rdx, (%rax)
        call    operator delete(void*, unsigned long)
        movl    $10, %eax
        addq    $8, %rsp
        ret
```

おおー、ちゃんと即値で返していますね。

clang++の場合。

```nasm
func():
        pushq   %rbp
        movq    %rsp, %rbp
        movl    $10, %eax
        popq    %rbp
        retq
```

clang++の場合はこれまで同様、即値で返している上に不要なnewとdeleteも呼ばない。

## ケース5: 初期化と条件分岐がからむ場合

これが本命。条件によって異なる派生クラスが作られるのだが、どの派生クラスが作られるかはコンパイル時にわかる、というケース。こんなの。

```test5.cpp
#include <memory>
struct Hoge {
  virtual int func() {
    return 1;
  }
};

struct Hoge1 : public Hoge {
  int func() {
    return 10;
  }
};

struct Hoge2 : public Hoge {
  int func() {
    return 20;
  }
};

int func(double p) {
  std::unique_ptr<Hoge> h;
  if (p < 0.0) {
    h = std::unique_ptr<Hoge>(new Hoge1());
  } else {
    h = std::unique_ptr<Hoge>(new Hoge2());
  }
  return h->func();
}

int func2() {
  return func(-1.0);
}
```

ファクトリメソッド・パターンが絡んでいると思えば良い。`func`の引数の正負で`Hoge1`か`Hoge2`のどちらが実体化されるかが決まるが、`func2`では負の数を入れて呼んでいるため、`func`では`Hoge1`が作られることが確定。すると`h->func()`が10を返すことが確定するため、`func2`の返り値も10となる。ここまでコンパイラが見抜けるか、という話。

g++の場合。

```nasm
func2():
        pushq   %rbp
        movl    $8, %edi
        pushq   %rbx
        subq    $8, %rsp
        call    operator new(unsigned long)
        movq    %rax, %rbx
        movq    vtable for Hoge1@GOTPCREL(%rip), %rax
        movq    %rbx, %rdi
        addq    $16, %rax
        movq    %rax, (%rbx)
        call    Hoge1::func()
        movq    %rbx, %rdi
        movl    $8, %esi
        movl    %eax, %ebp
        call    operator delete(void*, unsigned long)
        addq    $8, %rsp
        movl    %ebp, %eax
        popq    %rbx
        popq    %rbp
        ret
```

g++はここで力尽きた。`Hoge1`が作られるところまではわかったが、`Hoge1::func`のインライン展開まではしなかった。

で、clang++の場合。

```nasm
func2():
        pushq   %rbp
        movq    %rsp, %rbp
        movl    $10, %eax
        popq    %rbp
        retq
```

最後まで最適化が通り、即値で返してくる。

## まとめ

ある関数が派生クラスでオーバーライドされているが、どのクラスでオーバーライドしているかがコンパイル時にわかる、という条件でどこまで最適化されるか調べた。clang++は最後まで最適化が通り、かつ不要なnewとdeleteも削除してくれる。これはわりと大したもんだと思う。g++は最後まで仮想関数テーブルはひかなかったが、作成したクラスのメソッドのインライン展開はしなくなったため、ケース5で即値で返せなくなった。ちなみにインテルコンパイラはケース3までは即値で返せたが、ケース4から真面目に仮想関数テーブルをひくようになった。

ファクトリメソッド・パターンで、ある変数の値に応じて異なるクラスの実体が作られるようにしたいのだが、その変数はコンパイル時に決定している、という状況があって、そこで軽い関数を頻繁に呼ぶのでちょっと性能が気になって調べたのだが、clang++なら(少なくとも今回程度の複雑さなら)オーバーライドなしで生関数呼んだ場合と同じ性能が出せるみたいですね。
