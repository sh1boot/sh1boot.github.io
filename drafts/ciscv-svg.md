---
layout: post
title: Provisional CISC-V instruction set
svg: true
---

<style>
.ins-box-rd {
    --tint: 1;
    stop-color: var(--tinted-fill);
}
.ins-box-rs {
    --tint: 2;
    stop-color: var(--tinted-fill);
}
.ins-box-rsd {
    --tint: 2;
    --tint-b: 1;
    fill: url("#RSDGradient");
}

.ins-box-imm {
    --tint: 3;
}
.opcodes td,th {
  width: 4em;
}
</style>
<svg>
<defs>
<LinearGradient id="RSDGradient" x1="0" y1="0.2" x2="1" y2="0.8">
<stop class="ins-box-rs" offset="30%" />
<stop class="ins-box-rd" offset="70%" />
</LinearGradient>
</defs>
</svg>


{% for frame in site.data.ciscv-proto.frames %}
### {{ frame.name }}
{{ frame.does }}

{% comment %}
<pre>
{{ frame.layout }}
</pre>

- {{frame.fixed | inspect}}
{% endcomment %}
{% assign bw = 18 %}
{% assign frame_count = frame.templates.size | plus: 0 %}
{% assign svg_height = frame_count | times: 50 | plus: 20 %}
<svg width="100%" height="{{svg_height}}" viewbox="0 0 800 {{svg_height}}">
{% for template in frame.templates %}
  {% assign vpos = forloop.index0 | times: 50 | plus: 18 %}
  {% assign vcentre = vpos | plus: 12 %}

  {% for field in frame.fixed %}
    {% assign topbit = field.range[0] | plus: 0 %}
    {% assign botbit = field.range[1] | plus: 0 %}
    {% assign bits = topbit | minus: botbit | plus: 1 %}
    {% assign hpos = topbit | times: -1 | plus: 31 | times: bw | plus: 2 %}
    {% assign width = bits | times: bw %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="24" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.value}}</text>
  {% endfor %}

  {% assign vpos = forloop.index0 | times: 50 | plus: 10 %}
  {% assign vcentre = vpos | plus: 10 %}
  {% for field in template.a.fields %}
    {% assign topbit = field.range[0] | plus: 0 %}
    {% assign botbit = field.range[1] | plus: 0 %}
    {% assign bits = field.bits | plus: 0 %}
    {% assign hpos = topbit | times: -1 | plus: 31 | times: bw | plus: 2 %}
    {% assign width = bits | times: bw %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="20" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.name}}</text>
  {% endfor %}
  {% if template.a.implicit %}
  {% assign hpos = 580 %}
  {% assign width = 40 %}
  {% for field in template.a.implicit %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="20" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.name}}</text>
    {% assign hpos = hpos | plus: width %}
  {% endfor %}
  {% endif %}
  <text x="662" y="{{vcentre}}" style="text-anchor:start;font-family=monospace;font-size:small;"> {{template.a.template}}</text>

  {% assign vpos = vpos | plus: 20 %}
  {% assign vcentre = vpos | plus: 10 %}
  {% assign hpos = 10 %}
  {% for field in template.b.fields %}
    {% assign topbit = field.range[0] | plus: 0 %}
    {% assign botbit = field.range[1] | plus: 0 %}
    {% assign bits = field.bits | plus: 0 %}
    {% assign hpos = topbit | times: -1 | plus: 31 | times: bw | plus: 2 %}
    {% assign width = bits | times: bw %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="20" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.name}}</text>
    {% assign hpos = hpos | plus: width %}
  {% endfor %}
  {% if template.b.implicit %}
  {% assign hpos = 580 %}
  {% assign width = 40 %}
  {% for field in template.b.implicit %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="20" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.name}}</text>
    {% assign hpos = hpos | plus: width %}
  {% endfor %}
  {% endif %}
  <text x="662" y="{{vcentre}}" style="text-anchor:start;font-family=monospace;font-size:small;"> {{template.b.template}}</text>
{% endfor %}
</svg>

<div style="display:flex;flex-wrap:wrap;gap:1em;">
{% for opset in frame.opcodes %}
{% assign at = opset.at | plus: 0 %}
{% if opset.pairs %}
<table class="opcodes" style="width:auto;">
  <tr><th>slot A</th><th>slot B</th><th>p=</th></tr>
  {% for pair in opset.pairs %}
  <tr>
  <td>{{pair.a.op}}</td><td>{{pair.b.op}}
      {%- if pair.n > 1 %}<span style="font-weight:normal;">&nbsp;&times;{{ pair.n }}</span>{% endif -%}
  </td><td>{{pair.at | plus: at}}</td>
  </tr>
  {% endfor %}
</table>
{% else %}
<table class="opcodes" style="width:auto;">
  {% assign width = 0 %}
  <tr style="font-size:small;text-align:center;"><th>slot B</th><th colspan="999">slot A</th></tr>
  <tr><th></th>
  {% for a in opset.a %}
    {% assign width = width | plus: a.n %}
    <th>{{a.op}}
        {%- if a.n > 1 %}<span style="font-weight:normal;">&nbsp;&times;{{ a.n }}</span>{% endif -%}
    </th>
  {% endfor %} </tr>
  {% for b in opset.b %}
  {% assign offset = b.at | times: width | plus: at %}
  <tr><th>{{b.op}}
          {%- if b.n > 1 %}<span style="font-weight:normal;">&nbsp;&times;{{ b.n }}</span>{% endif -%}
      </th>
  {% for a in opset.a %}
    <td>{{ offset }}</td>
    {% assign offset = offset | plus: a.n %}
  {% endfor %} </tr>
  {% endfor %}
</table>
{% endif %}
{% endfor %}
</div>

{%- endfor %}

## The End
