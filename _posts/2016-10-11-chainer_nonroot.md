---
layout: post
title: "非root環境にChainerをインストールする"
tags: [machine-learning, qiita]
permalink: chainer_nonroot
---

# 非root環境にChainerをインストールする

## はじめに

管理者権限を持っていない環境にChainerをインストールするための覚書。環境はCentOS 6.8。

```shell-session
$ cat /etc/redhat-release
CentOS release 6.8 (Final)
```

zlib-devel openssl-devel は最新のものが入っていることを前提とする。もし最新でなければ、root持ってる人に

```shell-session
$ sudo yum install  zlib-devel openssl-devel 
```

をお願いする(これは問題なくやってくれるはず)。
Python 2.7.9、easy_install、pipをこの順番でインストールする。--prefixを自分のローカルディレクトリを指定すればOK。ただし、事前にPYTHONPATH用のディレクトリを掘っておき、かつ環境変数も正しく設定してやる必要がある。

## Python 2.7.9のインストール

まずやらなきゃいけないのが、Python 2.7.9以上のインストール。2.7.9未満だと、環境によってはSSL関連で問題を起こすことがある。具体的には以下のようなメッセージが出てインストールに失敗する。

SNIMissingWarning: An HTTPS request has been made, but the SNI (Subject Name Indication) extension to TLS is not available on this platform. This may cause the server to present an incorrect TLS certificate, which can cause validation failures. You can upgrade to a newer version of Python to solve this. For more information, see https://urllib3.readthedocs.org/en/latest/security.html#snimissingwarning.
  SNIMissingWarning

これはPython 2.7.9未満がSNI (Server Name Indication)に対応していないため。というわけでPython 2.7.9を入れる。自分のhomeの~/local以下に入れることを想定。build用のディレクトリbuildを掘って、そこから作業する。

```shell-session
$ mkdir build
$ cd build
$ wget https://www.python.org/ftp/python/2.7.9/Python-2.7.9.tgz
$ tar xvzf Python-2.7.9.tgz 
$ cd Python-2.7.9
$ mkdir -p ~/local/lib/python2.7/site-packages/
$ ./configure --prefix=$HOME/local
$ make
$ make install
$ ~/local/bin/python -V 
Python 2.7.9
```

無事にPython 2.7.9が入ったことを確認したら、以後 ~/local/binを先に探すようにして、さらにPYTHONPATHも設定しておく。

```shell-session
$ export PATH=~/local/bin:$PATH
$ export PYTHONPATH=$HOME/local/lib/python2.7/site-packages:$PYTHONPATH
```

## pipのインストール

Chainerはpipからインストールできる。pipはeasy_installからインストールする。なので、easy_install→pip→Chainerという順番で入れる。パスが~/local/binを先に見るようになっており、かつPYTHONPATHも先程入れた $HOME/local/lib以下を指していることを確認しておくこと。

```shell-session
$ wget http://peak.telecommunity.com/dist/ez_setup.py
$ ~/local/bin/python ez_setup.py --prefix=$HOME/local
$ easy_install --prefix=$HOME/local pip
$ pip --version
pip 8.1.2 from /home/username/local/lib/python2.7/site-packages/pip-8.1.2-py2.7.egg (python 2.7)
```

pip --versionが、先程入れたディレクトリを表示し、かつpython 2.7を使うことを宣言していれば成功。

## Chainerのインストールとテスト

ここまでくれば、あとはそのままインストールするだけ。

```shell-session
$ pip install --install-option="--prefix=$HOME/local" chainer 
(snip)
Successfully installed chainer-1.16.0 filelock-2.0.6 nose-1.3.7 numpy-1.11.2 protobuf-3.1.0.post1 six-1.10.0
```

バージョン確認。

```shell-session
$ python
Python 2.7.9 (default, Oct 11 2016, 14:36:30) 
[GCC 4.4.7 20120313 (Red Hat 4.4.7-17)] on linux2
Type "help", "copyright", "credits" or "license" for more information.
>>> import chainer
>>> chainer.__version__
'1.16.0'
>>> 
```

Chainerの1.16.0が入ったようだ。

テストしてみる。適当なディレクトリからテスト用ファイルをダウンロード、展開して実行する。

```shell-session
$ wget https://github.com/pfnet/chainer/archive/v1.16.0.tar.gz
$ tar xzf v1.16.0.tar.gz  
$ python chainer-1.16.0/examples/mnist/train_mnist.py
GPU: -1
## unit: 1000
## Minibatch-size: 100
## epoch: 20

Downloading from http://yann.lecun.com/exdb/mnist/train-images-idx3-ubyte.gz...
Downloading from http://yann.lecun.com/exdb/mnist/train-labels-idx1-ubyte.gz...
Downloading from http://yann.lecun.com/exdb/mnist/t10k-images-idx3-ubyte.gz...
Downloading from http://yann.lecun.com/exdb/mnist/t10k-labels-idx1-ubyte.gz...
epoch       main/loss   validation/main/loss  main/accuracy  validation/main/accuracy
1           0.192325    0.092044              0.941333       0.9694                    
2           0.0741603   0.0772249             0.976783       0.9752                    
3           0.0490249   0.0818211             0.984617       0.9769                    
4           0.0354393   0.0721487             0.98835        0.9786                    
5           0.0284153   0.0824381             0.9905         0.978                     
6           0.0253944   0.0833704             0.991683       0.9778                    
7           0.0198933   0.0795161             0.993217       0.9786                    
8           0.0180047   0.0879281             0.994017       0.9797                    
9           0.0180067   0.0778288             0.9942         0.9835                    
10          0.0155835   0.106346              0.994783       0.9789                    
11          0.0123485   0.082584              0.996417       0.9802                    
12          0.01105     0.0878168             0.996267       0.9822                    
13          0.0144636   0.0885193             0.99555        0.981                     
14          0.0112616   0.110112              0.99645        0.9788                    
15          0.0100006   0.090651              0.996767       0.9826                    
16          0.00999751  0.102143              0.996833       0.9815                    
17          0.00982385  0.115105              0.996933       0.9805                    
18          0.00860034  0.105004              0.997383       0.9825                    
19          0.00824925  0.104951              0.997483       0.9829                    
20          0.00778952  0.116273              0.99775        0.981 
```

上記のような表示が出たらちゃんと入っていると思われる。
