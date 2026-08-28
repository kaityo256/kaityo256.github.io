# PLANS.md

# MN-Core 2 Life Game Implementation Plan

## 目的

`mncore-sdk-sample` リポジトリに、MN-Core 2 Emulator 上で動作する Conway's Game of Life のサンプルを追加する。

今回の目的は性能最適化ではなく、

- MN-Core SDK 0.7 の既存サンプル構成を踏襲する
- PE と MAU の両方を実際の計算に使用する
- 32×32 の Life を 1 ステップずつ MN-Core で計算する
- 毎ステップ host → device → host の通信を行う
- halo 付き入力により、Life の近傍取得のための L1B 間・MAB 間通信を不要にする
- コードの可読性を優先する

こととする。

エラー処理、汎用化、オプション処理、性能最適化は最低限とする。

---

# 1. 作業ブランチ

作業開始前に、現在の適切なベースブランチから

```bash
git switch -c lifegame
```

として `lifegame` ブランチを作成する。

以後の変更はすべて `lifegame` ブランチ上で行う。

既存の作業内容を破壊しないこと。

---

# 2. ディレクトリ構成の整理

現在 `examples` 直下に置かれている既存の加算サンプルを、

```text
examples/add/
```

へ移動する。

既存の加算サンプルについては、移動後もビルド・実行可能な状態を維持する。

そのうえで、新しく

```text
examples/lifegame/
```

を作成し、Life Game の実装をその下に置く。

最終的なイメージ：

```text
mncore-sdk-sample/
├── examples/
│   ├── add/
│   │   ├── ...
│   │
│   └── lifegame/
│       ├── main.cc
│       ├── lifegame.c
│       ├── Makefile
│       ├── README.md
│       └── sample.txt
│
└── ...
```

実際のファイル名は既存サンプルとの整合性を優先して多少変更してよいが、構成は単純に保つ。

---

# 3. 実行環境

既存の MN-Core SDK 0.7 Docker 環境をそのまま使用する。

ローカルの

```text
examples/
```

はコンテナ内の

```text
/root/examples
```

へマウントされている前提とする。

独自の Dockerfile や別のコンテナ環境は作成しない。

MN-Core 2 実機ではなく Emulator を使用する。

ホスト側では既存の加算サンプルと同様に、

```text
CL_DEVICE_TYPE_EMU_MNCORE2
```

を指定してエミュレータを利用する。

デバイスコードは `mnclc` でコンパイルし、ホストコードは `libmncl` をリンクする。

---

# 4. Life Game の仕様

格子サイズは固定で

```text
32 x 32
```

とする。

セル数は

```text
1024
```

である。

各セルは MN-Core 内部では単精度浮動小数点 `float` / `f32` で扱う。

状態は厳密に

```text
dead  = 0.0f
alive = 1.0f
```

とする。

境界条件は周期境界条件とする。

したがって、

```text
row -1  -> row 31
row 32  -> row 0
col -1  -> col 31
col 32  -> col 0
```

として扱う。

---

# 5. 入力ファイル

プログラムには 32×32 のテキストファイルを 1 個だけ渡す。

追加のコマンドラインオプションは作らない。

使用例：

```bash
./lifegame sample.txt
```

入力ファイルは 32 行で、各行は 32 文字とする。

文字の意味：

```text
.  dead
*  alive
```

例：

```text
................................
................................
...............*................
..............***...............
................................
...
```

実際の入力は必ず 32×32 とする。

入力ファイルの形式エラー処理は最低限でよい。

少なくとも、

- ファイルを開けない
- 行数が 32 でない
- 行の長さが 32 でない
- `.` と `*` 以外の文字がある

程度は検出し、簡潔なエラーメッセージを出して終了する。

複雑なリカバリ処理は不要。

---

# 6. 出力

Generation 0 と、その後の 10 世代を標準出力へ表示する。

つまり、

```text
Generation: 0
................................
................................
...............*................
..............***...............
...

Generation: 1
................................
...

Generation: 2
...

...

Generation: 10
...
```

という形式にする。

各世代の盤面は入力と同じく、

```text
.  dead
*  alive
```

で表示する。

`Generation: N` の直後に 32 行の盤面を表示する。

世代間には空行を 1 行入れ、読みやすくする。

世代数 10 はハードコーディングする。

コマンドラインから変更できるようにはしない。

---

# 7. ホスト側の世代ループ

Generation 0 は入力ファイルを読み込んだ直後の盤面である。

その後、

```cpp
for (int generation = 1; generation <= 10; ++generation) {
    pack_halo_tiles(...);
    run_mncore_one_step(...);
    unpack_output_tiles(...);
    print_board(...);
}
```

という構成とする。

重要：

MN-Core カーネル自身は常に 1 step だけ計算する。

デバイス側で 10 step のループを行わない。

毎世代、

```text
host
  ↓
device
  ↓
host
```

と戻す。

これは今回のテスト仕様として意図的に行う。

---

# 8. Host 側の盤面表現

ホスト側では可読性を優先し、32×32 の盤面を自然な形で保持する。

例えば、

```cpp
std::array<float, 32 * 32>
```

または同等の単純な構造を使用する。

アクセス用の小さな helper 関数を作ってもよい。

過剰な抽象化やクラス設計は不要。

---

# 9. Halo 付き入力レイアウト

32×32 の盤面を、4×4 の core block に分割する。

32 / 4 = 8 なので、

```text
8 x 8 = 64 blocks
```

となる。

各 4×4 core block の周囲に 1 cell 幅の halo を付ける。

したがって MN-Core に渡す 1 block の入力は、

```text
6 x 6
```

となる。

1 block：

```text
      halo
       ↓
    0 1 2 3 4 5
  +-------------+
0 | h h h h h h |
1 | h x x x x h |
2 | h x x x x h |
3 | h x x x x h |
4 | h x x x x h |
5 | h h h h h h |
  +-------------+
      ↑
    4x4 core
```

`h` は周囲セルからコピーした halo である。

周期境界条件も host 側の halo packing 時に処理する。

MN-Core 側では境界条件を考えなくてよいようにする。

---

# 10. MN-Core への入力形状

MN-Core へ渡す入力は論理的に、

```text
64 x 6 x 6
```

の FP32 配列とする。

要素数：

```text
64 * 6 * 6 = 2304 floats
```

バイト数：

```text
2304 * 4 = 9216 bytes
```

ホスト側では contiguous な 1 次元配列として保持してよい。

推奨 index：

```cpp
index = block * 36 + local_y * 6 + local_x;
```

block 番号は row-major で、

```cpp
block = block_y * 8 + block_x;
```

とする。

---

# 11. Block と元盤面の対応

block 座標を

```text
block_y = 0..7
block_x = 0..7
```

とする。

block 内の core 座標を

```text
local_y = 0..3
local_x = 0..3
```

とすると、元盤面との対応は

```text
global_y = block_y * 4 + local_y
global_x = block_x * 4 + local_x
```

である。

halo については、

```text
global_y = block_y * 4 + (halo_y - 1)
global_x = block_x * 4 + (halo_x - 1)
```

を周期境界で 0..31 に wrap して取得する。

host 側に小さな wrap helper を作るとよい。

---

# 12. MN-Core 2 への割り当て

MN-Core 2 には 64 L1B があるため、

```text
1 block = 1 L1B
```

と対応させる設計を第一候補とする。

64 blocks と 64 L1B が一致する。

さらに、各 L1B には 16 MAB があり、4×4 core は 16 cell なので、

```text
1 core cell = 1 MAB
```

と対応させる。

つまり、

```text
32x32
  ↓
64 blocks of 4x4
  ↓
64 L1B
  ↓
16 cells / L1B
  ↓
16 MAB / L1B
```

となる。

全体で

```text
64 * 16 = 1024 MAB
```

を使用する。

これは 1024 cells と一致する。

ただし、SDK / コンパイラの制約上この完全な 1:1 対応が不自然になる場合は、既存サンプルのレイアウトを優先する。

その場合でも、

- 全 64 L1B を使う
- 全体を均等に分散する
- 一部の L1B / MAB だけで全セルを逐次計算しない

ことを目標とする。

---

# 13. デバイス内通信を避ける方針

今回の重要な設計方針は、

```text
Life の近傍データ取得のための
L1B 間通信・MAB 間通信を行わない
```

ことである。

各 L1B には、担当する 4×4 core の計算に必要な 6×6 halo 付き block が最初から与えられる。

そのため、各 core cell の 3×3 neighborhood はすべて同じ L1B の入力 block 内に存在する。

計算中に、

- 隣の L1B から halo を取得する
- 隣の MAB からセル値を受け取る
- L2B をまたいで近傍値を交換する

といった処理を行わない。

DRAM → L2BM → L1BM の通常の入力転送、および結果の逆方向転送は当然必要である。

「通信なし」とは、Life の stencil 計算に必要な横方向の通信をなくす、という意味である。

---

# 14. 各 MAB が担当するセル

1 L1B の 4×4 core について、16 MAB を row-major に割り当てる。

```text
MAB  0 -> core (0,0)
MAB  1 -> core (0,1)
MAB  2 -> core (0,2)
MAB  3 -> core (0,3)

MAB  4 -> core (1,0)
MAB  5 -> core (1,1)
...
MAB 15 -> core (3,3)
```

各 MAB が必要とする入力は、6×6 block 内の対応する 3×3 patch だけである。

core `(local_y, local_x)` に対して、halo 付き入力上では中心セルが

```text
(local_y + 1, local_x + 1)
```

にある。

3×3 patch は、

```text
(local_y + 0, local_x + 0)
...
(local_y + 2, local_x + 2)
```

から取得できる。

---

# 15. MAU の利用

MAU は Life の主要な浮動小数点演算に実際に使用する。

第一候補は 8-neighbor sum である。

3×3 patch を、

```text
NW N NE
W  C E
SW S SE
```

とすると、

```text
neighbor_count =
    NW + N + NE
       + W + E
    + SW + S + SE
```

を計算する。

概念的には、

```text
[NW N NE W C E SW S SE]
```

と

```text
[1 1 1 1 0 1 1 1 1]
```

の積和である。

可能な限り MAU の積和として実装する。

単に「MAU 命令を出すためのダミー計算」を入れてはいけない。

MAU の結果は最終 Life 結果に実際に使用する。

---

# 16. PE の利用

PE も Life の実処理に使用する。

主な役割：

- L1BM から必要な値をレジスタへロード
- MAU へ渡す入力の準備
- MAU の neighbor count を受け取る
- Life rule の適用
- mask 処理
- 0.0f / 1.0f への変換
- 出力 gather

とする。

PE と MAU の役割を明確に分け、両方を実際の計算に使う。

---

# 17. Life rule

neighbor count を `n`、現在のセルを `x` とする。

標準 Conway Life rule：

```text
n == 3
    -> alive

n == 2 && x == alive
    -> alive

otherwise
    -> dead
```

結果は必ず

```text
0.0f
```

または

```text
1.0f
```

にする。

最初の実装では可読性を優先し、PE の比較・mask 処理で直接実装してよい。

以前検討した多項式

```text
f(n,x)
  = -n*n
    -n*x
    +6*n
    +3.5*x
    -8.75
```

による判定は、コードを明確に簡単にできる場合のみ採用してよい。

今回は多項式方式を必須とはしない。

---

# 18. MN-Core からの出力形状

デバイス側では halo を出力しない。

各 L1B が担当する 4×4 core の結果だけを返す。

論理的な出力形状：

```text
64 x 4 x 4
```

要素数：

```text
64 * 4 * 4 = 1024 floats
```

バイト数：

```text
4096 bytes
```

ホストでは contiguous な

```cpp
float output[1024]
```

相当として受け取ってよい。

推奨 index：

```cpp
index = block * 16 + local_y * 4 + local_x;
```

---

# 19. Host 側での出力 unpack

デバイスから受け取った

```text
64 x 4 x 4
```

を、通常の

```text
32 x 32
```

盤面へ戻す。

対応：

```cpp
for (int by = 0; by < 8; ++by) {
    for (int bx = 0; bx < 8; ++bx) {
        int block = by * 8 + bx;

        for (int ly = 0; ly < 4; ++ly) {
            for (int lx = 0; lx < 4; ++lx) {
                int gy = by * 4 + ly;
                int gx = bx * 4 + lx;

                board[gy * 32 + gx]
                    = output[block * 16 + ly * 4 + lx];
            }
        }
    }
}
```

これにより次の Generation の通常盤面が得られる。

その盤面を表示した後、次 step 用の 64×6×6 halo 入力を再構築する。

---

# 20. 1 Generation のデータフロー

1 世代の全体像：

```text
Host: 32x32 board
        │
        │ pack halo
        ▼
Host: 64 x 6 x 6 FP32
        │
        │ clEnqueueWriteBuffer
        ▼
MN-Core DRAM
        │
        ▼
L2BM
        │
        ▼
64 L1B
        │
        │ one 6x6 block / L1B
        ▼
1024 MAB
        │
        │ one 4x4-core cell / MAB
        │
        ├─ PE: prepare local 3x3 patch
        ├─ MAU: 8-neighbor sum
        └─ PE: Life rule / mask
        │
        ▼
64 x 4 x 4 FP32
        │
        ▼
MN-Core DRAM
        │
        │ clEnqueueReadBuffer
        ▼
Host: 64 x 4 x 4
        │
        │ unpack
        ▼
Host: 32x32 next board
```

この処理を 10 回繰り返す。

---

# 21. CPU 参照実装

MN-Core 実装の検証用として、ホスト側に単純な CPU Life 1-step 実装を用意する。

可読性を優先し、各セルについて直接 8 近傍を数える。

周期境界条件を使用する。

MN-Core の各 step の結果を CPU 参照結果と比較する。

不一致時のみ簡潔なエラーを表示して終了する。

例えば、

```text
Mismatch at generation 3, row 12, col 7
```

程度でよい。

過剰な診断機能は不要。

通常時は CPU 参照結果を表示しない。

---

# 22. MN-Core SDK の既存サンプルを踏襲する

実装開始前に、移動前の既存加算サンプルをよく読む。

以下について、そのサンプルの方法をそのまま流用する。

- `mnclc` による device build
- kernel binary の読み込み
- `CL_DEVICE_TYPE_EMU_MNCORE2`
- context / queue 作成
- `clCreateProgramWithBinary`
- `clCreateKernel`
- `clCreateBuffer`
- `clSetKernelArg`
- `clEnqueueWriteBuffer`
- `clEnqueueTask`
- `clEnqueueReadBuffer`
- DRAM / L2BM / L1BM の allocation
- distribute
- gather
- device → DRAM upload

SDK 固有 API や builtin 名を推測して実装しない。

必ず既存コード、SDK ヘッダ、examples を確認する。

---

# 23. 実装順序

## Phase 1: ブランチ作成

```bash
git switch -c lifegame
```

を行う。

---

## Phase 2: add サンプル移動

既存の加算サンプルを

```text
examples/add/
```

へ移動する。

移動後にビルドとエミュレータ実行が成功することを確認する。

この段階では Life の実装を始めない。

---

## Phase 3: lifegame ディレクトリ作成

```text
examples/lifegame/
```

を作る。

既存 add サンプルを参考に、最小の host/device 構成を準備する。

---

## Phase 4: 入出力 parser / printer

まず MN-Core を使わず、

- 32×32 input file 読み込み
- Generation 0 表示
- `.` / `*` 変換

を確認する。

---

## Phase 5: Halo pack / unpack

host 側で、

```text
32x32
  -> 64x6x6
```

の halo packing を実装する。

周期境界を含めて確認する。

さらに、

```text
64x4x4
  -> 32x32
```

の unpack を実装する。

小さな内部テストまたは assert で mapping を確認してよい。

---

## Phase 6: CPU 参照 Life

CPU の 1-step 実装を追加する。

block、blinker、glider など簡単なパターンで正しいことを確認する。

---

## Phase 7: MN-Core データ転送のみ

64×6×6 input を MN-Core へ渡し、まず簡単なデータコピーまたは確認可能な処理を行い、host へ戻せることを確認する。

Life / MAU はまだ入れなくてよい。

---

## Phase 8: PE での局所データ取得

各 L1B / MAB が、担当 cell に必要な 3×3 patch を正しく取得できることを確認する。

L1B 間通信なしで処理できていることを確認する。

---

## Phase 9: MAU による neighbor sum

8-neighbor sum を MAU で実装する。

MAU の出力が CPU で計算した neighbor count と一致することを確認する。

必要に応じ、一時的なデバッグ用出力を使ってよいが、完成時には削除する。

---

## Phase 10: Life rule

PE で Life rule と 0.0f / 1.0f mask 処理を実装する。

1 step の MN-Core 出力が CPU 参照版と完全一致することを確認する。

---

## Phase 11: 10 Generations

host 側で 10 回、

```text
pack
write
kernel
read
unpack
compare
print
```

を繰り返す。

Generation 0 ～ Generation 10 を表示する。

---

# 24. VSM / 生成コードの確認

可能であれば、

```bash
CODEGEN_DUMP_VSM=1
```

を使って VSM を出力する。

少なくとも、

- MAU が実際に使用されている
- PE 演算が存在する
- MAU の結果が最終出力に寄与している
- 不要な L1B 間 / MAB 間近傍通信を行っていない

ことを確認する。

ただし VSM の解析ツールを新規に作る必要はない。

README に簡潔に確認方法を記載する。

---

# 25. Makefile

既存 add サンプルの Makefile がある場合、それを参考にする。

最低限、

```bash
make
make run
make clean
```

を用意する。

可能なら、

```bash
make vsm
```

も用意する。

`make run` はサンプル入力ファイルを使って実行してよい。

例：

```bash
./lifegame sample.txt
```

---

# 26. README.md

`examples/lifegame/README.md` に最低限以下を書く。

- 32×32 Conway's Game of Life であること
- FP32 を使用すること
- 周期境界条件であること
- 入力ファイル形式
- 実行方法
- Generation 0 ～ 10 を表示すること
- 毎 step host-device 通信すること
- host で 4×4 core + halo を作り、6×6 block を64個渡すこと
- device 出力は 64×4×4 であること
- 1 block = 1 L1B、1 core cell = 1 MAB を基本設計とすること
- MAU を neighbor sum に使用すること
- PE をデータ準備と Life rule に使用すること
- Life stencil のための L1B 間通信を避ける設計であること

README は短く、実際に必要な情報だけを書く。

---

# 27. Sample input

`sample.txt` として、32×32 の簡単な Life pattern を 1 つ用意する。

glider など、時間発展が目視で確認しやすいものを推奨する。

入力例は必ず 32 行 × 32 文字とする。

---

# 28. コーディング方針

可読性を最優先する。

避けるもの：

- 不要なテンプレート
- 過剰なクラス化
- 汎用的すぎる abstraction
- コマンドライン option parser
- configurable grid size
- configurable generation count
- 複雑な logging framework
- 不要な最適化
- 不要な dynamic allocation
- 過剰なエラー処理

固定値は適切に、

```cpp
constexpr int GRID_SIZE = 32;
constexpr int BLOCK_CORE = 4;
constexpr int HALO = 1;
constexpr int BLOCK_INPUT = 6;
constexpr int BLOCKS_PER_DIM = 8;
constexpr int NUM_BLOCKS = 64;
constexpr int GENERATIONS = 10;
```

などとして名前を付ける。

magic number をコード中に大量に散らさない。

---

# 29. 完了条件

以下をすべて満たしたら完了とする。

1. `lifegame` ブランチ上で作業している
2. 既存加算サンプルが `examples/add/` に移動している
3. 移動後の add サンプルが動作する
4. `examples/lifegame/` が存在する
5. MN-Core SDK Docker コンテナ内でビルドできる
6. MN-Core 2 Emulator で実行できる
7. 32×32 のテキスト入力を読み込める
8. `.` を dead、`*` を alive として解釈する
9. Generation 0 を表示する
10. MN-Core で 1 step ずつ計算する
11. 毎 step host → device → host 通信を行う
12. host が 64×6×6 の halo 付き FP32 input を生成する
13. 周期境界条件は host の halo packing で解決する
14. device では Life 近傍取得のための L1B 間通信を必要としない
15. 64 L1B への block 配置を使用する、または同等に全体へ均等配置する
16. MAU を実際の neighbor sum に使用する
17. PE を実際の Life 処理に使用する
18. device は 64×4×4 = 1024 FP32 の結果を返す
19. host がそれを 32×32 に unpack する
20. CPU 参照実装と各 generation で一致する
21. Generation 0 ～ Generation 10 を指定形式で表示する
22. 世代数は 10 にハードコーディングされている
23. 不要なコマンドラインオプションがない
24. エラー処理は最低限で、コードが読みやすい
25. README にビルド・実行方法とデータレイアウトが記載されている

---

# 30. 最重要原則

この実装では性能チューニングより、

```text
host が halo を準備
    ↓
各 L1B が自己完結した 6×6 block を受け取る
    ↓
各 MAB が 1 cell を担当
    ↓
MAU が neighbor sum
    ↓
PE が Life rule
    ↓
64×4×4 を host に返す
```

というデータフローを、簡潔で理解しやすいコードとして実現することを最優先する。

MN-Core SDK 固有部分については推測せず、既存 add サンプルと SDK 内の examples / headers を確認して実装すること。
