---
layout: post
title: "ncursesでブロック崩し"
tags: [programming, linux, qiita]
permalink: ncurses_breakout
---

# ncursesでブロック崩し

## はじめに

ncursesを使って、こんな感じのブロック崩しゲームを作ります。

![image0.gif](/assets/images/ncurses_breakout/image0.gif)

ソースは以下に置いておきます

https://github.com/kaityo256/nc_breakout

以下のStepは、それぞれ上記リポジトリのディレクトリに対応しています。

## ncursesとは

ncursesとは、キー入力や画面表示など、端末のテキストユーザインタフェース(TUI)を作るのに便利なライブラリです。マウスや画面表示などはわりと端末ごとにいろいろ違っていて面倒なのですが、それを吸収してくれます。このライブラリを使うと、キーの入力、マウスイベント処理、画面表示などが簡単にできるようになります。

直接このライブラリを使って何かを組む人は少ないと思いますが、何かアプリケーション(例えばVim)をソースからビルドするときに要求されるので、ご存知の方は多いでしょう。

なんか娘を寝かしつけていて、ようやく寝たと思ったら僕が寝そけてしまったので[^1]、このライブラリの紹介がてら簡単なゲームを書きなぐってみましょう。

## Step 0: ncursesのリンクと画面表示

まずはncursesをコンパイル、リンクしてみましょう。ncursesを使うには、まず`ncurses.h`をインクルードします。

```test.cpp
#include <ncurses.h>
  
int
main(void) {
  initscr();
  getch();
  endwin();
}
```

`initescr`が、ncursesの初期化、`endwin`が終了です。`getch`は、実行されるとキー入力を待ち、何か入力されるとそのキーコードを返します。

コンパイル、実行はこんな感じです。

```shell-session
$ g++ test.cpp -lncurses
$ ./a.out
```

`ncurses`ライブラリにパスが通ってない場合は、`-I`や`-L`で場所を教えてあげてください。実行すると画面が真っ暗になりますが、何かキーを押すと終了し、実行前の画面に戻ります。つまり、ncursesは実行前の画面を覚えていてくれます。

(2019年7月10日追記)

もともと

```shell-session
$ g++ -lncurses test.cpp 
```

としていましたが、環境によってビルドに失敗するみたいなので、コンパイルオプションの順序を入れ替えました。

## Step 1: Hello World

次は定番ですがHello Worldを表示してみましょう。ncursesには`mvprintw`という、画面の任意の場所に`printf`関数を実行できる関数が用意されています[^basic]。

[^basic]: この関数見てN88-BASICの`LOCATE`関数を思い出す僕はオッサンですかそうですか。

これを使って、画面の12行30桁目に「Hello World」を表示させ、`q`が押されるまで待つプログラムがこちらです。

```test.cpp
#include <ncurses.h>
  
int
main(void) {
  initscr();
  mvprintw(12, 30, "Hello World!");
  while (true) {
    int ch = getch();
    if (ch == 'q') break;
  }
  endwin();
}
```

while文で、`getch`の返り値が`q`になるまで無限ループさせています。実行画面はこんな感じです。`q`を押すと終わります。

![image1.png](/assets/images/ncurses_breakout/image1.png)

ここで、`mvprintw`の座標の引数の順番は「行(row)」「列(column)」の順番であることに気をつけましょう。ゲームを作ると、左右をx軸、上下をy軸に取りたくなりますが、そうすると`mvprintw(y,x, string)`という順序になります。

## Step 2: カーソルとキー入力非表示

先程の例で、Hello Worldの右にカーソルが表示されていました。この状態で何かキーを入力すると、そこに書き込まれてしまいます。

![image2.png](/assets/images/ncurses_breakout/image2.png)

これではゲームにするのに不都合なので、カーソルとキー入力の非表示をしましょう。先程のコードに二行付け加えるだけです。

```test.cpp
#include <ncurses.h>
  
int
main(void) {
  initscr();
  noecho(); //キーが入力されても表示しない
  curs_set(0);//カーソルを非表示
  mvprintw(12, 30, "Hello World!");
  while (true) {
    int ch = getch();
    if (ch == 'q') break;
  }
  endwin();
}
```

`noecho`が入力されたキーの非表示、`curs_set`はカーソルの表示/非表示を切り替える関数で、0を入れると非表示になります。実行すると、カーソルが消え、入力されたキーも表示されなくなっていることがわかります。

![image3.png](/assets/images/ncurses_breakout/image3.png)


## Step 3: パドル操作

さて、次はマウスでパドルを操作させてみましょう。`getch`はデフォルトではキー入力とマウスクリックイベントしか取れませんが、以下の二行を付け加えるとマウスの移動イベントが取れるようになります(端末依存)。

```c++
  keypad(stdscr, TRUE); // xtermでマウスイベントの取得に必要
  mousemask(REPORT_MOUSE_POSITION, NULL);//マウスイベントを取得
```

ここで`REPORT_MOUSE_POSITION`は、マウスの位置を取得するためのマスクです。

(2023年6月13日追記) もともと `ALL_MOUSE_EVENTS`を使っていましたが、これではMacでは動作するものの、コメントにて他の環境では動かない指摘があり、`REPORT_MOUSE_POSITION`に修正しました。

このあと`getch()`の返り値が`KEY_MOUSE`だった時、`getmouse`関数を使ってマウスイベントをとれます。使い方はこんな感じです。

```c++
 MEVENT e;
 int ch = getch();
 if (ch == KEY_MOUSE) {
   if (getmouse(&e) == OK) {
   }
 }
```

`getmouse`関数の返り値が`OK`ならば、マウスイベント構造体`MEVENT e`に情報が入っています。たとえばマウスのx座標は`e.x`に入っている、といった具合です。

これを使って、マウスを動かすとパドルが動くようにしてみたソースがこちらです。

```nc_breakout.cpp
#include <ncurses.h>

int
main(void) {
  initscr();
  noecho(); //キーが入力されても表示しない
  curs_set(0);//カーソルを非表示
  keypad(stdscr, TRUE); // xtermでマウスイベントの取得に必要
  mousemask(REPORT_MOUSE_POSITION, NULL);//マウスイベントを取得
  MEVENT e;
  int px = 2;
  while (true) {
    int ch = getch();
    if (ch == 'q') break;
    if (ch == KEY_MOUSE) {
      if (getmouse(&e) == OK) {
        clear();
        px = e.x;
        if (px < 2)px = 2;
        if (px > 77)px = 77;
        mvprintw(23, px - 2, "-----");
        refresh();
      }
    }
  }
  endwin();
}
```

ここで、`clear`は全画面クリア、`refresh`は画面の更新をする関数です。

さて、このままコンパイル、実行しても、何も表示されません。ただし、何かキーを入力したり、マウスクリックしたりすると表示されます。これは、デフォルトでは端末がマウスの移動イベントを取ってくれないためです。

もし、端末が対応しているならば、例えば`TERM`環境変数に`xterm-1003`をセットすると、マウスの移動イベントが取れるようになります。

```shell-session
$ TERM=xterm-1003 ./a.out
```

![image4.gif](/assets/images/ncurses_breakout/image4.gif)

マウスの移動に合わせてパドルが動くようになりました。

## Step 4: ボールのアニメーション

次に、ボールをアニメーションさせ、パドルで打ち返すところまで組んでみましょう。ここで一つ問題があります。キーやマウスイベントを取得する`getch`関数は、何かイベントが発生するまでそこで止まってしまいます。これでは、リアルタイムに動くゲームが作れません。

対処法は

* 非同期にイベントの有無を調べ、イベントがあった時だけ`getch`を呼ぶ
* ゲームのループを別スレッドで回す

の二つです。前者はWindowsの`kbhit`関数なんかが有名ですが、Linuxに移植してマウスイベントにも対応させるのは(多分)面倒です。なので素直にイベント処理ループとゲームループを別スレッドで回してしまいましょう。スレッドプログラミングというと面倒くさそうな気がしますが、`std::thread`を使えば楽ちんぽいです。

```nc_breakout.cpp
#include <ncurses.h>
#include <random>
#include <future>

int px = 40;
const int py = 23;
bool now_playing = true;
bool has_ball = true;
double bx = 0.0, by = 0.0;
double vx = 0.0, vy = 0.0;

void
draw_all(void) {
  clear();
  //パドルの描画
  if (has_ball) {
    mvprintw(py - 1, px, "*");
  }
  mvprintw(py, px - 2, "-----");
  //ボールの描画
  int x = static_cast<int>(bx);
  int y = static_cast<int>(by);
  if (!has_ball) {
    mvprintw(y, x, "*");
  }
  refresh();
}

void
paddle_collision_check(void) {
  if (by < 23.0) return;
  if (bx < px - 2)return;
  if (bx > px + 3)return;
  by = 23;
  double theta = M_PI * ((static_cast<double>(px) - bx + 1.5) / 8.0 + 0.25);
  vx = cos(theta) * 0.5;
  vy = -sin(theta) * 0.5;
}

void
move_ball(void) {
  if (has_ball)return;
  paddle_collision_check();
  bx += vx;
  by += vy;
  if (bx < 0) {
    bx = 0;
    vx = abs(vx);
  }
  if (by < 0) {
    by = 0;
    vy = abs(vy);
  }
  if (bx > 80) {
    bx = 80;
    vx = -abs(vx);
  }
  if (by > 24) {
    by = 24;
    has_ball = true;
  }
}

void
game_loop(void) {
  while (now_playing) {
    move_ball();
    draw_all();
    std::this_thread::sleep_for(std::chrono::milliseconds(15));
  }
}

int
main(void) {
  initscr();
  noecho(); //キーが入力されても表示しない
  curs_set(0);//カーソルを非表示
  keypad(stdscr, TRUE); // xtermでマウスイベントの取得に必要
  mousemask(REPORT_MOUSE_POSITION, NULL);//マウスイベントを取得
  MEVENT e;
  draw_all();
  auto th_game = std::thread([] {game_loop();});
  std::mt19937 mt;
  std::uniform_real_distribution<double> ud(0.0, 1.0);
  while (true) {
    int ch = getch();
    if (ch == 'q') break;
    if (has_ball && ch == ' ') {
      has_ball = false;
      bx = px;
      by = py - 1.0;
      double theta = (ud(mt) * 0.5 + 0.25) * M_PI;
      vx = cos(theta) * 0.5;
      vy = -sin(theta) * 0.5;
    }
    if (ch == KEY_MOUSE) {
      if (getmouse(&e) == OK) {
        px = e.x;
        if (px < 2)px = 2;
        if (px > 77)px = 77;
      }
    }
  }
  now_playing = false;
  th_game.join();
  endwin();
}
```

見ればわかると思いますが、

* パドルがボールを持っている(`has_ball`)の時に、スペースキーを入力するとボールがランダムな方向に飛ぶ
* ボールは左右と上の壁で跳ね返る
* パドルに当たった時には、その当たった場所によって跳ね返る向きが変わる
* パドルにあたらなかったら、またパドルにボールがひっつく

ようにしています。実行イメージはこんな感じです。

![image5.gif](/assets/images/ncurses_breakout/image5.gif)

殴り書いたので微妙に接触判定とかおかしい気がしますが、まぁ気にしないことにしましょう。

## Step 5: ブロックを作る

ここまでくればもう、ブロックを作って、ボールがぶつかったらブロックが消えてボールが跳ね返るコードにするのは簡単だと思います。ソースは以下です。

https://github.com/kaityo256/nc_breakout/blob/master/step5/nc_breakout.cpp

![image6.gif](/assets/images/ncurses_breakout/image6.gif)

ボールとブロックの当たり判定がちょっとおかしいことになっていますが、これも気にしないことにしましょう。

## 注意点というかハマったところ

ここでは、`clear`で画面を毎回クリアして、全部描画してから`refresh`で画面を更新しています。ここで、`clear`せずに、差分だけ描画したくなる人がいるかもしれません。僕も最初はボールが動いたら元の場所に空白を描画して消して・・・という部分更新をしていたのですが、そうするとたまに画面の同じところに別のものを書き込んでしまい、画面がバグって乱れてしまいました。画面の書き込みを一つのスレッドからのみ行うようにしてもダメでした。理由はちゃんと理解していませんが、とりあえず毎回全部クリアして`refresh`しておけば問題なくなりました。勝手にダブルバッファ的な描画がされて、画面もちらつきませんし、これでいいことにします。

## まとめ

TUIを作るのに定番のライブラリ、ncursesを使ってブロック崩しゲームを作ってみました。C++なのに150行程度でブロック崩しが作れてしまいます。後は色を変えたり得点をつけたりアイテムを作ったりすれば、学校のプログラムの自由課題あたりにちょうどいいんじゃないでしょうか。

[^1]: 「寝そける」は「寝そびれる」という意味の方言です。主に新潟方面でこういう言い方をされるようですね(僕の両親は富山県出身)。
