---
layout: post
title: CISC-V formatting tests
svg: true
---

<style>
.bitfield th,td {
  text-align: center;
  padding: 3px 4px 4px;
}

table .bitfield {
  table-layout: fixed;
  width: 100%;
}
.bitfield .bitfield-note {
  font-family: monospace;
  font-size: smaller;
  text-align: left;
}
.bitfield .bitfield-spacer th {
  font-size: 0;
  line-height: 0;
  padding: 0;
  border: none;
}

.bitfield .bitfield-rowlabel th {
  border-bottom: none;
}
.bitfield .bitfield-index th {
  font-size: x-small;
  font-weight: thin;
  padding: 1px 3px;
}
.bitfield .bitfield-rowlabel + .bitfield-index th {
  border-top: none;
  padding-top: 0;
}
.bitfield .bitfield-index .bit-hi { float: left; }
.bitfield .bitfield-index .bit-lo { float: right; }

.bitfield .bitfield-fields td {
  font-weight: normal;
  padding: 3px 4px 4px;
}
.bitfield .bitfield-footnote td {
  text-align: left;
  padding: 1px 1em;
  border: none;
}
.tint-reg {
    --tint: 1;
    background-color: var(--tinted-fill);
}
.tint-imm {
    --tint: 2;
    background-color: var(--tinted-fill);
}
.tint-op {
    background-color: lightgray;
}
.tint-reserved {
    background-color: gray;
}
.tint-unused {
    background-color: lightgray;
}
.tint-rsrc {
    --tint: 3;
    background-color: var(--tinted-fill);
}
.tint-rdst {
    --tint: 4;
    background-color: var(--tinted-fill);
}
.tint-rsd {
    --tint: 5;
    background-color: var(--tinted-fill);
}
</style>



# ciscv:

{% for frame in site.data.ciscv-proto.frames %}
  {%- assign rows = frame.layout | newline_to_br | strip_nelines | split: '<br />' %}
  {%- capture cooked_string %}
  {%- for row in rows %}
    {%- assign columns = row | split: '│' %}
      {%- if columns.size < 2 %}{% continue %}{% endif %}
      {%- for blob in columns -%}
        {%- assign bits = blob | size | plus: 1 | divided_by: 2 %}
        {%- assign column = blob | strip %}
        {%- if column.size < 1 %}
          {%- if forloop.index0 == 0 %}{% continue %}{% endif %}
          {%- assign type = 'unused' %}
        {%- elsif column contains ',' %}
          {%- assign type = 'template' %}
        {%- elsif column contains 'rsd' %}
          {%- assign type = 'rsd' %}
        {%- elsif column contains 'imm' %}
          {%- assign type = 'imm' %}
        {%- elsif column contains 'rs' %}
          {%- assign type = 'rsrc' %}
        {%- elsif column contains 'rd' %}
          {%- assign type = 'rdst' %}
        {%- else %}
          {%- assign type = 'op' %}
        {%- endif %}
{{-''-}}{{column}}((:)){{bits}}((:)){{type}}((col)){{-''-}}
      {%- endfor %}
{{-''-}}((row)){{-''-}}
  {%- endfor %}
  {%- endcapture %}
## {{frame.name}}
{% assign rows = cooked_string | split: '((row))' %}
<table class="bitfield">
<tr class="bitfield-spacer">
{%- for i in (0..31) %} <th style="width:2.35%;f">{{i | times: -1 | plus: 31}}</th> {%- endfor %}
<th style="width:24.8%">note</th>
</tr>
{%- for row in rows %}
  {%- assign cols = row | split: '((col))' %}
  {%- unless row contains 'template' %}
  <tr class="bitfield-index">
    {%- assign bitpos = 31 -%}
    {%- for blob in cols %}
      {%- assign field = blob | split: '((:))' %}
      {%- assign width = field[1] | default: 0 %}
      {%- assign hi = bitpos -%}
      {%- assign lo = bitpos | minus: width | plus: 1 -%}
      {%- assign bitpos = lo | minus: 1 -%}
      <th colspan="{{width}}">
      {%- if hi != lo %}
      <span class="bit-hi">{{hi}}</span>&hellip;<span class="bit-lo">{{lo}}</span>
      {%- else %}
      {{hi}}
      {%- endif %}
      </th>
      {%- if bitpos < 0 %}{% break %}{% endif %}
    {%- endfor %}
  </tr>
  {% endunless %}
  <tr class="bitfield-fields">
    {%- assign bitpos = 32 -%}
    {%- for blob in cols %}
      {%- assign field = blob | split: '((:))' %}
      {%- assign name = field[0] %}
      {%- assign width = field[1] %}
      {%- assign kind = field[2] %}
      {%- assign bitpos = bitpos | minus: width %}
      <td {% if bitpos >= 0 %}colspan="{{width}}" class="tint-{{kind}}"{% else %}class="bitfield-note"{% endif %}>{{name}}</td>
    {%- endfor %}
  </tr>
{%- endfor %}
</table>
{%- endfor %}

end-of-ciscv


# Overview:

{% include bitfield-table.html layouts=site.data.riscv-basic order="r_type,i_type,s_type,b_type,u_type,j_type" %}


## R-type

{% include bitfield.html layout=site.data.riscv-basic.r_type %}

## I-type

{% include bitfield.html layout=site.data.riscv-basic.i_type %}

## S-type

{% include bitfield.html layout=site.data.riscv-basic.s_type %}

## etc...
