---
layout: post
title: "MacのC++11環境においてグローバル名前空間でwaitがぶつかる"
tags: [mac, qiita]
permalink: mac_wait_conflict
---

# MacのC++11環境においてグローバル名前空間でwaitがぶつかる

## はじめに

Macの`g++ -std=c++11`と`clang++`で、グローバルな名前空間で`wait`というシンボルが、 `/usr/include/sys/wait.h`に定義されているwaitとぶつかったことの覚書。

## 環境

* g++ (MacPorts gcc49 4.9.4_0) 4.9.4
* clang++ Apple LLVM version 7.0.2 (clang-700.1.81)

## 現象

MacOSXのターミナルで、以下のようなソースコードをコンパイルする。

```cpp
#include <iostream>
int wait; //←これがエラーになる
```

すると、g++では`-std=c++11`をつけた時、clang++ではそのまま食わすとエラーとなる。

```shell-session
$ g++ -c test.cpp # 問題無くコンパイルできる

$ g++ -std=c++11 -c test.cpp # エラーになる
test.cpp:2:5: error: 'int wait' redeclared as different kind of symbol
 int wait;
     ^
In file included from /usr/include/stdlib.h:65:0,
                 from /opt/local/include/gcc49/c++/cstdlib:72,
                 from /opt/local/include/gcc49/c++/ext/string_conversions.h:41,
                 from /opt/local/include/gcc49/c++/bits/basic_string.h:2848,
                 from /opt/local/include/gcc49/c++/string:52,
                 from /opt/local/include/gcc49/c++/bits/locale_classes.h:40,
                 from /opt/local/include/gcc49/c++/bits/ios_base.h:41,
                 from /opt/local/include/gcc49/c++/ios:42,
                 from /opt/local/include/gcc49/c++/ostream:38,
                 from /opt/local/include/gcc49/c++/iostream:39,
                 from test.cpp:1:
/usr/include/sys/wait.h:248:7: note: previous declaration 'pid_t wait(int*)'
 pid_t wait(int *) __DARWIN_ALIAS_C(wait);
       ^

$ clang++ -c test.cpp #エラーになる
test.cpp:2:5: error: redefinition of 'wait' as different kind of symbol
int wait;
    ^
/usr/include/sys/wait.h:248:7: note: previous definition is here
pid_t   wait(int *) __DARWIN_ALIAS_C(wait);
        ^
1 error generated.
```

他の環境(LinuxやCygwin)ではエラーにならないが、'wait.h'をインクルードすればもちろんぶつかる。

```cpp
#include <wait.h>
int wait; // ← MacOSX 以外でもエラーになる
```

## まとめ

(少なくともうちの)MacOSXでは、C++11環境に限り`iostream`をインクルードすると`wait.h`がインクルードされ、結果として`wait`がグローバル名前空間に放り出されるらしい。他のLinuxやCygwinなんかではこの問題が起きない。なにこれ？うちだけ？
