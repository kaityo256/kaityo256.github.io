---
layout: post
title: "WSL2でDOCKER_HOSTが指定されているとDockerが動かない"
tags: [linux, qiita]
permalink: docker_host
---

# WSL2でDOCKER_HOSTが指定されているとDockerが動かない

## TL;DR

Windows 10でDocker for Desktopが動いている状態で、WSLのubuntuでは動いていたdockerが、WSL2にしたら動かなくなったのは、環境変数`DOCKER_HOST`が指定されていたため。`unset DOCKER_HOST`すると動く。

## 現象

WSLでdockerが使えていたのに、WSL2にしたら動かなくなった。

```sh
$ docker ps                                                                           [~]
Cannot connect to the Docker daemon at tcp://localhost:2375. Is the docker daemon running?
```

実際にDockerは動いており、ポート2375が空いていることはPower Shellで確かめることができる。

```powershell
$ docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES

$ Test-NetConnection -ComputerName localhost -Port 2375


ComputerName     : localhost
RemoteAddress    : ::1
RemotePort       : 2375
InterfaceAlias   : Loopback Pseudo-Interface 1
SourceAddress    : ::1
TcpTestSucceeded : True
```

WSLのバージョン確認。

```powershell
$ wsl -l -v
  NAME                   STATE           VERSION
* Ubuntu                 Running         2
  docker-desktop-data    Running         2
  docker-desktop         Running         2
```

WSLのバージョンは2で、docker-desktopも動いていますね。

原因は、(僕の場合は.zshrcにて)環境変数`DOCKER_HOST`が指定されていたため。

```zsh
export DOCKER_HOST=tcp://localhost:2375
```

確かWSLではこれが必要だった。しかし、WSL2では不要。これをunsetすると動くようになる。

```zsh
$ unset DOCKER_HOST
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
```

動いた。めでたい。

個人的にものすごく困っていたので、同じ理由で困っている人のためにここに記録を残しておきます。

## 参考

* [WSL2 Cannot connect to the Docker daemon @ stack overflow](https://stackoverflow.com/questions/60708229/wsl2-cannot-connect-to-the-docker-daemon#comment109923517_60708229)
