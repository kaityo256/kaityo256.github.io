---
layout: post
title: "C言語と文字列に関するあれこれ"
tags: [programming, qiita]
permalink: string_of_c
---

# C言語と文字列に関するあれこれ

## はじめに

ちょっと前にこんなコードが話題になりました(オリジナルから少し変更してあります)。

```c
  char str1[8] = "hoge ";
  char str2[8] = "fuga ";
  char *str3 = strcat(str1,str2);
```

C言語を知っている人が見れば「あ、これはC言語をよく知らない人が書いたな」ということがわかるかと思います。これ、もちろん駄目なコードなわけですけど、ちゃんとプログラムを習わずに自己流でプログラマになり、コードレビューなどがない会社に就職してしまったりすると、このままになってしまうかもしれません。私も友人に指摘されるまでしばらくこれに似たコードを書いていた経験があり、決して他人事ではありません。

そもそも、C言語における文字列リテラルって、結構いろいろ面倒だったりします。というわけで、この機会に文字列リテラルの扱いについてあれこれ書いてみます。

## 例1: グローバルな宣言

文字列の宣言には、以下の二通りの方法があります。

```c
char *str = "hoge";
char str2[] = "fuga";
```

上記二つの宣言の違いについて、あやふやな人は結構いるんじゃないでしょうか。

まずすぐにわかる違いは、両者は`sizeof`が返す値が違います。

```c
#include <stdio.h>

char *str = "hoge";
char str2[] = "fuga";

int main(){
  printf("sizeof(str)  = %d\n",sizeof(str));
  printf("sizeof(str2) = %d\n",sizeof(str2));
}
```

```sh
$ gcc test1.c
$ ./a.out
sizeof(str)  = 8
sizeof(str2) = 5
```

また、`str2`の指す文字列の中身は変更できますが、`str`の指す中身は変更できません。

```c
#include <stdio.h>

char *str = "hoge";
char str2[] = "fuga";

int main(){
  str2[1] = '!';
  puts(str2);
  str[1] = '!'; // ここで実行時エラーになる
  puts(str);
}
```

```sh
$ gcc test2.c
$ ./a.out
f!ga
zsh: segmentation fault (core dumped)  ./a.out
```

ちなみに、上記のコードをMac OSXで実行すると、SIGSEGVではなく、なぜかSIGBUSを出します。

```sh
$ ./a.out
f!ga
zsh: bus error  ./a.out
```

さて、なぜ`str`が書き込み不可能で、`str2`が書き込み可能かといえば、コンパイルする時に、`str`の指す先を書き込み不可のメモリに配置し、`str2`の指す先を書き込み可のメモリに配置するからです。

先程のコードのアセンブリを出してみましょう。

```sh
$ gcc -S test2.c
```

```nasm
        .file   "test2.c"
        .globl  str
        .section        .rodata
.LC0:
        .string "hoge"
        .data
        .align 8
        .type   str, @object
        .size   str, 8
str:
        .quad   .LC0
        .globl  str2
        .type   str2, @object
        .size   str2, 5
str2:
        .string "fuga"

        .text
        .globl  main
        .type   main, @function
main:
(snip)
```

これを見ると、`str`のサイズが8で、`str2`のサイズが5だとか書いてあるのですが、それより重要なのはセクションです。文字列リテラル"test"は、`.section .rodata`とあるセクションの下に、"hoge"は`.data`セクションの下にあります。`.rodata`とはRead Only Dataのことで、「ここにあるデータは、読み取り専用メモリにおいてくださいよ」とOSにお願いする文章です。`.data`は「読み書き可能なメモリにおいてください」という意味です。

ついでに、`.text`はプログラムを置くところで、「書き込み不可、実行可能なメモリにおいてください」とOSに依頼します。

さて、`str`の指す先に書き込みしようとすると実行時エラーが起きるのは、コンパイラが「書き込み不可のメモリにおいてください」と(リンカを通じて)OSに頼んでいるからでした。なので、そこを修正すれば書き込み可能になります。

先程の`.section        .rodata`を`.data`に書き換えてみましょう。

まず、先程吐いたアセンブリをそのまま実行ファイルにしても、実行時エラーが出ることを確認します。

```sh
$ gcc test2.s 
$ ./a.out
f!ga
zsh: segmentation fault (core dumped)  ./a.out
```

次に、`test2.s`のセクションを書き換えます。

```diff
-	.section	.rodata
+        .data
```

そしてまたリンクして実行してみましょう。

```sh
$ gcc test2.s
$ ./a.out
f!ga
h!ge
```

無事に実行できました。

## 例2: ローカルな宣言

先程、文字列リテラルをグローバル変数として宣言しました。
では、ローカル変数として宣言したらどうなるでしょうか。こんな感じです。

```c
void func(){
  char *str = "hoge";
  char str2[] = "fuga";
}
```

ここで、それぞれの文字列リテラル`hoge`と`fuga`がどこにどうやって配置されるかを即答できる人はそんなにいないんじゃないかと思います(たくさんいたらごめんなさい)。

とりあえずアセンブリを見てみましょう。

```sh
$ gcc -S test3.c
```

```nasm
        .file   "test3.c"
        .section        .rodata
.LC0:
        .string "hoge"
        .text
        .globl  func
        .type   func, @function
func:
.LFB0:
        .cfi_startproc
        pushq   %rbp
        .cfi_def_cfa_offset 16
        .cfi_offset 6, -16
        movq    %rsp, %rbp
        .cfi_def_cfa_register 6
        movq    $.LC0, -8(%rbp)
        movl    $1634170214, -16(%rbp)
        movb    $0, -12(%rbp)
        popq    %rbp
        .cfi_def_cfa 7, 8
        ret
        .cfi_endproc
```

`str`の指す先の`hoge`が`.section        .rodata`セクションに置かれており、グローバル変数と同じ扱いなのがわかるかと思います。そして、アセンブリには`fuga`の文字がありません。

実は`fuga`は、アセンブリに即値として入っています。ここです。

```nasm
        movl    $1634170214, -16(%rbp)
```

`fuga`のアスキーコードはこうなっています、

```
f:102
u:117
g:103
a:97
```

これをまとめましょう。

```rb
("a".ord << 24) + ("g".ord << 16) + ("u".ord << 8) + "f".ord
## => 1634170214
```

アセンブリに埋め込まれていた即値が出てきました。

さて、`hoge`の方は、それを指すポインタ`char *str`はローカル変数ですが、そこが指すアドレスはグローバル変数なので、関数の外からも参照することができます。

```c
#include <stdio.h>

char* func(){
  char *str = "hoge";
  return str;
}

int main(){
  char *s = func();
  puts(s);
}
```

```sh
$ gcc test4.c
$ ./a.out
hoge
```

しかし、`char []`で宣言すると、文字列リテラルの実体がスタックに積まれるため、そのアドレスは関数の外からみると意味のないものになります。

```c
#include <stdio.h>

char* func(){
  char str[] = "fuga";
  return str;
}

int main(){
  char *s = func();
  puts(s);
}
```

なのでコンパイラもちゃんと怒りますし、無理やり実行しても意味のない文字列が表示されます。

```sh
$ gcc test5.c
test5.c: 関数 ‘func’ 内:
test5.c:5:3: 警告: 関数が局所変数のアドレスを返します [-Wreturn-local-addr]
   return str;
   ^

$ ./a.out
???5?
```

## まとめ

というわけで文字列リテラルについて、`char *str`で宣言した場合と`char str[]`で宣言した場合、またそれがグローバル変数とローカル変数にした場合のそれぞれについて、どんなふうに扱われるかつらつら書いてみました。C言語における文字列の扱いは面倒で、多くのセキュリティホールを生み出したため、後から出てきた言語は文字列をイミュータブルにすることで対応することになります。

まぁなんというか、冒頭のコードを公開していたサイトは別にいろいろ問題があるということは十分承知しつつ、それとは別に新人プログラマがちょっとやばいコードを公開して袋叩きにあって、そのプログラマがもうアウトプットする気力を失ってしまったりするのもたまに見かけるので、もう少し優しいインターネッツになるといいですね。

## 2018年10月20日追記： constについて

コメント欄にて、「文字列リテラルにはconstをつけるべきである」という指摘がありました。これはそのとおりで、以下のコードを`gcc`コンパイルしても怒られませんが、`g++`でコンパイルすると怒られます。

```c
char *str = "hoge";
```

```sh
$ gcc -c test6.c # => 怒らない
$ g++ -c test6.c
test6.c:1:13: 警告: deprecated conversion from string constant to ‘char*’ [-Wwrite-strings]
 char *str = "hoge";
             ^
```

また、`const`指定すると、`char*`で宣言した場合、`char []`で宣言した場合の両方とも、文字列にアクセスしようとするとコンパイラに怒られます。

```c
#include <stdio.h>

const char *str = "hoge";
const char str2[] = "fuga";

int main(){
  str2[1] = '!';
  puts(str2);
  str[1] = '!';
  puts(str);
}
```

```sh
$ gcc test7.c
test7.c: 関数 ‘main’ 内:
test7.c:7:3: エラー: 読み取り専用位置 ‘str2[1]’ への代入です
   str2[1] = '!';
   ^
test7.c:9:3: エラー: 読み取り専用位置 ‘*(str + 1u)’ への代入です
   str[1] = '!';
   ^
```

また、グローバル変数の文字列リテラルを`char []`で受けた場合、データが書き込み可能な`.data`セクションに保存されましたが、`const`をつけると、書き込み不可のセクションに保存されます。

```c
#include <stdio.h>

char str[] = "hoge";        // => .data セクションへ
const char str2[] = "fuga"; // => .section   .rodataへ

int main(){
  puts(str);
  puts(str2);
}
```

`gcc -S`してみましょう。

```nasm
        .file   "test8.c"
        .globl  str
        .data
        .type   str, @object
        .size   str, 5
str:
        .string "hoge"
        .globl  str2
        .section        .rodata
        .type   str2, @object
        .size   str2, 5
str2:
        .string "fuga"
```

`hoge`は書き込み可能な`.data`セクションへ、`fuga`は書き込み不可の`.section .rodata`セクションへ配置されました。

```c
const char str2[] = "fuga"; // => .section   .rodataへ

int main(){
  char *tmp = (char*)str2;
  tmp[1] = '!'; //SIGSEGV
}
```

などとキャストで`const`を外しても、文字列リテラルの場所はOSが保護しているために、そこを触ろうとするとSIGSEGVで落ちます。

では、ローカル変数ではどうでしょうか。


```c
#include <stdio.h>

void func(int index){
  char a[1];
  const char str[] = "hoge";
  // str[1] = '!';  // <- これはコンパイラに怒られる
  a[index] = '!';
  puts(str);
}

int main(){
  func(-14);
}
```

関数`func`の中に`const char []`で宣言された文字列リテラルがあります。`const`宣言されているため、この中を触ろうとするとコンパイラに怒られますが、この文字列リテラルのデータはスタックに積まれており、スタックは読み書きできるメモリ領域であるため、間接的に触ることはできます。この例では、近くにある配列のバッファアンダーフローを使って文字列リテラルを書き換えています。

```sh
$ gcc test9.c
$ ./a.out
h!ge   # const宣言された文字列リテラルの中身が書き換えられた。
```

ちなみに、`const char*`で宣言した場合は、文字列リテラルはスタックではなくグローバル領域の書き込み不可の場所に配置されるため、触ろうとするとSIGSEGVで落ちます(MacだとなぜかSIGBUS)。

というわけでまとめると、グローバルに宣言された文字列リテラルを`char []`で受けると読み書き可能なメモリに配置されますが、`const`宣言をすると書き込み不可の領域に配置されます。しかし、ローカルに宣言した場合は`const char []`と`const`をつけても、読み書き可能なメモリに置かれます。

これがC言語の言語仕様なのか、それともコンパイラが気を利かせるのがデフォになってるのかは知りません・・・
