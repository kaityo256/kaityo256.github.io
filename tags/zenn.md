---
layout: default
title: zenn
tag: zenn
permalink: /tags/zenn/
---

<h1>{{ page.tag }}</h1>

[Zenn](https://zenn.dev/kaityo256)に書いた奴。

<ul>
{% for post in site.tags[page.tag] %}
  <li><a href="{{ post.url }}">{{ post.title }}</a></li>
{% endfor %}
</ul>

