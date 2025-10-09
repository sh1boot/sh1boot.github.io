---
layout: page
title: Messing about with SVG.
svg: true
---
Hello.

<svg width="900" viewbox="0 0 900 480">
<defs>
{% for m in (0..3) -%}
{% for n in (0..7) -%}
{% assign tint = m | times: 8 | plus: n -%}
{% assign keyx = m | divided_by: 2 -%}
{% assign keyy = tint | modulo: 16 -%}
<g id="test{{tint}}" class="tint{{tint}}">
<rect class="tintbox" x="{{n | times: 80 | plus: 10}}" y="{{m | times: 120 | plus:10}}" width="60" height="50" />
<text x="{{n | times: 80 | plus: 40}}" y="{{m | times: 120 | plus:30}}">box {{tint}}</text>
<path class="tintline" d="M{{n | times: 66}},{{m | times: 120 | plus:80}}
      c20,40 40,-40 60,10
      c20,40 40,-40 60,10
      c20,40 40,-40 60,10" />
<circle class="tintbox" cx="{{keyx | times: 90 | plus: 660}}" cy="{{keyy | times: 30 | plus: 20}}" r="10" />
<text x="{{keyx | times: 90 | plus: 700}}" y="{{keyy | times: 30 | plus: 18}}">label {{tint}}</text>
<path class="tintline" d="M{{keyx | times: 90 | plus: 675}} {{keyy | times: 30 | plus: 25}} h50" />
</g>
{% endfor %}
{%- endfor %}
</defs>
{% for n in (0..31) -%}
<use class="hlset" href="#test{{n}}" />
{%- endfor %}
</svg>

{% capture testimg %}
<svg width="900" viewbox="0 0 900 480">
{%- for n in (0..31) -%}
<use class="hlset" href="#test{{n}}" />
{%- endfor -%}
</svg>
{% endcapture %}

<div style="background:white;color:black;"> {{testimg}} </div>
<div style="background:#aaa;color:black;"> {{testimg}} </div>
<div style="background:navy;color:yellow;"> {{testimg}} </div>
<div style="background:black;color:white;"> {{testimg}} </div>
