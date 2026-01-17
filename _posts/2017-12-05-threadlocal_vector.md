---
layout: post
title: "thread_localとローカルに定義されたstd::vectorの組み合わせ"
tags: [programming, hpc, qiita]
permalink: threadlocal_vector
---

# thread_localとローカルに定義されたstd::vectorの組み合わせ

## はじめに

「C++アドベントカレンダーが埋まらない〜」という現在進行系の悲鳴も聞こえてきたので追加投下します。
## マルチスレッドでローカルに定義されたstd::vector

さて、突然ですが、こんなコードを書いてみます。

```cpp
#include <cstdio>
#include <vector>

void
func(void){
  std::vector<int> v(100);
  printf("0x%x\n",v.data());
}

int
main(void){
#pragma omp parallel for
  for(int i=0;i<24;i++){
    func();
  }
}
```

OpenMPによりマルチスレッド環境下で呼ばれる関数`func`内に、ローカル変数として`std::vector`が宣言されており、確保したメモリ領域の先頭アドレスを表示するプログラムです。

さらに、上記のプログラムを以下のように修正してみます。

```cpp
#include <cstdio>
#include <vector>

void
func(void){
  thread_local std::vector<int> v(100); //スレッドローカル修飾子をつけた
  printf("0x%x\n",v.data());
}

int
main(void){
#pragma omp parallel for
  for(int i=0;i<24;i++){
    func();
  }
}
```

関数`func`内部に出てきた`std::vector`を`thread_local`で修飾したものです。

実行前に以下の点について考えてみてください。

* `thread_local`をつける前と後で結果が変わるか？
* 変わるとしたらなぜか？

これを即答できるような人は続きを読む必要はありません。

そもそも関数内のスタック領域はスレッドごとに別になっているので、既にここにでてくる`std::vector<int> v`そのものはスレッドローカルな変数になっていると言えなくもありません。しかも`std::vector`は領域確保に`malloc`を呼ぶため、それはスレッドローカルな`vector`から呼ばれようがそうでない`vector`から呼ばれようが変わらない気が・・・しません？僕はしました。

以下、上記のソースについて簡単に説明してみようと思います。

## std:vectorとmalloc

この記事を読んでるほとんどの人にとっては釈迦に説法だと思いますが、std::vectorが内部で確保するメモリはヒープに取られます。

つまり、

```cpp
void
func(void){
   int a[100];
}
```

とすると、`a`はスタック領域に確保されますが、

```cpp
void
func(void){
  std::vector<int> v(100);
}
```

とすると、`v`そのものはスタックに積まれますが、`v`が管理するデータはヒープに取られます。念のため、`std::vector`が内部でmallocを呼んでいることを確認しましょう。

```cpp
#include <vector>
int
main(void){
  std::vector<int> v(100);
}
```

gdbで見てみましょう。一度`main`にブレークポイントを置いて、そこまで実行してから`malloc`にブレークポイント置いて、continueしてみます。

```shell-session
$ g++ -g test3.cpp
$ gdb ./a.out
(gdb) b main
Breakpoint 1 at 0x400839: file test3.cpp, line 4.
(gdb) r
Breakpoint 1, main () at test3.cpp:4
4	  std::vector<int> v(100);
(gdb) b malloc
Breakpoint 2 at 0x2aaaaaac03c0 (2 locations)
(gdb) c
Continuing.

Breakpoint 2, 0x00002aaaab51a180 in malloc () from /lib64/libc.so.6
(gdb) 
```

ちゃんと`malloc`が呼ばれました。このように`std::vector`の内部からはmallocが呼ばれ、内部で管理するデータを確保しています。

この`std::vector`の内部をちょっと見てみましょう。ソースを見るのは正直タルいので、gdbで追いかけます。こんなコードを書いてみましょう。

```cpp
#include <cstdio>
#include <vector>

int
main(void){
  std::vector<int> v(100);
  printf("0x%x\n",v.data());
}
```

`std::vector`が確保したデータ領域`v.data()`の先頭アドレスを表示しています。実行するとこうなります。あとでgdbで追いかけるため`-g`をつけておきます。

```shell-session
$ g++ -g test4.cpp
$ ./a.out
0x603010
```

まず、普通に実行すると、`v.data()`のアドレスとして`0x603010`が表示されました。次にgdbで追いかけます。

```shell-session
$ gdb ./a.out
(gdb) b 7
Breakpoint 1 at 0x4008c1: file test4.cpp, line 7.
(gdb) r
Breakpoint 1, main () at test4.cpp:7
7	  printf("0x%x\n",v.data());
(gdb) p v
$1 = {<std::_Vector_base<int, std::allocator<int> >> = {
    _M_impl = {<std::allocator<int>> = {<__gnu_cxx::new_allocator<int>> = {<No data fields>}, <No data fields>}, _M_start = 0x603010, _M_finish = 0x6031a0, 
      _M_end_of_storage = 0x6031a0}}, <No data fields>}

```

`std::vector<int> v`をgdbで表示してみました。`_M_start`はmallocで確保した領域の先頭アドレス(つまり`v.data()`が返すアドレス)、`_M_finish`がデータの最後(`v.end()`が指すところ)、そして`_M_end_of_storage`は`std::vector`が確保している領域の最後のアドレスです。要するに`_M_finish`と`_M_end_of_storage`はそれぞれ`v.size()`と`v.capacity()`に対応していると思えばわかりやすいかと思います。ちゃんと`_M_start`が`0x603010`と、先程表示されたアドレスと同じところを指しているのがわかると思います。

## マルチスレッドでローカルに定義されたstd::vector

さて、冒頭のコードを再掲します。

```cpp
#include <cstdio>
#include <vector>

void
func(void){
  std::vector<int> v(100);
  printf("0x%x\n",v.data());
}

int
main(void){
#pragma omp parallel for
  for(int i=0;i<24;i++){
    func();
  }
}
```

これを24スレッドで実行してみましょう。

```shell-session
$ export OMP_NUM_THREADS=24 
$ g++ -fopenmp test.cpp
$ ./a.out
0x607b60
0x607ea0
0x608040
0x608380
0x6086c0
0x608a00
0x6086c0
0x608a00
0x6081e0
0x607b60
0x607b60
0x607ea0
0x608520
0x608860
0x607d00
0x608380
0x608040
0xb0000a50
0x6079c0
0x607820
0x6086c0
0x608a00
0x6081e0
0xb00008b0
```

同じアドレスが何度も出てきました。`sort -u`してみましょう。

```shell-session
$ ./a.out | sort -u
0x607820
0x6079c0
0x607b60
0x607d00
0x607ea0
0x608040
0xb00008b0
0xb0000a50
0xb40008b0
```

24回mallocが呼ばれたはずですが、確保されたメモリアドレスの種類は9個しかありません(実行のたびに変わります)。ちなみに、`0xb00008b0`みたいに明らかに異質なアドレスは、ヒープではなくmmapで確保されたものです。詳しくは[mallocの動作を追いかける(マルチスレッド編)](https://qiita.com/kaityo256/items/bf6563361c502bbf062e)を参照してください。

これは、一度mallocで確保された領域がfreeにより解放され、次にmallocで呼ばれた時に再利用されるからです。24スレッドがいっきにmallocとfreeをしにいきますが、タイミングによっては先行したスレッドのfreeが終わっており、別のスレッドがmallocしようとした時にその解放された領域がリサイクルされます。

## thread_local指定

さて、複数のスレッドから同時に呼ばれる関数`func`内にローカルに定義された`std::vector`がヒープに確保した領域について、複数のスレッドから同じメモリを読み書きするのは、例えばキャッシュの競合などを起こしそうでイヤです。そこで、`thread_local`修飾子をつけてみましょう。`thread_local`修飾子は、その名の通りスレッドローカルな変数を宣言するためのものです。それが冒頭の`test2.cpp`になります。

```cpp
#include <cstdio>
#include <vector>

void
func(void){
  thread_local std::vector<int> v(100); //スレッドローカル修飾子をつけた
  printf("0x%x\n",v.data());
}

int
main(void){
#pragma omp parallel for
  for(int i=0;i<24;i++){
    func();
  }
}
```

実行すると、今度はアドレスに全く重複がなくなります。

```shell-session
$ g++ -fopenmp -std=c++11 test2.cpp 
$ ./a.out | sort -u 
0x607990
0x607b30
0x607cd0
0x607e70
0x608030
0x6081d0
0x608370
0x608510
0x6086d0
0x608890
0x608a50
0x608c10
0x608dd0
0x608f70
0x609130
0x6092f0
0x6094b0
0x609650
0x609850
0xb00008b0
0xb0000ad0
0xb0000c90
0xb0000e70
0xb0001030
```

## なぜこういうことがおきたか？

別に謎ってほどでも無いのですが、この動作の違いはローカル変数に`thread_local`修飾子がつくと、暗黙に`static`がつくからです。

つまり、

```cpp
void
func(void){
  thread_local std::vector<int> v(100);
...
}
```

は、

```cpp
void
func(void){
  static thread_local std::vector<int> v(100);
...
}
```

と等価です。`static`で宣言されているため、プログラム終了まで`std::vector`のデストラクタが呼ばれません。デストラクタが呼ばれないためmallocで確保されたメモリが解放されず、解放されないメモリは再利用されない、ということです。

これだけだと「それだけ？」と思うかもしれませんが、これはわりと深い闇がある気がします。まず、プログラマが意図しない`static`宣言はバグのもとです。例えばこの関数`func`の引数に、`std::vector`が必要とする要素数が含まれていた場合、つまり

```cpp
void
func(int size){
  thread_local std::vector<int> v(size);
...
}
```

みたいな形になっていた場合、`v`は最初に呼ばれた時にだけ`size`で初期化され、二回目から特に`resize`されないのでバグります。もちろんこういうのがなくても、次に呼ばれた時に、前の処理の結果を保持しているの意図しない挙動でしょう。なので、

```cpp
void
func(int size){
  thread_local std::vector<int> v;
  v.clear();
  v.resize(size);
...
}
```

みたいに書く必要があります。

ちなみに`thread_local`が定義される前は`__thread`修飾子が使われていました。こちらは暗黙の`static`宣言を伴いません。なのでローカル変数に`__thread`をつけると警告が出ます。

```cpp
#include <vector>

int
main(void){
  __thread std::vector<int> v(100);
}
```

```shell-session
$ g++ test5.cpp
test5.cpp: In function 'int main()':
test5.cpp:5:30: warning: function-scope 'v' implicitly auto and declared '__thread' [enabled by default]
   __thread std::vector<int> v(100);
                              ^
```

関数スコープのローカル変数はもともと`auto`なので、デフォルトでスレッドローカルだからつけても意味ないよ、みたいな警告がでます。ちなみにclang++は警告ではなくエラーを吐きます。

```shell-session
$ clang++ test5.cpp 
test5.cpp:5:2: error: '__thread' variables must have global storage
        __thread std::vector<int> v(100);
        ^
1 error generated.
```

僕もこれはエラーで落としてしまって良い気がします。

## まとめ

一応冒頭の答えを書いておくと

* `thread_local`をつけると振る舞いが変わる(メモリアドレスの重複がなくなる)
* 理由は暗黙の`static`宣言がつくから

です。

この、ローカル変数に`thread_local`をつけると、暗黙に`static`がつく奴、知らないと結構ハマる気がします。っていうか僕が`__thread`から`thread_local`への機械的な書き換えをしてバグを入れました。

なぜ`thread_local`にこの仕様が導入されたのかよく知りませんが、暗黙の`static`宣言なんてバグるに決まってるんで、`__thread`みたいに暗黙の`static`宣言を伴わないか、もしくはせめて`-Wall`とかつけたら「暗黙に`static`宣言するけどいい？もしこの警告消したきゃ自分で`static`つけな」くらい言ってくれてもいいのに、と思います。

## 参考

mallocについては、僕が書いた一連のmalloc記事も参考にしてみてください。

* [mallocの動作を追いかける(mmap編)](https://qiita.com/kaityo256/items/9e78b507940b2292bf79)
* [mallocの動作を追いかける(prev_size編)](https://qiita.com/kaityo256/items/2e9a368a5b627daa2ff6)
* [mallocの動作を追いかける(main_arenaとsbrk編)](https://qiita.com/kaityo256/items/94a84dbe922eb5996a27)
* [mallocの動作を追いかける(fastbins編)](https://qiita.com/kaityo256/items/ca54b1b921d8ab96cb82)
* [mallocの動作を追いかける(マルチスレッド編)](https://qiita.com/kaityo256/items/bf6563361c502bbf062e)
