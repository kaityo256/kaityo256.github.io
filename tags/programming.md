---
layout: default
title: programming
tag: programming
permalink: /tags/programming/
---

<h1>{{ page.tag }}</h1>

<ul>
{% for post in site.tags[page.tag] %}
  <li><a href="{{ post.url }}">{{ post.title }}</a></li>
{% endfor %}
</ul>

