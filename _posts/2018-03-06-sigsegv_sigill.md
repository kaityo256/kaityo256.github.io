---
layout: post
title: "SIGSEGVとSIGILLのあいだ"
tags: [programming, mac, qiita]
permalink: sigsegv_sigill
---

# SIGSEGVとSIGILLのあいだ

## はじめに

[この記事](https://qiita.com/kaityo256/items/ae0e1247844570cf0265)で、なぜかメモリの不正アクセスをするとSIGILLが出るコードを見つけたのだけれど、その後、調査を進めて、

```test.cpp
int main(void) {
  __asm__("movl  $0, 0(%rbp,%rdx,1)");
}
```

の一行でSIGILLが出ることがわかった。ここで問題となるのは`%rdx`の値で、これが小さいとSIGSEGV、大きいとSIGILLになるっぽい。`%rdx`のかわりに`%rax`を使ってみよう。

```test1.cpp
int main(void) {
  __asm__("movq  $10000000, %rax");
  __asm__("movl  $0, 0(%rbp,%rdx,1)");
}
```

```shell-session
$ g++ test1.cpp
$ ./a.out
zsh: segmentation fault  ./a.out
```

```test2.cpp
int main(void) {
  __asm__("movq  $10000000000, %rax");
  __asm__("movl  $0, 0(%rbp,%rax,1)");
}
```

```shell-session
$ g++ test2.cpp
$ ./a.out
zsh: illegal hardware instruction  ./a.out
```

というわけで`%rax`に`$10000000`が入ってるとSIGSEGV、`$10000000000`が入ってるとSIGILLが出てるので、その間に境目があるっぽい。

というわけで二分探索でどのあたりに境界があるか調べてみる。

## コード

```test.rb
def output(n)
  f = open("test.cpp","w")
  f.puts "int main(void) {"
  f.puts "__asm__(\"movq  $#{n}, %rax\");"
  f.puts "__asm__(\"movl  $0, 0(%rbp,%rax,1)\");"
  f.puts "}"
  f.close
  system("g++ test.cpp")
end

def search
  s = 10000000
  e = 10000000000
  while (e != s && e != s+1)
    n = (e+s)/2
    output(n)
    `./a.out`
    if $?.to_i == 11
      s = n
      puts "#{n} SIGSEGV"
    else
      e = n
      puts "#{n} SIGILL"
    end
  end
end

search
```

Rubyで外部コマンドを実行した際、エラー終了した時のシグナルは`$?.to_i`で取れる。なんとなく`$?.exitstatus`を使いたくなるが、こちらは正常終了の返り値で、異常終了した場合はnilになるので注意。

## 実行結果

```shell-session
$ ruby test.rb  
5005000000 SIGILL
2507500000 SIGSEGV
3756250000 SIGSEGV
4380625000 SIGSEGV
4692812500 SIGILL
(snip)
4670126427 SIGILL
4670126424 SIGSEGV
4670126425 SIGILL
```

というわけで、4670126424がSIGSEGV、4670126425でSIGILLになった。ただし、実行するたびに結果が微妙に変わる。

また、`movl  $0, 0(%rbp,%rax,1)`を`movl  $0, 0(%rbp,%rax,2)`など、スケールファクターを変えると、その分SIGSEGVとSIGILLの間の値も変わる。

movlのスケールファクターを2にするとこんな感じ。

```
$ ruby test.rb  
5005000000 SIGILL
(snip)
2361903002 SIGSEGV
2361903003 SIGILL
```

概ね半分になった。スケールファクターを4にしてみると境目が1168413942に、8にすると593619583と、だいたいスケールファクター*境目が一定っぽい。

スタックサイズと関係するのかと思ったが、limitで値を変えてみても影響はないようだ。

## まとめ

Macで不正なmovl命令を出すことでSIGILLを出す現象を調べてみた。メモリの不正アクセスなのだから、SIGSEGVかSIGBUSを出すのが妥当だと思うのだが、なぜSIGILLを出すのか理解不能。Macでは[SIGSEGVとSIGBUSの区別がいいかげん](https://togetter.com/li/253717)という指摘もあり、それに関連するのかと思ったが、さすがにSIGILLを出すのは変だと思うのだが。

## 関連記事

* [x86でbus errorを起こす](https://qiita.com/kaityo256/items/fadffae00e517efbc8aa)
