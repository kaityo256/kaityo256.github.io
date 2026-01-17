---
layout: post
title: "MacのGCCで返り値を返さない関数を書くと鼻から悪魔が出る"
tags: [programming, mac, devtools, qiita]
permalink: gcc_ub_return
---

# MacのGCCで返り値を返さない関数を書くと鼻から悪魔が出る

## はじめに

未定義動作って怖いですね。未定義動作を入れると何が起きるかわからないことから、「鼻から悪魔」とかよく言われます。以前も踏んだことがあるのですが、今回また未定義動作を踏んでそうとう時間を溶かしたので、僕みたいな犠牲者が出ないようにここにメモしておきます。

環境:

* macOS Mojave 10.14.3
* g++ (Homebrew GCC 8.2.0) 8.2.0

## 現象1

以下のコードをMacのg++でコンパイル、実行するとSIGILLで死ぬ。

```cpp
int hoge() {
}

int main() {
  hoge();
}
```

```sh
$ g++ -O1 test1.cpp  
test1.cpp:2:1: warning: no return statement in function returning non-void [-Wreturn-type]
 }
 ^

$ ./a.out
zsh: illegal hardware instruction  ./a.out
```

## なぜ？

* 返り値を返すと宣言した関数で返り値を返さないのは未定義動作であり、
* かつMacのGCCでは、デフォルトでubsan(Undefined Behavior Sanitizer)が有効になっており
* ubsanが有効な状態では未定義動作を検出して`ud2`という命令を出力するから。


実際、関数`func`のアセンブリに`ud2`が出ている。

```nasm
  .globl __Z4hogev
__Z4hogev:
LFB0:
  ud2
```

`ud2`まで処理が進んだらSIGILLで死ぬ。

## 現象2

以下のコードをコンパイル、実行すると無限ループになってスタックを使い切って死ぬ。

```cpp
#include <iostream>

int foo() {
  std::cout << "foo" << std::endl;
}

void bar() {
  std::cout << "bar" << std::endl;
  foo();
}

int main() {
  foo();
}
```

ここで、関数`bar`はどこからも呼ばれていないことに注意。

```sh
$ g++ -O1 test2.cpp                                                                              test2.cpp: In function 'int foo(int)':
test2.cpp:5:1: warning: no return statement in function returning non-void [-Wreturn-type]
 }
 ^

$ ./a.out
foo
bar
foo
bar
(snip)
foo
bar
foo
bar
zsh: segmentation fault  ./a.out
```

呼ばれていないはずの関数`bar`が何度も呼ばれている。

## なぜ？

* 上記のコードを食わすと、関数`foo`にret文がつかなくなる[^1]。
* すると、処理が`bar`に移る。
* `bar`から`foo`がcallされているため、無限に`foo`がcallされてスタックを使い切って死ぬ。

[^1]: なぜかは知らん。それこそ悪魔に聞いてください。

アセンブリも掲載しておく。みやすさのためにc++filtをかけて、かつラベルをいくつか削除してある。

```nasm
	.globl foo()
foo():
LFB1564:
	pushq	%rbx
	movl	$3, %edx
	leaq	lC0(%rip), %rsi
	movq	std::cout@GOTPCREL(%rip), %rbx
	movq	%rbx, %rdi
	call	std::basic_ostream<char, std::char_traits<char> >& std::__ostream_insert<char, std::char_traits<char> >(std::basic_ostream<char, std::char_traits<char> >&, char const*, long)
	movq	%rbx, %rdi
	call	std::basic_ostream<char, std::char_traits<char> >& std::endl<char, std::char_traits<char> >(std::basic_ostream<char, std::char_traits<char> >&)
	.globl bar()
bar():
	pushq	%rbx
LCFI1:
	movl	$3, %edx
	leaq	lC1(%rip), %rsi
	movq	std::cout@GOTPCREL(%rip), %rbx
	movq	%rbx, %rdi
	call	std::basic_ostream<char, std::char_traits<char> >& std::__ostream_insert<char, std::char_traits<char> >(std::basic_ostream<char, std::char_traits<char> >&, char const*, long)
	movq	%rbx, %rdi
	call	std::basic_ostream<char, std::char_traits<char> >& std::endl<char, std::char_traits<char> >(std::basic_ostream<char, std::char_traits<char> >&)
	call	foo()
```

関数`foo`にret文がなく、そのまま`bar`に処理が移ってしまっているのがわかる。


ちなみに、`foo`の中の処理を空っぽにすると`ud2`を吐くので処理はすぐに止まり、かつSIGILLで死ぬ。

```cpp
#include <iostream>

int foo(int m) {
}

void bar() {
  foo(0);
}

int main() {
  foo(0);
}
```

```sh
$ g++ -O1 test3.cpp
test3.cpp: In function 'int foo(int)':
test3.cpp:4:1: warning: no return statement in function returning non-void [-Wreturn-type]
 }
 ^
$ ./a.out
zsh: illegal hardware instruction  ./a.out
```

## まとめ

MacのGCCは、-O1 以上でubsanが有効になり、「返り値があるのに返り値を返さない関数」を書くと、SIGILLで死んだり、最悪無限ループを作ったりするので気をつけましょう。
