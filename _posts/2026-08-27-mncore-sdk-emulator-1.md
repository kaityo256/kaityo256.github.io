---
layout: post
title: MN-Core SDKを使ってみる その1
tags: [programming, hpc]
permalink: mncore-sdk-emulator-1
---

## はじめに

Preferred Networksと神戸大学が共同開発したAIプロセッサ「MN-Core 2」のSDKを使ってみる。その1と書いたが、どこまで続くかはわからない。

MN-Core 2は、1ボードあたり4096個のPE (Processing Element)を持つアーキテクチャである。キャッシュがないのが特徴で、メモリが階層化されており、そのデータ転送は全てプログラマが責任を持つ必要がある。

MNCoreの実機を触るには購入するか、[FOCUS](https://www.j-focus.or.jp/)に利用申請してMシステムを使うなどの方法があるが、まずはローカルでエミュレータでいろいろ確認してみたい。

そこで、Preferred Networksが公開している[MN-CoreのSDK](https://github.com/pfnet/mncore)を使って、Docker上のエミュレータでMNCoreを動かしてみる。ただ、公式のSDKのDocker関連のファイルは(おそらく)Linuxを想定しているのと、実機も使えるようにしているせいか、ちょっと使いづらい。

そこで、Macで動作するエミュレータ前提のミニマルなDocker環境を作った。Dockerfileとサンプルは以下に置いてある。

[github.com/kaityo256/mncore-sdk-sample](https://github.com/kaityo256/mncore-sdk-sample)

SDKのバージョンは0.7を使う。

## 使い方

まず、サンプルリポジトリをクローンする。

```sh
git clone --recursive https://github.com/kaityo256/mncore-sdk-sample.git
cd mncore-sdk-sample
```

次に、SDKのイメージを作る。

```sh
docker build -t mncore-sdk-minimal:0.7 -f mncore/sdk/0.7/mncore-sdk-minimal.Dockerfile .
docker build -t mncore-sdk-full:0.7 -f mncore/sdk/0.7/mncore-sdk-full.Dockerfile --build-arg minimal_image_ref=mncore-sdk-minimal:0.7 .
```

`mncore-sdk-full:0.7`のイメージができた状態で、以下を実行する。

```sh
docker compose -f docker/docker-compose.yml run --rm --build mncore-sdk
```

するとローカルの`examples`が`/root/examples`にマウントされた状態でDockerコンテナが起動するので、コンパイルや実行ができる。また、コンパイラである`mnclc`や、必要なインクルードファイルやライブラリにパスが通った状態で起動するので、公式のイメージよりちょっと開発が楽になる。

すでに`examples`にホスト用コード`main.cc`とデバイス用コード`add.c`があるので、それぞれコンパイルする。

```sh
mnclc add.c -e add -o add.bin
c++ -std=c++23 main.cc -o add_host -lmncl
```

実行する。

```sh
./add_host
```

以下のように表示されれば成功である。

```sh
1 + 2 = 3
```

## サンプルの解説

サンプルは4 x 4 x 16 x 8 x 2 x 4 = 16384個の要素を持つベクトルに対して、z = x + yを実施するものである。簡単のため、`x[i] = 1`、`y[i] = 2`にしており、結果は`z[i] = 3`となる。

動的にカーネルを読み込むので、実行前にカーネルをコンパイルしてバイナリを作っておく必要がある。今回は、`add.c`から`add.bin`を作る。

### ホスト

`main.cc`はホスト用のコードであり、カーネル用の`add.bin`をロードしてカーネルを作り、それをタスクとしてエンキューすることで実行する。

最初にデバイスを初期化し、タスクを投げるためのキューを作る。

```cpp
  cl_platform_id platform;
  clGetPlatformIDs(1, &platform, nullptr);
  cl_device_id device;
  clGetDeviceIDs(platform, CL_DEVICE_TYPE_EMU_MNCORE2, 1, &device, nullptr);
  cl_context context =
      clCreateContext(nullptr, 1, &device, nullptr, nullptr, nullptr);
  cl_command_queue queue = clCreateCommandQueue(context, device, 0, nullptr);
```

次に`add.bin`を読み込んでカーネルを作る。

```cpp
  auto binary = load_binary("add.bin");
  const size_t binary_size = binary.size();
  const unsigned char* binary_data = binary.data();
  cl_program program = clCreateProgramWithBinary(
      context, 1, &device, &binary_size, &binary_data, nullptr, nullptr);
  cl_kernel kernel = clCreateKernel(program, "add", nullptr);
```

作ったキューにカーネルを投げる。

```cpp
clEnqueueTask(queue, kernel, 0, nullptr, nullptr);
```

結果の受け取り。

```cpp
clEnqueueReadBuffer(queue, d_z, true, 0, byte_size, z.data(), 0, nullptr, nullptr);
```

結果が正しいことを確認。

```cpp
std::cout << "1 + 2 = " << z[0] << '\n';
```

以上が実行の流れである。その他、必要なメモリの確保と解放を実施しなければならない。基本的にはOpenCLライクな文法になっているので、OpenCLを使ったことがあれば戸惑うことはないであろう(個人的にはOpenCLはあまり好きじゃないが・・・)。

### カーネル

`add.c`は足し算をするカーネル。エントリポイントはこんな感じ。

```cpp
NO_MANGLING void add(DRAM const f32* x, DRAM const f32* y, DRAM f32* z) {
```

`DRAM`というのは、ボードのDRAMだと思う。

その後、それぞれの階層のメモリ用にデータをmallocする。

```cpp
  L2BM f32* l2bm_x = __builtin_l2bm_malloc(2048);
  L2BM f32* l2bm_y = __builtin_l2bm_malloc(2048);
  L2BM f32* l2bm_z = __builtin_l2bm_malloc(2048);
  L1BM f32* l1bm_x = __builtin_l1bm_malloc(256);
  L1BM f32* l1bm_y = __builtin_l1bm_malloc(256);
  L1BM f32* l1bm_z = __builtin_l1bm_malloc(256);
```

L2BMとかL1BMはMN-Coreの、それぞれLevel 2ブロック、Level 1ブロックのメモリだと思われる。MNCoreでは、DRAMからL2BM、L2BMからL1BMに順にデータを明示的に転送する必要がある。そしてL1BMからレジスタにデータを読み出す。

```cpp
f32x4x2 vx;
f32x4x2 vy;
__builtin_l1bm_distribute(l1bm_x, (void*)&vx);
__builtin_l1bm_distribute(l1bm_y, (void*)&vy);
```

`f32x4x2`がレジスタなんだと思う。L1BMまで持ってきた`x`や`y`を受け取る。

その後、計算する。

```cpp
f32x4x2 vz = vx + vy;
```

AVX2とか512を使う時に、

```cpp
typedef double v4df __attribute__((vector_size(32)));
typedef double v8df __attribute__((vector_size(64)));
```

とかやってたが、そんなイメージで使えるんだと思う。

計算した結果はまたレジスタ→L1BM→L2BM→DRAMへと転送される。

```cpp
__builtin_l1bm_gather((void*)&vz, l1bm_z);

for (int i = 0; i < 8; ++i) {
__builtin_l2bm_gather(l1bm_z + i * 64, l2bm_z + i * 512);
}

__builtin_dram_punicast_upload_0(l2bm_z, z, 2048);
__builtin_dram_punicast_upload_1(l2bm_z, z + 4096, 2048);
```

以上が実行の流れである。

## アセンブリの確認

環境変数`CODEGEN_DUMP_VSM`に1を設定すると、`mnclc`はコンパイル時に標準エラー出力にMNCoreのアセンブリであるVSMを吐く。

```sh
CODEGEN_DUMP_VSM=1 mnclc add.c -e add
```

リダイレクトして使うと良いと思う。

```sh
CODEGEN_DUMP_VSM=1 mnclc add.c -e add 2> add.vsm
```

なお、VSMは最適化されてしまうため、例えば計算したデータを回収しないことがバレるとVSMを根こそぎ消されてしまう。

例えば`add.c`のうち、最後のデータ回収ルーチンをコメントアウトした`add2.c`を作ってやる。

```c
f32x4x2 vz = vx + vy;
/*
__builtin_l1bm_gather((void*)&vz, l1bm_z);

for (int i = 0; i < 8; ++i) {
__builtin_l2bm_gather(l1bm_z + i * 64, l2bm_z + i * 512);
}

__builtin_dram_punicast_upload_0(l2bm_z, z, 2048);
__builtin_dram_punicast_upload_1(l2bm_z, z + 4096, 2048);
*/
```

コンパイルすると、VSMが全部消されてしまう。

```sh
$ CODEGEN_DUMP_VSM=1 mnclc add2.c -e add
# === Dump vsm start ===
# === Dump vsm end ===
```

SIMDベクトルコードを開発する際、想定したアセンブリが出てるか確認するためコード片のアセンブリを確認する、みたいなことをやると思う。

例えばAVX2の命令が出てるか確認するのに

```c
typedef double v4df __attribute__((vector_size(32)));
void func(v4df a, v4df b){
  v4df c = a + b;
}
```

みたいなのを作って

```sh
gcc -S test.c
```

を実行して`test.s`を見て「`addpd`出てるな」みたいなことをよくやってたんだけど、MNCoreではやりづらい感じ。

## まとめ

MNCore SDKを使ってみた。こういう新規なデバイスは、書類書いて申請していきなり実機で、というとハードルが高い。こうしてDockerを使ってローカルでエミュレータで遊んでみて、VSMみながら動作を想像したり、nop多いなぁとか思ったりできるのは楽しい。

若い人がこの変態アーキテクチャで変態プログラムを作って動かすのを楽しみにしている。

## 補足

公式SDKに付属する補助スクリプト`create_dev_ctr.sh`は、MN-Coreの実機があればコンテナに接続したり、起動済みのコンテナを探したりする補助スクリプトである。しかし、macOSで使おうとすると、

- スクリプトが使用するreadarrayは、macOS標準のBash 3.2では利用できない
- デバイスの排他制御に使う/opt/mncore_shared_semaphoreのマウントに失敗する

という問題があって使えない。エミュレータだけで実行するなら、上記のように直接Dockerイメージを叩いてしまうのが楽だと思われる。

## 参考

- [MN-Core 2開発マニュアル](https://projects.preferred.jp/mn-core/assets/mncore2_dev_manual_ja.pdf)
