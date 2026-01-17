---
layout: post
title: "std::mapのシリアライズ"
tags: [programming, qiita]
permalink: map_serialize
---

# std::mapのシリアライズ

## はじめに

わけあって`std::map`をシリアライズ/デシリアライズしたい。`boost::serialization`を使えば一発らしいんだけど、わけあってあまり`boost`を使いたくない。

というわけで車輪の再開発をする。書いたコードは

https://gist.github.com/kaityo256/eb6a49cb40f99b97898f5e464c2c208f

においておく。

## 方針

`std::map`を継承した`serializable_map`クラスを作る。こういう感じ。

```cpp
template<class Key, class Value>
class serializable_map : public std::map<Key, Value> {
// ここを実装したい
};
```

シリアライズとデシリアライズメンバ関数は、こんな形になっていてほしい。

```cpp
  std::vector<char> serialize() {
    std::vector<char> buffer;
    std::stringstream ss;
    for (auto &i : (*this)) {
      Key str = i.first;
      Value value = i.second;
      write(ss, str);
      write(ss, value);
    }
    size_t size = ss.str().size();
    buffer.resize(size);
    ss.read(buffer.data(), size);
    return buffer;
  }

  void deserialize(std::vector<char> &buffer) {
    offset = 0;
    while (offset < buffer.size()) {
      Key key;
      Value value;
      read(buffer, key);
      read(buffer, value);
      (*this)[key] = value;
    }
  }
```

つまり、シリアライズは全てのキーと値を`std::stringstream`に突っ込んで、最後に`std::vector<char>`に変換してそれを返す。デシリアライズは`std::vector<char>`から直接読み込む。書き込みは`std::stringstream`を使ってるので書き込み位置の制御は不要だが、読み込みは`std::vector<char>`を使ってるので、現在の読み込み位置を覚えておく必要がある。それを`offset`で覚えている[^1]。

[^1]: なんで読み込みを`std::istream`系で実装しなかったのか覚えてない。なんか理由があった気がする。

基本的にテンプレートを使うが、`std::string`だけ別扱いにする。あとはこの`write`と`read`を実装すれば良い。

## 実装

読み込み、書き込みともに、`int`とかそういうPODなら

```cpp
  template<class T>
  void write(std::stringstream &ss, T &t) {
    ss.write((char*)(&t), sizeof(t));
  }

  template<class T>
  void read(std::vector<char> &buffer, T &t) {
    t = (T)(*(buffer.data() + offset));
    offset += sizeof(T);
  }
```

　でいける。

ただし、`std::string`の場合は長さが不定なので、最初に長さを、次に実体を書き込む必要がある。というわけで、そういうふうにテンプレートを特殊化する。

```cpp
  void write(std::stringstream &ss, std::string &str) {
    size_t size = str.size();
    ss.write((char*)(&size), sizeof(size));
    ss.write((char*)(str.data()), str.length());
  }

  void read(std::vector<char> &buffer, std::string &str) {
    size_t size = (int)(*(buffer.data() + offset));
    offset += sizeof(size_t);
    std::string str2(buffer.data() + offset, buffer.data() + offset + size);
    str = str2;
    offset += size;
  }
```

後はテストのために、中身を表示する関数`show`も作っておこう。

```cpp
  void show(void) {
    for (auto &i : (*this)) {
      std::cout << i.first << ":" << i.second << std::endl;
    }
    std::cout << std::endl;
  }
```

これで完成。

## テスト

こんなテストを書いた。

```cpp
void
test1(void) {
  std::cout << "string->int" << std::endl;
  serializable_map<std::string, int> m;
  m["test1"] = 1;
  m["test2"] = 2;
  m["test3"] = 3;
  std::vector<char> buffer = m.serialize();
  serializable_map<std::string, int> m2;
  m2.deserialize(buffer);
  m2.show();
}

void
test2(void) {
  std::cout << "int->string" << std::endl;
  serializable_map<int, std::string> m;
  m[1] = "test1";
  m[2] = "test2";
  m[3] = "test3";
  std::vector<char> buffer = m.serialize();
  serializable_map<int, std::string> m2;
  m2.deserialize(buffer);
  m2.show();
}

void
test3(void) {
  std::cout << "int->int" << std::endl;
  serializable_map<int, int> m;
  m[1] = 1;
  m[2] = 2;
  m[3] = 3;
  std::vector<char> buffer = m.serialize();
  serializable_map<int, int> m2;
  m2.deserialize(buffer);
  m2.show();
}

int
main(void) {
  test1();
  test2();
  test3();
}
```

つまり、`<std::string, int>`、`<int, std::string>`, `<int, int>`のそれぞれについてシリアライズ、デシリアライズを試している。実行結果はこうなる。

```shell-session
$ g++ -std=c++11 test.cpp -o a.out
$ ./a.out

string->int
test1:1
test2:2
test3:3

int->string
1:test1
2:test2
3:test3

int->int
1:1
2:2
3:3
```

うまくいってるみたいですね。

## まとめ

`std::map`をboostを使わずにシリアライズしたかったので車輪の再開発をした。読み込みのところで、最初は返り値の型によるオーバーロードをやろうとしたんだけど、ナイーブにやるとクラス内の関数テンプレートの特殊化が必要になって面倒くさい(たぶん)。いろいろ考えたんだけど、結局引数で特殊化するのが一番簡単な気がしてそうしてしまった。

どうでもいいけど、テンプレートの実装をミスるとやたら大量のエラーメッセージ出るし意味不明だしで困ったもんですね。
