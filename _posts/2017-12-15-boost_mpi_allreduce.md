---
layout: post
title: "Boost MPI Libraryでstd::vectorをall_reduceする"
tags: [programming, hpc, qiita]
permalink: boost_mpi_allreduce
---

# Boost MPI Libraryでstd::vectorをall_reduceする

これは[MPI Advent Calendar 2017](https://adventar.org/calendars/2548)の17日目の記事かもしれません。

## はじめに

14日目の記事、[MPIでstd::vectorをやりとりする](https://qiita.com/kaityo256/items/90f1b3c879e1ec123740)で、「C++っぽくMPIを使うとしたらどうするべきか？」みたいなことを書きました。Boost MPI Libraryはその一つの答えになっています。本稿では、Boost MPI Libraryを使ってstd::vectorをallreduceしてみます。

## Boost::MPIのインストール

Boostのインストールもわりと面倒な時がありますが、Boost::MPIもいれるとなるとさらに面倒になります。とりあえずbrewで入れてみます。

```shell-session
$ brew install boost
$ brew install boost-mpi
```

ただし、現時点(2017年12月14日)かつMac OS X (High Sierra 10.13.2)及びHomebrew 1.4.0という環境では、Boostの1.65.1では「libboost_serialization.dylibが無い」といって怒られてしまいます。僕の環境では、少し古い1.64.0_1があったので、そっちに変えたら上手くいきました。

```shell-session
$ brew switch boost 1.64.0_1
```

古い情報ではboostのインストール時に`--with-mpi`をつけろとか`--without-single`がどうとか書いてありましたが、正直よくわかりません。僕の環境では上記でうまくいきました。

## Boost::MPIのビルド環境

Boost::MPIをビルドするにはパスをいろいろ通さないといけません。こんな感じで良いかと思います。

```shell-session
export MPIPATH=/usr/local/opt/open-mpi
export BOOST_PATH=/usr/local/opt/boost
export BOOST_MPI_PATH=/usr/local/opt/boost-mpi
export CPLUS_INCLUDE_PATH=$BOOST_PATH/include:$MPIPATH/include:$CPLUS_INCLUDE_PATH
export C_INCLUDE_PATH=$CPLUS_INCLUDE_PATH
export LIBRARY_PATH=$BOOST_MPI_PATH/lib:$MPIPATH/lib:$LIBRARY_PATH
```

環境に併せて適宜対応してください。

以下のようなコードを書いてみます。

```cpp
#include <cstdio>
#include <vector>
#include <boost/mpi/environment.hpp>
#include <boost/mpi/communicator.hpp>

int
main(int argc, char**argv){
  boost::mpi::environment env(argc, argv);
  boost::mpi::communicator world;
  printf("%d/%d\n",world.rank(), world.size());
}
```

以下のようにビルド、実行し、以下のような表示がでればインストールに成功しています。

```shell-session
$ g++ test.cpp -lmpi -lmpi_cxx -lboost_mpi 
$ mpirun --oversubscribe -np 4 ./a.out 
0/4
1/4
2/4
3/4
```

`--oversubscribe`オプションは、物理コアよりも多いプロセスを立ち上げる時に必要です。昔はいらなかった気がしますが、いまはこれなしに物理コアより多いプロセスを立ち上げようとすると

```shell-session
$ mpirun -np 4 ./a.out
--------------------------------------------------------------------------
There are not enough slots available in the system to satisfy the 4 slots
that were requested by the application:
  ./a.out

Either request fewer slots for your application, or make more slots available
for use.
--------------------------------------------------------------------------
```

みたいに言われてしまうようです。

## boost::mpi::all_reduce

普通の型のall_reduceは直感的にできます。

```cpp
#include <cstdio>
#include <boost/mpi/environment.hpp>
#include <boost/mpi/communicator.hpp>
#include <boost/mpi/collectives.hpp>

int
main(int argc, char**argv){
  boost::mpi::environment env(argc, argv);
  boost::mpi::communicator world;
  const int rank = world.rank();
  auto r = boost::mpi::all_reduce(world, rank, std::plus<int>());
  if(rank == 0){
    std::cout << r << std::endl;
  }
}
```

```shell-session
$ g++ reduce_int.cpp -lmpi -lmpi_cxx -lboost_mpi

$ mpirun --oversubscribe -np 4 ./a.out
4

$ mpirun --oversubscribe -np 10 ./a.out
45

```

特筆すべきは、`boost::mpi::all_reduce`の第三引数に関数オブジェクトを渡せる点です。これにより、MPIに実装されていない任意の演算を実装できます。また、可能であればMPIにもともと実装されている関数を使うため、普通の総和などをやる場合の性能ペナルティはありません。

## std::vectorのallreduce

`boost::mpi::all_reduce`の第三引数に関数オブジェクトを渡せるため、これで`std::vector`同士の足し算を実装してやれば良いことになります。こんな感じでしょうか。

```cpp
#include <cstdio>
#include <vector>
#include <algorithm>
#include <boost/mpi/environment.hpp>
#include <boost/mpi/communicator.hpp>
#include <boost/mpi/collectives.hpp>

template <class T>
class VectorPlus {
public:
  T operator()(const T &lhs, const T &rhs) const {
    const auto n = lhs.size();
    auto r = T(n);
    std::transform(lhs.begin(), lhs.end(), rhs.begin(), r.begin(), std::plus<>());
    return r;
  }
};

int
main(int argc, char**argv) {
  boost::mpi::environment env(argc, argv);
  boost::mpi::communicator world;
  const int rank = world.rank();
  const int N = 10;
  std::vector<int> v(N, rank);
  auto r = boost::mpi::all_reduce(world, v, VectorPlus <std::vector<int>>());
  if (rank == 0) {
    for (int i = 0; i < N; i++) {
      printf("%d:%d\n", i, r[i]);
    }
  }
}
```

一般のオブジェクトを通信するのにシリアライズするため、boost_serializationをリンクする必要があります。

```shell-session
$ g++ reduce_vector.cpp -lmpi -lmpi_cxx -lboost_mpi -lboost_serialization
$ mpirun --oversubscribe -np 4 ./a.out
0:6
1:6
2:6
3:6
4:6
5:6
6:6
7:6
8:6
9:6

$ mpirun --oversubscribe -np 10 ./a.out 
0:45
1:45
2:45
3:45
4:45
5:45
6:45
7:45
8:45
9:45
```

できてるみたいですね。

## Boostを使わなかった場合

少なくともMPI組み込みの演算をするなら、自分でAllreduceをラップするのは簡単です。こんな感じになるでしょうか。

```cpp
#include <cstdio>
#include <mpi.h>
#include <algorithm>
#include <vector>

template<class T>
void
myallreduce(void *s, void *r, int count){
  printf("Unsupported Type\n");
  MPI_Abort(MPI_COMM_WORLD, 1);
}

template<> void myallreduce<int>(void *s, void *r, int count){
  MPI_Allreduce(s, r, count, MPI_INT, MPI_SUM, MPI_COMM_WORLD);
}

template<> void myallreduce<float>(void *s, void *r, int count){
  MPI_Allreduce(s, r, count, MPI_FLOAT, MPI_SUM, MPI_COMM_WORLD);
}

template<> void myallreduce<double>(void *s, void *r, int count){
  MPI_Allreduce(s, r, count, MPI_DOUBLE, MPI_SUM, MPI_COMM_WORLD);
}

template <class T>
void
AllreduceVector(std::vector<T> &sendbuf, std::vector<T> &recvbuf){
  const int count = sendbuf.size();
  recvbuf.resize(count);
  std::fill(recvbuf.begin(), recvbuf.end(),0);
  myallreduce<T>(sendbuf.data(), recvbuf.data(), count);
}

template <class T>
void
test(int rank){
  const int N = 10;
  std::vector<T> send_buffer(N, rank*1.00001);
  std::vector<T> recv_buffer(N);
  AllreduceVector(send_buffer, recv_buffer);
  if(rank==0){
    std::cout << "Result (" << typeid(T).name() << ")" << std::endl;
    for(int i=0;i<N;i++){
      std::cout << i << ":" << recv_buffer[i] << std::endl;
    }
  }
}

int
main(int argc, char **argv){
  MPI_Init(&argc, &argv);
  int rank, size;
  MPI_Comm_rank(MPI_COMM_WORLD, &rank);
  MPI_Comm_size(MPI_COMM_WORLD, &size);
  test<int>(rank);
  test<float>(rank);
  test<double>(rank);
  MPI_Finalize();
}

```

一応テンプレートを使ってみましたが、`MPI_Allreduce`が`MPI_INT`みたいな型を明示的に要求するので、結局使う型すべてについて特殊化せざるを得ず、あまりきれいにはかけません。テンプレートに慣れた人ならもっときれいに書けるのかもしれませんが、まぁこれくらいならたいした手間では無い気がするし、いちどラップしてしまえば、呼ぶ側としては型を気にしなくてよくなるのはboost版と同じな気もします。

実行結果はこんな感じです。どの型のAllreduceを実行しているかをtypeidで表示しています。

```shell-session
$ mpirun --oversubscribe -np 4  ./a.out
Result (i)
0:6
1:6
2:6
3:6
4:6
5:6
6:6
7:6
8:6
9:6
Result (f)
0:6.00006
1:6.00006
2:6.00006
3:6.00006
4:6.00006
5:6.00006
6:6.00006
7:6.00006
8:6.00006
9:6.00006
Result (d)
0:6.00006
1:6.00006
2:6.00006
3:6.00006
4:6.00006
5:6.00006
6:6.00006
7:6.00006
8:6.00006
9:6.00006
```

`int`,`float`,`double`それぞれの`vector`について、Allreduceできているみたいですね。

## まとめ

Boost MPI Libraryを使ってAllreduceしてみました。MPIが用意している演算をする分にはあまりご利益はありませんが、とりあえず「C++っぽくMPIをやるならこうなるんだろうな」という形は見せてくれます。また、自分で定義した演算を渡せるので、MPIがもともと用意していないような演算をしたい時に、いちいち自分で集団通信を書かなくてよいのはちょっとうれしいかもしれません。

ただ、Boost MPIを導入するメリットに比べて、BoostやBoost MPIが用意されていないスパコンサイトで、自分でなんとかインストールして使えるようにするだけの努力はペイするか、と言われると微妙な気がします。まぁ、これは年寄りくさい考え方かもしれませんが・・・。

完全に戯言ですが、Boost MPIはあくまでもC++っぽくMPIをラップしたものであって、それ以上でもそれ以下でもなく、僕がMPIに感じる気持ちの悪さの解決には至っていません。しつこいですが、ネイティブにプロセス間通信をサポートしたプログラム言語で気持ちよくプログラムを書きたいものです。

結局のところ、全体のロジックを書く言語、通信まわりを書く言語、一番下でSIMD化とかがんばる言語は、全部別のプログラミング言語、という状況の方がいろいろきれいで楽な気がします・・・。
