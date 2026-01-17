---
layout: post
title: "「サイゼリヤで1000円あれば最大何kcal摂れるのか」をマルコフ連鎖モンテカルロで解いてみた。"
tags: [programming, qiita]
permalink: saizeriya_mc
---

# 「サイゼリヤで1000円あれば最大何kcal摂れるのか」をマルコフ連鎖モンテカルロで解いてみた。

## はじめに

* [「サイゼリヤで1000円あれば最大何kcal摂れるのか」を量子アニーリング計算(Wildqat)で解いてみた。](https://qiita.com/hodaka0714/items/cf44b4ece992a39b5be4)
* [「サイゼリヤで1000円あれば最大何kcal摂れるのか」をSMTソルバー(Z3)で解いてみた。](https://qiita.com/tanakh/items/a1fb13f78e0576415de3)
* [「サイゼリヤで1000円あれば最大何kcal摂れるのか」を整数計画法ソルバー(PuLP)で解いてみた。](https://qiita.com/YSRKEN/items/dfc8604eb8598e5e9076)

N番煎じですが、これらの記事を見てマルコフ連鎖モンテカルロで解いてみました。コードは以下に置いてあります。

[https://github.com/kaityo256/saizeriya_mc](https://github.com/kaityo256/saizeriya_mc)


## 方針

全メニューについて、「注文する/しない」を0/1の状態ベクトルとして、そのベクトルについて最適化をかけます。カロリーをエネルギーとして、カロリーを最大化するようにします。試行は「メニューの追加/削除」の二種類です。状態の更新はメトロポリス法を使います。すると、メニューの追加試行は「1000円を超えなければ必ず採択」、メニューの削除試行は「カロリー差分に応じて確率的に採択」となります。適当に時間発展させれば、そのうち基底状態を見つけるでしょう、という感じです。

## プログラムの解説

## テキストデータへ吐き出す

たまたま手元に128ビットのビット列を状態として更新するC++のマルコフ連鎖モンテカルロのコードがあったので、それを使いまわします。上記のサイゼリアのメニューは114品なので128ビットに収まるのでちょうど良いです。まず、C++で読み込むために、[こちら](https://github.com/marushosummers/Saizeriya_1000yen)のデータベース`saizeriya.db`をテキストに落とします。

```py
import sqlite3

conn = sqlite3.connect('saizeriya.db')
c = conn.cursor()
fn = open("name.txt","w")
fp = open("price.txt","w")
fc = open("calorie.txt","w")
for (n, p, c) in c.execute('SELECT name, price, calorie FROM menu'):
    fp.write(str(p) + "\n")
    fn.write(str(n) + "\n")
    fc.write(str(c) + "\n")
    print(p,n,c)
conn.close()
```

これで、それぞれ名前(`name.txt`)、値段(`price.txt`)、カロリー(`calorie.txt`)に落ちました。

## テーブルの読み込み

あんまり必要性を感じませんが、とりあえずモンテカルロクラスを作りましょう[^1]。そのstatic methodとしてデータをロードしておきます。

[^1]: 既存のコードを使い回す都合です。

```cpp
class MC {
private:
  mbit _data;
  mbit _max_data;
  int _price;
  int _calorie;
  int _max_calorie;
  static std::vector<int> vcalorie;
  static std::vector<int> vprice;
  static std::vector<std::string> vname;

public:
  static void load_files() {
    std::ifstream ifs("calorie.txt");
    int c = 0;
    while (ifs >> c) {
      vcalorie.push_back(c);
    }
    ifs.close();
    ifs.open("price.txt");
    while (ifs >> c) {
      vprice.push_back(c);
    }
    std::string n;
    ifs.close();
    ifs.open("name.txt");
    while (ifs >> n) {
      vname.push_back(n);
    }
  }
};
__attribute__((weak)) std::vector<int> MC::vcalorie;
__attribute__((weak)) std::vector<int> MC::vprice;
__attribute__((weak)) std::vector<std::string> MC::vname;
```

あとはこれにモンテカルロ用のコードを追加していきます。

## 状態の更新

状態は128ビットのビット列とします。そこからランダムにビットを追加したり減らしたりします。これくらいの規模ならビット演算を使うまでもないのですが、たまたま手元にあったので。とりあえず`__int128`を`mbit`という名前で`typedef`しておきます。また、メニューの数を`SIZE = 114`と定義しておきましょう。ランダムにビットを追加、削除する関数はこんな感じにかけます。

```cpp
// ランダムに1ビット削除する
  mbit random_remove(const mbit &s, std::mt19937 &mt) {
    std::uniform_int_distribution<> ud(0, popcnt_u128(s) - 1);
    mbit t = s;
    const unsigned int n = ud(mt);
    for (unsigned int i = 0; i < n; i++) {
      t = t ^ (t & -t);
    }
    return (s ^ (t & -t));
  }

  // ランダムに1ビット追加する
  mbit random_add(const mbit &s, std::mt19937 &mt) {
    static const mbit mask = (mbit(1) << SIZE) - 1;
    mbit t = (~s) & mask;
    std::uniform_int_distribution<> ud(0, popcnt_u128(t) - 1);
    const unsigned int n = ud(mt);
    for (unsigned int i = 0; i < n; i++) {
      t = t ^ (t & -t);
    }
    return (s | (t & -t));
  }
```

特に説明は不要かと思います。この関数を使えば、ランダムに一品追加 or 一品削除する関数はこんな感じにかけます。

```cpp
// ランダムに一品増やす
  void try_add(const double beta, std::mt19937 &mt) {
    mbit ns = random_add(_data, mt);
    int i = bitpos(ns ^ _data);
    int ncalorie = _calorie + vcalorie[i];
    // 千円超えたらアウト
    if (_price + vprice[i] > 1000) return;
    //そうでなければ無条件で更新
    _price += vprice[i];
    _calorie += vcalorie[i];
    _data = ns;
    if (_max_calorie < _calorie) {
      _max_calorie = _calorie;
      _max_data = _data;
      std::cout << _max_calorie << std::endl;
    }
  }

  // ランダムに一品減らす
  void try_remove(const double beta, std::mt19937 &mt) {
    if (_data == mbit(0)) return;
    std::uniform_real_distribution<double> ud(0.0, 1.0);
    mbit ns = random_remove(_data, mt);
    int i = bitpos(_data ^ ns);
    if (ud(mt) < exp(-vcalorie[i] * beta)) {
      _data = ns;
      _price -= vprice[i];
      _calorie -= vcalorie[i];
    }
  }
```

ここで`beta`は逆温度で、どれだけランダムにサンプリングするかの指標です。いま、「トータルのカロリー」を最大化しようとしているため、ランダムに一品追加する試行は、それが1000円を超えていなければ無条件で採択します。逆に、ランダムに一品減らす場合は値段のチェックは不要で、そのかわり確率的に採択します。その「メニューの減らしやすさ」を表す指標が逆温度です。そういう意味では一品追加ルーチンには温度を引数にとる必要なかったですね。

一品追加/削除を一度ずつ試すのを「1モンテカルロステップ」としましょう。

```cpp
  void onestep(const double beta, std::mt19937 &mt) {
    try_add(beta, mt);
    try_remove(beta, mt);
  }
```

あとはこれをひたすら呼べば、そのうち基底状態(最適な組み合わせ)を見つけるでしょう。メイン関数はこんな感じになるでしょうか。とりあえず10万ステップほど回してみましょう。


```cpp
#include "mc.hpp"

int main() {
  MC::load_files();
  std::mt19937 mt;
  MC m;
  for (int i = 0; i < 1000000; i++) {
    m.onestep(0.001, mt);
  }
  m.show();
}
```

## 実行結果

実行してみるとこんな感じになります。

```sh
$ ./a.out
585
959
1494
1527
1710
1730
1820
1826
1854
1940
ポテトのグリル:366 kcal 199Yen
アーリオ・オーリオ(Wサイズ):1120 kcal 574Yen
ラージライス:454 kcal 219Yen
合計 1940 kcal 992 Yen
```

無事に見つけたみたいですね。実行時間も0.1秒くらいです。

## まとめ

というわけで、「サイゼリア問題」をマルコフ連鎖モンテカルロ法で解いてみました。最初は単純モンテカルロではだめで、アニーリングかレプリカ交換モンテカルロが必要になるかと思いましたが、114種類程度ならば生のモンテカルロでも楽勝です。本当はモンテカルロ法は「ある統計重みで正しくサンプリングできる」という強い性質があるのですが、ここでは単純に最適化アルゴリズムとしてしか使っていません。これはわりともったいないこと[^2]をしているのですが、まぁそこはそれ。


[^2]: 超純水で水洗便所を流すようなもの、と誰かが言っていました。
