---
layout: page
title: Messing about with SVG.
svg: true
---
Hello.

<svg width="10" viewbox="0 0 799 479">
<defs>
{% for m in (0..3) %}
{% for n in (0..7) %}
{% assign tint = m | times: 8 | plus: n %}
<g id="test{{tint}}" class="tint{{tint}}">
<rect class="tintbox" x="{{n | times: 80 | plus: 10}}" y="{{m | times: 120 | plus:10}}" width="60" height="50" />
<text x="{{n | times: 80 | plus: 40}}" y="{{m | times: 120 | plus:30}}">box {{tint}}</text>
<circle class="tintbox" cx="660" cy="{{tint | times: 30 | plus: 20}}" r="10" />
<text x="700" y="{{tint | times: 30 | plus: 18}}">label {{tint}}</text>
<path class="tintline" d="M675 {{tint | times: 30 | plus: 25}} h50" />
<path class="tintline" d="M{{n | times: 80 | minus: 40}},{{m | times: 120 | plus:80}}
      c9,20 18,-25 27,5
      c9,20 18,-25 27,5
      c9,20 18,-25 27,5
      c9,20 18,-25 27,5
      c9,20 18,-25 27,5
      c9,20 18,-25 27,5" />
</g>
{% endfor %}
{% endfor %}
</defs>
</svg>

{% capture testimg %}
<svg width="800" viewbox="0 0 799 479">
{% for n in (0..31) %}
<use class="hlset" href="#test{{n}}" />
{% endfor %}
</svg>
{% endcapture %}

{{testimg}}

<div style="background:white;color:black;"> {{testimg}} </div>
<div style="background:#aaa;color:black;"> {{testimg}} </div>
<div style="background:navy;color:yellow;"> {{testimg}} </div>
<div style="background:black;color:white;"> {{testimg}} </div>
