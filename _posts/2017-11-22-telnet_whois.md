---
layout: post
title: "telnetでwhoisをたたく"
tags: [linux, qiita]
permalink: telnet_whois
---

# telnetでwhoisをたたく

## はじめに

「サーバが攻撃されている！このIPアドレスが誰のものか調べてくれ！」
「あー、また誰かがウィルスでも踏んだかな・・・。このIPは外からですかね。えーと、nslookup・・・ではヒットしない、と。じゃあwhois・・・あれ？whoisコマンドがない！ど、どうすればいいんだ！」
(ルークよ・・・telnetを使え)
「そうだ！俺たちにはtelnetがあるじゃないか！」

というわけでtelnetでwhoisをたたきます。いくらでも他の方法あるだろとか言わないのが大人です。

## whois

whoisというのは、インターネットの登録情報を確認するサービスである。えらく古いプロトコルなので後継が出るとかでないとか。様々な用途はあるが、筆者はssh brute force攻撃とかポートスキャンとか来たときに、そのIPアドレスの所有者というか、管理者の連絡先を調べて「おたくのところで誰かウィルスとかやられてないですか？」的な問い合わせをするのに使っていた。っていうか最近のサーバ管理者ってwhoisコマンドとかまだ使ってるんですかね？レジストラのウェブで調べるの？そもそもwhoisってまだ使ってる人いるのかしら？

それはともかくとして、昔のネットワーク管理者はなんでもtelnetで叩く「telnet芸」みたいなのを身に着けてたと思うんだけど(HTTPとかSMTPとかはよく叩いたよね？)、whoisもtelnetで叩ける、というのはあんまり知られてなかったみたいなんで、叩いてみましょう。

どこでもいいんだけど、例えばgoogleあたりを調べてみましょうか。

```shell-session
$ nslookup www.google.com 
Server:		XXXXXX
Address:	   XXXXXX

Non-authoritative answer:
Name:	www.google.com
Address: 172.217.26.36
```

環境によっては実行するたびに返ってくるアドレスが変わるかも。

まずはwhoisコマンドで聞いてみる。

```shell-session
$ whois 172.217.26.36

#
## ARIN WHOIS data and services are subject to the Terms of Use
## available at: https://www.arin.net/whois_tou.html
#
## If you see inaccuracies in the results, please report at
## https://www.arin.net/public/whoisinaccuracy/index.xhtml
#

(snip)

NetRange:       172.217.0.0 - 172.217.255.255
CIDR:           172.217.0.0/16
NetName:        GOOGLE
NetHandle:      NET-172-217-0-0-1
Parent:         NET172 (NET-172-0-0-0-0)
NetType:        Direct Allocation
OriginAS:       AS15169
Organization:   Google LLC (GOGL)
RegDate:        2012-04-16
Updated:        2012-04-16
Ref:            https://whois.arin.net/rest/net/NET-172-217-0-0-1

(snip)
```

whois.arin.netが返事をしてくれて、そのアドレスはGoogleが管理してるよ、ということを教えてくれた。

さて、それをtelnetでも聞いてみよう。whoisのポート番号は43番である。

```shell-session
$ telnet whois.arin.net 43
Trying 2001:500:31::46...
Connected to whois.arin.net.
Escape character is '^]'.
```

ここで入力待ちになるので、IPアドレスを入れてみる。

```shell-session
172.217.26.36   # ← コマンドラインから入力

#
## ARIN WHOIS data and services are subject to the Terms of Use
## available at: https://www.arin.net/whois_tou.html
#
## If you see inaccuracies in the results, please report at
## https://www.arin.net/public/whoisinaccuracy/index.xhtml
#
(snip)
NetRange:       172.217.0.0 - 172.217.255.255
CIDR:           172.217.0.0/16
NetName:        GOOGLE
NetHandle:      NET-172-217-0-0-1
Parent:         NET172 (NET-172-0-0-0-0)
NetType:        Direct Allocation
OriginAS:       AS15169
Organization:   Google LLC (GOGL)
RegDate:        2012-04-16
Updated:        2012-04-16
Ref:            https://whois.arin.net/rest/net/NET-172-217-0-0-1
(snip)
Connection closed by foreign host.
```

同じ情報が返ってきた。

AS番号から情報をひくのもtelnetからできる。

```shell-session
$ telnet whois.arin.net 43
Trying 2001:500:a9::46...
Connected to whois.arin.net.
Escape character is '^]'.
a 15169
(snip)
ASNumber:       15169
ASName:         GOOGLE
ASHandle:       AS15169
RegDate:        2000-03-30
Updated:        2012-02-24    
Ref:            https://whois.arin.net/rest/asn/AS15169
(snip)
Connection closed by foreign host.
```

ちゃんとGoogleがでてきましたね。


## まとめ

まぁ、これだけの話でまとめもへったくれもないんだけれども、whoisはtelnetで叩けるよ、という話。telnetで80番とか25番あたりはまだ叩く用途が思いつくんだけど、43を叩くシチュエーションは正直思いつかない。っていうか筆者は最近のサーバ管理者がどういう生活しているか知らないんだけど、こういうtelnet芸ってまだ引き継がれてるんですかね？
