---
layout: post
title: "Google Chromeで条件にマッチした履歴を削除"
tags: [web, devtools, qiita]
permalink: chrome_history
---

# Google Chromeで条件にマッチした履歴を削除

## TL;DR

* Google Chromeの履歴情報はMacなら`~/Library/Application Support/Google/Chrome/Default/History`にSQLite形式で保存されている
* これにsqlite3で接続すれば好きにデータを修正できる
* **以下の作業は自己責任で**

## はじめに

Google Chromeのアドレスバーに一度「似ているけれど違うURL」を叩いてしまい、それが履歴に保存されてしまった。その後、アドレスバーに目的のURLを入力しようとするたびに、「似ているけれど違うURL」が履歴からサジェストされ、間違えてそれを選ぶ事故が多発したので、Google Chromeの「全履歴削除」から、指定のURLを含む履歴を全削除しようとした。しかし、検索窓に何か入力するとインクリメンタルサーチで条件にマッチした履歴が表示されるのだが、それらを一括して削除する方法が見つからず、いちいちチェックボックスでちまちま削除しないといけないらしい。それは面倒だったので、履歴ファイルを直接いじって消すことにした。

## 履歴ファイルをsqlite3で開く

Google Chromeの履歴ファイルはMacなら`~/Library/Application Support/Google/Chrome/Default/History`にSQLite形式で保存されている。ちょっと接続してみよう。Macならsqlite3がデフォルトで入っているはず。念の為バックアップをとっておくこと。

```sh
$ cd ~/Library/Application\ Support/Google/Chrome/Defaul
$ cp History History.org
$ sqlite3 History
SQLite version 3.24.0 2018-06-04 14:10:15
Enter ".help" for usage hints.
```

これでHistoryに接続できた。後はSQL文で好き放題できる。例えばテーブル一覧はこんな感じ。Chromeが起動中だとデータベースがロックされており、
何かしようとしても`Error: database is locked`と出るので注意。

```sql
sqlite> .table
downloads                meta                     urls
downloads_slices         segment_usage            visit_source
downloads_url_chains     segments                 visits
keyword_search_terms     typed_url_sync_metadata
```

この内、履歴は`urls`に入っている。`urls`の中身を見てみる。

```sql
sqlite> PRAGMA TABLE_INFO(urls);
0|id|INTEGER|0||1
1|url|LONGVARCHAR|0||0
2|title|LONGVARCHAR|0||0
3|visit_count|INTEGER|1|0|0
4|typed_count|INTEGER|1|0|0
5|last_visit_time|INTEGER|1||0
6|hidden|INTEGER|1|0|0
```

`url`が所望のデータだ。他にも何回見たかとか、最後に閲覧したのはいつかとか保存している模様。例えば、Yahooへのアクセス記録を出力してみる。

```sql
sqlite> SELECT url FROM urls WHERE url LIKE '%yahoo%';
https://news.yahoo.co.jp/pickup/6314475
https://news.yahoo.co.jp/pickup/6314512
https://rdsig.yahoo.co.jp/_ylt=A2RhOBncumxc_EIAwmGJBtF7/RV=2/RE=1550715996/RH=cmRzaWcueWFob28uY28uanA-/RB=Tl1BEuHH.pmHl6nh8acKUaB5aNE-/RU=aHR0cHM6Ly9uZXdzLnlhaG9vLmNvLmpwL3BpY2t1cC82MzE0NTEyAA--/RK=0/RS=av1AssZWJzL41xBT_jN._wbvTLM-
https://rdsig.yahoo.co.jp/_ylt=A2RiVc_fumxc3QkAiziJBtF7/RV=2/RE=1550715999/RH=cmRzaWcueWFob28uY28uanA-/RB=Tl1BEuHH.pmHl6nh8acKUaB5aNE-/RU=aHR0cHM6Ly9uZXdzLnlhaG9vLmNvLmpwL3BpY2t1cC82MzE0NDc1AA--/RK=0/RS=eGNI.qh83kqwAWG8cKhbUYK1uSs-
https://www.yahoo.co.jp/
```

まっさらな状態から、Yahoo Newsをいくつか見たのだが、その情報が取れている。

さて、URLに「yahoo」を含む履歴をざっくり削除してしまおう。

```sql
sqlite> DELETE FROM urls WHERE url LIKE '%yahoo%';
sqlite> SELECT url FROM urls WHERE url LIKE '%yahoo%';
sqlite>
```

DELETE文を実行したあとは、URLに`yahoo`を含む履歴が消えた。Chromeを再起動して、履歴を調べみよう。
<img width="1075" alt="yahoo.png" src="https://qiita-image-store.s3.amazonaws.com/0/79744/f96105a0-d3bd-6c7a-d5f5-064ebcf2a15d.png">

うん。消えてますね。

## まとめ

Google Chromeで「条件にマッチする履歴を一括削除」機能がなかったようなので、sqlite3を叩いて直接消してみた。RubyないしPythonから触ろうかと思ったのだが、これくらいならsqlite3で直接SQL叩いた方が楽だった。これで、普段Twitterとかいつ、どのくらいの頻度で見ているかとか簡単に調べられるので、気になる人は試してみられたい

繰り返しになるが、実行するならくれぐれも自己責任で。
