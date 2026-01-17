---
layout: post
title: "スパコンの落とし方"
tags: [programming, qiita]
permalink: how_to_fall
---

# スパコンの落とし方

## はじめに

スパコン、落としてますか？＞挨拶

スパコン落とすといろいろ大変だし、落としたスパコンがそれなりに大きい奴だったりすると、落とした時間相当の金額とか考えて青くなったりしますよね。いや、僕はそんなもの落としたこと無いのであくまで想像なんですが。

さて、スパコンを落とすと大変だし、そもそもアカウントとか持ってない人も多いでしょうから、「スパコン」という文字を落っことして、スパコンを落とした気分になりましょう。具体的にはこんなアニメーションGIFを作ります。

![image0.gif](/assets/images/how_to_fall/image0.gif)


## スパコンデータの作成

まず、文字列のデータを作成します。フォントを描画し、それをピクセル単位で取得する方法って意外に無いんですよね。わりと簡単なのは、無圧縮のビットマップで保存して、それを解析する方法ですが、それでもフォーマットや保存形式がいろいろあるので、全部に対応するのはかなり面倒です、っていうか実際面倒でした。そこで、CairoのRubyバインディングを使う事にします。Cairoが入ってない場合はgemか何かで入れましょう。

```shell-session
$ sudo gem install cairo
```

で、Cairo::ImageSurfaceにいろいろ描画したあと、dataインスタンスメソッドで画像データ「data」を取得します。これはchar型のデータになっており、フォーマットが`FORMAT_RGB24`の場合には、4バイトが1ピクセルに対応し、上位1バイトは0、残りがそれぞれRGBの輝度(0-255)になっています。とりあえず背景を黒に、色を白にして文字を描いて、それを読み込むことにしましょう。こんなスクリプトを書きます。

```rb
require 'rubygems'
require 'cairo'
format = Cairo::FORMAT_RGB24
width = 400
height = 100
surface = Cairo::ImageSurface.new(format, width, height)
context = Cairo::Context.new(surface)
context.set_source_rgb(0, 0, 0)
context.rectangle(0, 0, width, height)
context.fill
context.set_source_rgb(1, 1, 1)
context.select_font_face('Meiryo')
context.move_to(5,90)
context.font_size = 96 
context.show_text('スパコン')
surface.write_to_png("supakon.png")
height.times{|y|
  width.times{|x|
    i = x + y*width
    puts "#{x} #{height-y}" if surface.data[i*4].ord !=0
  }
}
```

フォントはCairoから読めて、かつ日本語が出力できるものを選ぶ必要があります。とりあえずうちの環境ではMeiryoでうまくいきました。実行するとPNGファイル(supakon.png)を作り、かつ座標データを標準出力に吐くので、こんな感じにリダイレクトしましょう。

```shell-session
$ ruby supakon.rb > supakon.dat
```

こんなPNGファイル(supakon.png)ができているはずです。

![image1.png](/assets/images/how_to_fall/image1.png)

できた座標データ(supakon.dat)は、例えばgnuplotで確認しましょう。

```shell-session
$ gnuplot
gnuplot> p "supakon.dat"
```

![image2.png](/assets/images/how_to_fall/image2.png)

できているみたいですね。

## 落下シミュレーション

この座標データを読み込んで、それぞれを粒子だと思って、粒子同士を適当にバネでつないで、重力をかけて下に落下させましょう。粒子同士の相互作用を計算するのは面倒なので、今回はバネだけ考えます。なので、粒子が反発せずお互いにすり抜けてしまいますが、それは我慢しましょう。超適当に書いたシミュレーションコードはこんな感じです。

```cpp
//----------------------------------------------------------------------
#include <iostream>
#include <vector>
#include "bm.hpp"
const double SPRING_CONSTANT = 1000.0;
const double GRAVITY = 0.1;
const double GAMMA = 0.1;
const double dt = 0.01;
//----------------------------------------------------------------------
struct d2 {
  double x,y;
};
std::vector<d2> p,q;
std::vector<double> stress;
std::vector<int> bond1;
std::vector<int> bond2;
std::vector<double> b_length;
double s_time = 0.0;
//----------------------------------------------------------------------
void
add_particle(double x, double y) {
  d2 q2, p2;
  q2.x = x;
  q2.y = y;
  p2.x = 0.0;
  p2.y = 0.0;
  q.push_back(q2);
  p.push_back(p2);
}
//----------------------------------------------------------------------
void
add_bond(int i1, int i2) {
  bond1.push_back(i1);
  bond2.push_back(i2);
  double dx = q[i1].x - q[i2].x;
  double dy = q[i1].y - q[i2].y;
  double l = dx*dx + dy*dy;
  b_length.push_back(l);
}
//----------------------------------------------------------------------
void
calculate(void) {
  const int pn = q.size();
  for(int i=0; i<pn; i++) {
    stress[i] = 0.0;
  }
  for(int i=0; i<pn; i++) {
    q[i].x += p[i].x*dt;
    q[i].y += p[i].y*dt;
  }
  for(int k=0; k<bond1.size(); k++) {
    const int i1 = bond1[k];
    const int i2 = bond2[k];
    const double dx = q[i2].x - q[i1].x;
    const double dy = q[i2].y - q[i1].y;
    const double r2 = dx*dx + dy*dy;
    const double f = SPRING_CONSTANT*(r2 - b_length[k]);
    stress[i1] += f*f;
    stress[i2] += f*f;
    p[i1].x += f*dx*dt;
    p[i1].y += f*dy*dt;
    p[i2].x -= f*dx*dt;
    p[i2].y -= f*dy*dt;
  }
  for(int i=0; i<pn; i++) {
    p[i].x -= p[i].x*GAMMA*dt;
    p[i].y += -p[i].y*GAMMA*dt - GRAVITY*dt;
    if(q[i].y < 0) {
      p[i].y -= 10.0*q[i].y *dt;
    }
  }
  s_time += dt;
}
//----------------------------------------------------------------------
void
loadfile(void) {
  double x,y;
  while(!std::cin.fail()) {
    std::cin >> x >> y;
    add_particle(x,y);
  }
  stress.resize(q.size(),0.0);
}
//----------------------------------------------------------------------
void
connect_bond(void) {
  const int pn = q.size();
  for(int i=0; i<pn-1; i++) {
    for(int j=i+1; j<pn; j++) {
      const double dx = q[i].x - q[j].x;
      const double dy = q[i].y - q[j].y;
      const double r2 = dx*dx + dy*dy;
      if(r2 > 3.1) continue;
      add_bond(i,j);
    }
  }
}
//----------------------------------------------------------------------
void
savetobmp(int index) {
  const int pn = q.size();
  const double mag = 2.0;
  const double R = 1.0;
  int LX = 400*mag;
  int LY = 120*mag;
  WindowsBitmap canvas(LX,LY);
  canvas.SetColor(255,255,255);
  canvas.FillRect(0,0,LX,LY);
  for(int i=0; i<pn; i++) {
    int ic = stress[i] * 0.2;
    if (ic > 255) ic = 255;
    canvas.SetColor(ic,0,0);
    int ix = (int)(q[i].x*mag);
    int iy = (int)(q[i].y*mag);
    int ir = (int)(R*mag);
    canvas.FillCircle(ix,iy,ir);
  }
  char filename[256];
  sprintf(filename,"data%03d.bmp",index);
  index++;
  canvas.SaveToFile(filename);
  printf("%s\n",filename);
}
//----------------------------------------------------------------------
int
main(void) {
  loadfile();
  connect_bond();
  int index =0;
  for(int i=0; i<20000; i++) {
    if(i%200==0) {
      savetobmp(index);
      index++;
    }
    calculate();
  }
}
//----------------------------------------------------------------------
```

特に解説はいらないかと思いますが、計算結果を保存するのに、自作のビットマップ出力クラスを使っています。ラスタを吐きたいけど、ライブラリとかインストールするのがわりと面倒な環境だったりすることがあるので、外部ライブラリに依存しないビットマップ出力クラスを持っているとたまに便利です。

ビットマップ出力クラスはこんな感じ。

```cpp
#include <iostream>
#include <fstream>
#include "bm.hpp"
//----------------------------------------------------------------------
WindowsBitmap::WindowsBitmap(int w, int h) {
  Width = w;
  Height = h;
  Line = ((w*3 -1)/4)*4 + 4;
  BufferSize = Line*h;
  ImageBuffer = new BYTE[BufferSize];
  for(int i=0; i<BufferSize; i++) {
    ImageBuffer[i] = 0;
  }
  CX = 0;
  CY = 0;
};
//----------------------------------------------------------------------
void
WindowsBitmap::DrawPoint(int x, int y) {
  if(x <0 || x >= Width)return;
  if(y <0 || y >= Height)return;
  int p = y*Line+x*3;
  ImageBuffer[p] = B;
  ImageBuffer[p+1] = G;
  ImageBuffer[p+2] = R;
}
//----------------------------------------------------------------------
void
WindowsBitmap::LineTo(int x, int y) {
  int dx = ( x > CX ) ? x - CX : CX - x;
  int dy = ( y > CY ) ? y - CY : CY - y;
  int sx = ( x > CX ) ? 1 : -1;
  int sy = ( y > CY ) ? 1 : -1;
  if ( dx > dy ) {
    int E = -dx;
    for (int i = 0 ; i <= dx ; i++ ) {
      DrawPoint(CX,CY);
      CX += sx;
      E += 2 * dy;
      if ( E >= 0 ) {
        CY += sy;
        E -= 2 * dx;
      }
    }
  } else {
    int E = -dy;
    for (int i = 0 ; i <= dy ; i++ ) {
      DrawPoint(CX,CY);
      CY += sy;
      E += 2 * dx;
      if ( E >= 0 ) {
        CX += sx;
        E -= 2 * dy;
      }
    }
  }
}
//----------------------------------------------------------------------
void
WindowsBitmap::FillRect(int x, int y, int w, int h) {
  for(int iy=0; iy<h; iy++) {
    for(int ix=0; ix<w; ix++) {
      DrawPoint(ix + x, iy + y);
    }
  }
}
//----------------------------------------------------------------------
void
WindowsBitmap::DrawCircle(int x0, int y0, int r) {
  int x = r;
  int y = 0;
  int F = -2 * r + 3;
  while ( x >= y ) {
    DrawPoint( x0 + x, y0 + y);
    DrawPoint( x0 - x, y0 + y);
    DrawPoint( x0 + x, y0 - y);
    DrawPoint( x0 - x, y0 - y);
    DrawPoint( x0 + y, y0 + x);
    DrawPoint( x0 - y, y0 + x);
    DrawPoint( x0 + y, y0 - x);
    DrawPoint( x0 - y, y0 - x);
    if ( F >= 0 ) {
      x--;
      F -= 4 * x;
    }
    y++;
    F += 4 * y + 2;
  }
}
//----------------------------------------------------------------------
void
WindowsBitmap::FillCircle(int x0, int y0, int r) {
  int x = r;
  int y = 0;
  int F = -2 * r + 3;
  while ( x >= y ) {
    for(int i=-x; i<=x; i++) {
      DrawPoint( x0 + i, y0 + y);
      DrawPoint( x0 + i, y0 - y);
      DrawPoint( x0 + y, y0 + i);
      DrawPoint( x0 - y, y0 + i);
    }
    if ( F >= 0 ) {
      x--;
      F -= 4 * x;
    }
    y++;
    F += 4 * y + 2;
  }
}
//----------------------------------------------------------------------
void
WindowsBitmap::SetColor(BYTE red,BYTE green,BYTE blue) {
  R = red;
  G = green;
  B = blue;
}
//----------------------------------------------------------------------
void
WindowsBitmap::SaveToFile(const char * filename) {
  DWORD bfSize = BufferSize+54;
  WORD bfReserved1 = 0;
  WORD bfReserved2 = 0;
  DWORD bfOffBits = 54;
  DWORD biSize = 40;
  DWORD biWidth = Width;
  DWORD biHeight = Height;
  WORD biPlanes = 1;
  WORD biBitCount = 24;
  DWORD biCompression = 0;
  DWORD biSizeImage = 0;
  DWORD biXPelsPerMeter = 0;
  DWORD biYPelsPerMeter = 0;
  DWORD biClrUsed = 0;
  DWORD biClrImportant= 0;
  std::ofstream fs(filename);
  //BITMAPFILEHEADER
  fs.write("BM",sizeof(WORD));
  fs.write((char *)&bfSize,sizeof(DWORD));
  fs.write((char *)&bfReserved1,sizeof(WORD));
  fs.write((char *)&bfReserved2,sizeof(WORD));
  fs.write((char *)&bfOffBits,sizeof(DWORD));
  //BITMAPINFOHEADER
  fs.write((char *)&biSize,sizeof(DWORD));
  fs.write((char *)&biWidth,sizeof(DWORD));
  fs.write((char *)&biHeight,sizeof(DWORD));
  fs.write((char *)&biPlanes,sizeof(WORD));
  fs.write((char *)&biBitCount,sizeof(WORD));
  fs.write((char *)&biCompression,sizeof(DWORD));
  fs.write((char *)&biSizeImage,sizeof(DWORD));
  fs.write((char *)&biXPelsPerMeter,sizeof(DWORD));
  fs.write((char *)&biYPelsPerMeter,sizeof(DWORD));
  fs.write((char *)&biClrUsed,sizeof(DWORD));
  fs.write((char *)&biClrImportant,sizeof(DWORD));
  //DATA
  fs.write((char *)ImageBuffer,BufferSize);
  fs.close();
}
//----------------------------------------------------------------------
```

```cpp
#ifndef bm_h
#define bm_h
//----------------------------------------------------------------------
typedef unsigned char BYTE;
typedef unsigned short WORD;
typedef unsigned int DWORD;
//----------------------------------------------------------------------
class WindowsBitmap {
private:
  int Width, Height,Line;
  BYTE * ImageBuffer;
  int BufferSize;
  int CX, CY;
  BYTE R,G,B;
public:
  WindowsBitmap(int w, int h);
  void MoveTo(int x, int y) {CX=x; CY=y;};
  void LineTo(int x, int y);
  void DrawPoint(int x, int y);
  void SetColor(BYTE red,BYTE green,BYTE blue);
  void FillRect(int x, int y, int w, int h);
  void FillCircle(int x, int y, int r);
  void DrawCircle(int x, int y, int r);
  void SaveToFile(const char *filename);
};
//----------------------------------------------------------------------
#endif
```

これらをコンパイルして、先ほど作ったデータを食わせて実行します。

```shell-session
$ g++ -O3 supakon.cpp bm.cpp 
$ ./a.out < supakon.dat
```

実行するとカレントディレクトリにdata000.bmpからdata099.bmpが作られます。計算時間はあっという間です。こんな画像ができているはずです。

![image3.png](/assets/images/how_to_fall/image3.png)
![image4.png](/assets/images/how_to_fall/image4.png)
![image5.png](/assets/images/how_to_fall/image5.png)
![image6.png](/assets/images/how_to_fall/image6.png)

## アニメーションGIFの作成

連番ビットマップができれば、アニメーションGIFを作るのはImageMagickで一発です。

```shell-session
$ convert -resize 75% -loop 0 data*.bmp supakon.gif 
```

こうしてできたのが冒頭のアニメーションGIFです。

## まとめ

RubyからCairoを使って文字列を描画し、そのピクセルデータから座標データに落として簡易シミュレータに食わせ、スパコンという文字列を落としてみました。好きな文字列を落とせるので、飛ぶ鳥でも原稿でも気持ちでもクラスのマドンナでもなんでも落としてください。文字列だけではなく、二値画像ならなんでも良いので、丸でも三角でも何でも落とせます。シミュレータ部分を書き換えれば、ある程度負荷がかかったらバネが切れるようにして破壊シミュレーションと言い張るとか、ただ落とすだけでなく、粒子をイオン化させてプラズマシミュレーションとか言い張ることも可能です。プログラムの自由課題なんかにいかがでしょうか。

なお、このプログラムは、夜なかなか寝ない娘をあやしながら適当に作ったものなので、不備とかそういうのは大目に見ていただければ幸いです。
