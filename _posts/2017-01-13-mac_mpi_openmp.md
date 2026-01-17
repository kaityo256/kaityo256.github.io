---
layout: post
title: "MacにMPI+OpenMPハイブリッド並列環境を構築する"
tags: [mac, hpc, qiita]
permalink: mac_mpi_openmp
---

# MacにMPI+OpenMPハイブリッド並列環境を構築する

## はじめに

Macに入っているgcc/g++はclang/clang++であり、Macのclangは現時点(2017年1月13日)ではOpenMPに対応していない。

したがってMacでOpenMPに対応したC/C++コンパイラを手に入れるには、

* LLVM公式サイトからOpenMPに対応したclangを持ってくる
* GNUのgcc/g++を使う

の２つの方法がある。後者の方が楽だが、そうすると例えばbrewでopenmpiをインストールした場合、mpiccやmpic++がclangやclang++を見に行ってしまう。これをなんとかするためには、

* OpenMPIの公式サイトからソースを持ってきて、コンパイラとしてGNUのgcc/g++を使うように設定してビルドする
* mpicc/mpic++を使うのをあきらめる

の2つの方法がある。

ポリシーに個人差はあると思われるが、僕の経験では

* コンパイラとしてGNUのgcc/g++を使う
* MPIライブラリとしてOpenMPIを入れるが、mpicc/mpic++は使わない

というソリューションが一番楽だったので、その方法をまとめる。

なお、環境はmacOS Sierra 10.12.3。

## インストールと設定手順。

gccとopenmpiをbrewで入れる。まずgcc。

```shell-session
$ brew install gcc --without-multilib
```

記事執筆時点ではgccとして6.3.0が入る。なお、デフォルトではmulti-libオプションが付加されてしまう。multi-libというのは他のアーキテクチャのためのバイナリを作成する機能で、これを設定すると OpenMPの動作に問題があるらしい。実際、
`--without-multlib`をつけないでインストールすると、こんなことを言われる。

```shell-session
GCC has been built with multilib support. Notably, OpenMP may not work:
  https://gcc.gnu.org/bugzilla/show_bug.cgi?id=60670
If you need OpenMP support you may want to
  brew reinstall gcc --without-multilib
```

このオプションをつけなかった場合でもOpenMPは動いたりするようなのだが、妙な不具合があると嫌なので、`--without-multilib`オプションをつけておくと良い。

/usr/local/binにgcc-6やg++-6という名前でシンボリックリンクが貼られるので、さらにgcc、g++という別名を与える。

```shell-session
$ cd /usr/local/bin
$ ln -s gcc-6 gcc
$ ln -s g++-6 g++
```

さらに、/usr/local/binを先に見るようにパスを通す。

```shell-session
$ export PATH=/usr/local/bin:$PATH
```

動作確認したら.zshrcとかに入れておこう。

次はopenmpi。

```shell-session
$ brew install openmpi --with-cxx-bindings
```

MPIのC++ bindingsはMPI3.0からdeprecatedなのだが、まだ使ってるコードがあったので指定した。ここまでで設定は完了。

## コンパイル

現時点では、mpiccやmpic++がclang/clang++を見に行ってしまう。

```shell-session
$ mpicc -v
Apple LLVM version 8.0.0 (clang-800.0.42.1)
Target: x86_64-apple-darwin16.3.0
Thread model: posix
InstalledDir: /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin
```

で、これをなんとかする方法もないわけではないが、mpiccやmpic++はどうせインクルードファイルとライブラリの管理しかしてないので、そこを手で書いてしまう。


例えば以下のようなMPI/OpenMPハイブリッド並列コードを考える。

```cpp
#include <stdio.h>
#include <omp.h>
#include <mpi.h>
int
main(int argc, char** argv){
  int rank, size;
  MPI_Init(&argc, &argv);
  MPI_Comm_rank(MPI_COMM_WORLD,&rank);
  MPI_Comm_size(MPI_COMM_WORLD,&size);
  const int num_threads = omp_get_max_threads();
#pragma omp parallel for
  for(int i=0;i<num_threads;i++){
    printf("MPI rank = %d/%d;thread d = %d/%d\n",rank,size,omp_get_thread_num(),num_threads);
  }
  MPI_Finalize();
}
```

これは、以下のようにしてコンパイル、リンクできる。

```shell-session
$ g++ -fopenmp -I/usr/local/opt/open-mpi/include -L/usr/local/opt/open-mpi/lib -lmpi hybrid.cc
```

いちいち-Iとか-Lとか指定するのは面倒だと思う人がいるかもしれないが、どうせmakefileかなにか使ってるでしょ？そこに、

```mf
CPPFLAGS=-fopenmp -I/usr/local/opt/open-mpi/include
LDFLAGS= -L/usr/local/opt/open-mpi/lib -lmpi
```

って書けばいいことなので、特に不便は感じない。[^1]

もし、コンパイラが常にMPI関連のインクルードパスやライブラリパスを見に行ってもかまわない、ということであれば、`.zshrc`か何かに以下の記述をすれば良い。

```zsh
export MPIPATH=/usr/local/opt/open-mpi
export C_INCLUDE_PATH=$MPIPATH/include:$C_INCLUDE_PATH
export CPLUS_INCLUDE_PATH=$MPIPATH/include:$CPLUS_INCLUDE_PATH
export LIBRARY_PATH=$MPIPATH/lib:$LIBRARY_PATH
```

これでいちいちmakefileにパスを設定しなくても、`g++ test.cpp -lmpi`とかだけでMPIプログラムをコンパイルできるようになる。

さて、実行して、たしかにMPI/OpenMPハイブリッド並列ができているか確認する。

```shell-session
$ OMP_NUM_THREADS=3 mpirun -np 2 ./a.out  # 3スレッド*2プロセス
MPI rank = 0/2;thread d = 0/3
MPI rank = 0/2;thread d = 1/3
MPI rank = 0/2;thread d = 2/3
MPI rank = 1/2;thread d = 0/3
MPI rank = 1/2;thread d = 2/3
MPI rank = 1/2;thread d = 1/3

$ OMP_NUM_THREADS=2 mpirun -np 3 ./a.out # 2スレッド*3プロセス
MPI rank = 0/3;thread d = 0/2
MPI rank = 0/3;thread d = 1/2
MPI rank = 1/3;thread d = 0/2
MPI rank = 1/3;thread d = 1/2
MPI rank = 2/3;thread d = 0/2
MPI rank = 2/3;thread d = 1/2
```

## まとめ

結局インストール＋設定でやったことは

```shell-session
$ brew install gcc
$ brew install openmpi
$ cd /usr/local/bin
$ ln -s gcc-6 gcc
$ ln -s g++-6 g++
$ export PATH=/usr/local/bin:$PATH
```

だけなので楽ちん。その代わりmpicc/mpic++が使えないけど、makefileに

```mf
CPPFLAGS=-fopenmp -I/usr/local/opt/open-mpi/include
LDFLAGS= -L/usr/local/opt/open-mpi/lib -lmpi
```

って書くか、`.zshrc`に

```zsh
export MPIPATH=/usr/local/opt/open-mpi
export C_INCLUDE_PATH=$MPIPATH/include:$C_INCLUDE_PATH
export CPLUS_INCLUDE_PATH=$MPIPATH/include:$CPLUS_INCLUDE_PATH
export LIBRARY_PATH=$MPIPATH/lib:$LIBRARY_PATH
```

と書くだけなので、これが一番楽なんじゃないかなぁ。

## 追記(2017/8/17)

この記事の方法だと、brewをアップデートしてGCCがVer. 6からVer. 7になった時に gccやg++のシンボリックリンクが切れて、clang/clang++の方を見に行ってしまいますね。

もう一度

```shell-session
$ cd /usr/local/bin
$ rm gcc
$ ln -s gcc-7 gcc
$ rm g++
$ ln -s g++-7 g++
```

ってやり直せばいいんだけど、やっぱりあまりよくないかなぁ・・・

[^1]: 僕は、こういう環境依存するところは例えばmakefile.optとかに書いて、makefile本体からは`-include makefile.opt`としてインクルードするようにしておいて、makefileはリポジトリに入れ、makefile.optはignore指定している。makefile内で環境判定するより楽な気がする。
