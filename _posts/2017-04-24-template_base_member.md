---
layout: post
title: "テンプレートの派生クラスから親クラスのメンバへのアクセス"
tags: [programming, qiita]
permalink: template_base_member
---

# テンプレートの派生クラスから親クラスのメンバへのアクセス

## TL;DR

テンプレートクラスを派生したクラスから、親クラスのメンバを参照するコードをg++でコンパイルしようとして、以下のようなエラーが出たら、エラーが出ているメンバを`this->`で修飾すること。

```shell-session
test.cpp: In member function 'void Derived<T>::hogehoge()':
test.cpp:13:8: error: there are no arguments to 'hoge' that depend on a template parameter, so a declaration of 'hoge' must be available [-fpermissive]
   hoge();
        ^
test.cpp:13:8: note: (if you use '-fpermissive', G++ will accept your code, but allowing the use of an undeclared name is deprecated)
```

* Q. なぜエラーが起きるの？ 
* A. テンプレートを含む場合の名前解決が通常の場合と異なるから。
* Q. なぜ`this->`をつけるとコンパイルできるの？ 
* A. シンボル名がテンプレートパラメタに依存するようになるため、名前解決が実体化時に行われるようになるから。
* Q. なぜテンプレート派生クラスから親クラスのメンバを参照する時に`this->`をつけなくてもコンパイルできる時があるの？ 
* A. メソッドの引数等にテンプレートパラメタが含まれていると、名前解決が実体化時に行われ、それは通常の名前解決と同じように行われるから。

詳細については「テンプレート　名前解決」でググること。

## この記事について

テンプレートの派生クラスから親クラスのメンバにアクセスしようとして、二段階名前解決(Two Phase Lookup)の仕様にひっかかってコンパイラに怒られるというのは、そうと知っていればFAQっぽいんだけれども[^mata]、テンプレートに慣れていないプログラマ(例えば俺)だと、エラーメッセージだけからはなぜ怒られているのか理解できないし、エラーメッセージでググっても、「`this->`や`using`で修飾しろ」という解決策は書いてあっても、これが「テンプレートの名前解決の問題」であり、「なぜ怒られるか」を理解するのには時間がかかる(かかった)。というわけで、なぜか検索順位の高いQiitaの記事にしておくことで、エラーメッセージでググった人に、有用なキーワードや有用なページへのリンクが見つかるようにするための踏み台記事のつもり[^iiwake]。

[^mata]: C++のちゃんとしたプログラマからは「またこのネタか」とか言われてそう。

[^iiwake]: いや、「ググってすぐにわかるようなことをわざわざQiitaの記事にするなこのキュレーション野郎が」的な意見も見かけるし、その気持もわかるんだけど、正しい検索キーワードになかなかたどり着かないプログラマ(俺とか)もいるんですよ。そういう苦労を少しでも軽減できたら・・・という趣旨です。

## 何が起きるか？

テンプレートクラスを派生させ、その派生クラスから親クラスのメンバにアクセスしようとするとコンパイラに怒られる。こんな感じ。

```cpp
#include <iostream>

template <class T>
struct Base {
  void hoge(void){
    std::cout << "Hoge" << std::endl;
  }
};

template <class T>
struct Derived : public Base <T> {
  void hogehoge(void){
    hoge(); // (1)
  }
};

int
main(void){
  Derived<int> d;
  d.hogehoge();
}
```

これをg++でコンパイルすると、

```shell-session
$ g++ test.cpp
test.cpp: In member function 'void Derived<T>::hogehoge()':
test.cpp:13:8: error: there are no arguments to 'hoge' that depend on a template parameter, so a declaration of 'hoge' must be available [-fpermissive]
   hoge();
        ^
test.cpp:13:8: note: (if you use '-fpermissive', G++ will accept your code, but allowing the use of an undeclared name is deprecated)
```

と怒られる。

## どういう時に起きるか?

典型的には、既存のテンプレートライブラリから派生したクラスを作って、親クラスのメンバ関数を呼んだ時だと思う。例えばこんなの。

```cpp
#include <iostream>
#include <vector>

template <class T>
class myvector : public std::vector<T> {
  public:
    void say_size(void){
      std::cout << "My size is " << size() << std::endl; // ←ここで怒られる
    }
};

int
main(void){
  myvector<int> v;
  v.say_size();
}

```

## どうしてエラーが出るのか？

これは、テンプレートを含むコードの名前解決が二段階で行われるから。まず、シンボル名は、テンプレートパラメタに依存する名前(a name dependent on template parameters)と、依存しない名前(a non-dependent name)に区別される。その上で、

* テンプレートパラメタに依存しない名前の解決は、定義時に行われる
* テンプレートパラメタに依存する名前の解決は、実体化時まで遅延される

という二段階の名前解決(Two Phase Lookup)が行われる。

いま、コード`test.cpp`の(1)の部分の `hoge()`という関数は、プログラマ的には親クラスのメンバを呼んでいるつもりなのだが、コンパイラにとってはテンプレートに全く依存していない(引数などにテンプレートパラメタを含まない)シンボルであるため、親クラスの名前空間を探しにいかず、この例ではグローバル名前空間しか探さない。この時点においてグローバル名前空間に`hoge()`という関数は存在しないため、エラーとなる。他のコンパイラ、例えばclang++　だと、

```shell-session
test.cpp:13:3: error: use of undeclared identifier 'hoge'
                hoge();
                ^
1 error generated.
```

と、単に「hogeは見つからないよ」とだけ言ってくる。

さて、問題のメンバを`this->`で修飾する。

```cpp
template <class T>
struct Derived : public Base <T> {
  void hogehoge(void){
    this->hoge(); // (1)
  }
};

int
main(void){
  Derived<int> d; // (2)
  d.hogehoge();
}
```

ここで`this`は`Derived<T>*`の型を持っているから、`this->`修飾された`hoge()`はテンプレートパラメタに依存するシンボルとなるため、名前解決はテンプレートの実体化の時(2)まで棚上げされる。実体化する時には、親テンプレートクラスも実体化しているので、通常の親クラス、派生クラスの場合と同様に名前解決が可能となる。

## なぜテンプレート派生クラスから親クラスのメンバが解決できないか

なぜ二段階の解決をしており、テンプレートの定義時に親クラスのメンバを探すことができないかの理由については、GCCのオンラインドキュメントの[13.7.2 Name Lookup, Templates, and Accessing Members of Base Classes](https://gcc.gnu.org/onlinedocs/gcc/Name-lookup.html)がわかりやすい。結論から言うと、テンプレートの特殊化のため、テンプレートの定義時点ではどの関数を呼ぶべきかわからないから。

先程の例だと、

```cpp
template <class T>
struct Base {
  void hoge(void){
    std::cout << "Hoge" << std::endl;
  }
};

template <class T>
struct Derived : public Base <T> {
  void hogehoge(void){
    hoge(); // (1)
  }
};
```
というコードで、親クラスである`Base<T>::hoge(void)`を探しにいって欲しい気がする。しかし、テンプレートの特殊化により、`Derived`の宣言時点では`Base<T>::hoge(void)`がどのような関数になるかはわからないし、そもそも存在も保証されない。

例えば、`Derived`の定義の後で

```cpp
template <> struct Base <int> {};
```

と書かれてしまうと、テンプレートパラメタとして`int`を与えて実体化した`Base<int>`は`hoge`を持たない。このようにテンプレートが定義された時点では、親クラスが実際にどういう形になるかわからないため、この時点ではグローバルスコープしか見に行けない。

しかし、テンプレートが実体化される時には、全てのテンプレートパラメタの型が分かっており、かつ特殊化についての情報もあるため、通常の親クラス、派生クラスと同様の名前解決がされる。従って、

```cpp
#include <iostream>

template <class T>
struct Base {
  void hoge(void){
    std::cout << "Hoge" << std::endl;
  }
};

template <class T>
struct Derived : public Base <T> {
  void hogehoge(void){
    this->hoge(); //この時点ではhoge()を探しにいかない。
  }
};

template <> struct Base <int> {};

int
main(void){
  Derived<int> d;
  d.hogehoge(); //ここではじめてhoge()の名前解決が行われ、特殊化により親クラスにhoge()が無いことがわかる。
}
```

と、実体化の時になってはじめて親クラスに`hoge`が無いことがわかるコードを書いても、

```shell-session
test2.cpp: In instantiation of 'void Derived<T>::hogehoge() [with T = int]':
test2.cpp:22:13:   required from here
test2.cpp:13:9: error: 'struct Derived<int>' has no member named 'hoge'
   this->hoge();
   ~~~~~~^~~~
```

と、「Tにintを与えて実体化しようとした`void Derived<T>::hogehoge()`の中で参照しようとした`hoge`の定義が見つからないよ」というエラーが出る。

## まとめ

テンプレートの名前解決は二段階で、テンプレートパラメタに依存するシンボルの解決は実体化時、それ以外は定義時。それを知ってから、もう一度エラーメッセージを眺める。

```shell-session
test.cpp: In member function 'void Derived<T>::hogehoge()':
test.cpp:13:8: error: there are no arguments to 'hoge' that depend on a template parameter, so a declaration of 'hoge' must be available [-fpermissive]
   hoge();
        ^
test.cpp:13:8: note: (if you use '-fpermissive', G++ will accept your code, but allowing the use of an undeclared name is deprecated)
```

そしたら、「`hoge`にはテンプレートパラメタに依存する引数がないから、この時点で`hoge`の定義が見つからないといけないよ」というエラーだったとわかる。それはいいんだけど、もう少しエラーメッセージを親切にしてくれないかなぁ。

[この記事](http://d.hatena.ne.jp/tkng/20110419/1303176182)によれば、clangで同様なエラーを吐く際には

```shell-session
note: must qualify identifier to find this declaration in dependent base class
```

というノートがついてたらしいんだけど、今手元のclang++で試してもこういうのは出ないみたい。

名前解決といえば[ADL(Argument-dependent name lookup)](http://ezoeryou.github.io/cpp-book/C++11-Syntax-and-Feature.xhtml#basic.lookup.argdep)という特別ルールもあるっぽくて、ややこしさが倍増している。うーん。

## 参考にしたURL

* C++11の文法と機能(C++11: Syntax and Feature) [14.5.3 依存名の名前解決](http://ezoeryou.github.io/cpp-book/C++11-Syntax-and-Feature.xhtml#dependent-name-resolution)
* GCCのオンラインドキュメント [13.7.2 Name Lookup, Templates, and Accessing Members of Base Classes](https://gcc.gnu.org/onlinedocs/gcc/Name-lookup.html)
* Microsoft Developer Network [テンプレートと名前解決](https://msdn.microsoft.com/ja-jp/library/19cbwccf.aspx)
* [[C++] テンプレートクラスの内部クラスの継承における基底クラスのメンバ変数検索](http://jumble-note.blogspot.jp/2015/01/c.html)
