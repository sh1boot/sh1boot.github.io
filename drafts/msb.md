---
layout: post
title: Why highest-set-bit is better than count-leading-zeroes
svg: true
---

I do not like count-leading-zeroes (`clz`) as a machine instruction.  I
think it's clumsy and unergonomic and fails to justify itself in any
practical applications that I can think of.

`clz` tells you how many zero bits there are starting at the most
significant bit of a word and counting downwards until it encounters a
bit which is not set to zero.

<div class="bitfield">
{%- assign bits = "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 1 1 1 0 0 0 0 0 0" | split: " " -%}
{%- assign msb = 10 -%}
{%- assign clztint = 1 -%}
{%- assign msbtint = 4 -%}
{%- assign slots = 32 -%}
{%- assign cw = 26 -%}
{%- assign ch = 26 -%}
{%- assign pad = 2 -%}
{%- assign half = cw | divided_by: 2 -%}
{%- assign w = bits.size -%}
{%- assign base = slots | minus: w -%}
{%- assign clz = w | minus: 1 | minus: msb -%}
{%- assign colMsb = slots | minus: 1 | minus: msb -%}
{%- assign xMsbLeft = colMsb | times: cw | plus: pad -%}
{%- assign xWordLeft = base | times: cw | plus: pad -%}
{%- assign xMsbCenter = xMsbLeft | plus: half -%}
{%- assign braceMid = xWordLeft | plus: xMsbLeft | divided_by: 2 -%}
{%- assign W = slots | times: cw | plus: pad | plus: pad -%}
<svg width="100%" height="70" viewBox="0 0 {{ W }} 70">
<title>Bit layout of a {{ w }}-bit word</title>
<desc>Highest set bit is bit {{ msb }}; count-leading-zeros is {{ clz }} at this width.</desc>
<g class="hlset tint{{ clztint }}">
{%- for b in bits -%}
{%- assign idx = w | minus: 1 | minus: forloop.index0 -%}
{%- if idx > msb -%}
{%- assign x = base | plus: forloop.index0 | times: cw | plus: pad -%}
<rect class="tintbox" x="{{ x }}" y="18" width="{{ cw }}" height="{{ ch }}"/>
{%- endif -%}
{%- endfor -%}
<path class="tintline" d="M{{ xWordLeft }},47 V51 H{{ xMsbLeft }} V47"/>
<text x="{{ braceMid }}" y="61" font-size="13" font-weight="600" style="fill:var(--tinted-stroke)">clz = {{ clz }}</text>
</g>
<g class="hlset tint{{ msbtint }}">
<rect class="tintbox" x="{{ xMsbLeft }}" y="18" width="{{ cw }}" height="{{ ch }}"/>
<path class="tintline" d="M{{ xMsbCenter }},45 V51"/>
<text x="{{ xMsbCenter }}" y="61" font-size="13" font-weight="600" style="fill:var(--tinted-stroke)">msb = {{ msb }}</text>
</g>
{%- for b in bits -%}
{%- assign idx = w | minus: 1 | minus: forloop.index0 -%}
{%- if idx < msb -%}
{%- assign x = base | plus: forloop.index0 | times: cw | plus: pad -%}
<rect x="{{ x }}" y="18" width="{{ cw }}" height="{{ ch }}"/>
{%- endif -%}
{%- endfor -%}
{%- for b in bits -%}
{%- assign x = base | plus: forloop.index0 | times: cw | plus: pad -%}
{%- assign xc = x | plus: half -%}
<text x="{{ xc }}" y="31" font-size="15">{{ b }}</text>
{%- endfor -%}
{%- for b in bits -%}
{%- assign x = base | plus: forloop.index0 | times: cw | plus: pad -%}
{%- assign xc = x | plus: half -%}
{%- assign idx = w | minus: 1 | minus: forloop.index0 -%}
<text x="{{ xc }}" y="9" font-size="11" fill-opacity=".55">{{ idx }}</text>
{%- endfor -%}
</svg>
</div>

<div class="bitfield">
{%- assign bits = "0 0 0 0 0 1 0 1 1 1 0 0 0 0 0 0" | split: " " -%}
{%- assign msb = 10 -%}
{%- assign clztint = 1 -%}
{%- assign msbtint = 4 -%}
{%- assign slots = 32 -%}
{%- assign cw = 26 -%}
{%- assign ch = 26 -%}
{%- assign pad = 2 -%}
{%- assign half = cw | divided_by: 2 -%}
{%- assign w = bits.size -%}
{%- assign base = slots | minus: w -%}
{%- assign clz = w | minus: 1 | minus: msb -%}
{%- assign colMsb = slots | minus: 1 | minus: msb -%}
{%- assign xMsbLeft = colMsb | times: cw | plus: pad -%}
{%- assign xWordLeft = base | times: cw | plus: pad -%}
{%- assign xMsbCenter = xMsbLeft | plus: half -%}
{%- assign braceMid = xWordLeft | plus: xMsbLeft | divided_by: 2 -%}
{%- assign W = slots | times: cw | plus: pad | plus: pad -%}
<svg role="img" aria-label="{{ w }}-bit word, msb at bit {{ msb }}, clz {{ clz }}" viewBox="0 0 {{ W }} 70" width="{{ W }}" height="70" style="max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">
<title>Bit layout of a {{ w }}-bit word</title>
<desc>Highest set bit is bit {{ msb }}; count-leading-zeros is {{ clz }} at this width.</desc>
<g class="hlset tint{{ clztint }}">
{%- for b in bits -%}
{%- assign idx = w | minus: 1 | minus: forloop.index0 -%}
{%- if idx > msb -%}
{%- assign x = base | plus: forloop.index0 | times: cw | plus: pad -%}
<rect class="tintbox" x="{{ x }}" y="18" width="{{ cw }}" height="{{ ch }}"/>
{%- endif -%}
{%- endfor -%}
<path class="tintline" d="M{{ xWordLeft }},47 V51 H{{ xMsbLeft }} V47"/>
<text x="{{ braceMid }}" y="61" font-size="13" font-weight="600" style="fill:var(--tinted-stroke)">clz = {{ clz }}</text>
</g>
<g class="hlset tint{{ msbtint }}">
<rect class="tintbox" x="{{ xMsbLeft }}" y="18" width="{{ cw }}" height="{{ ch }}"/>
<path class="tintline" d="M{{ xMsbCenter }},45 V51"/>
<text x="{{ xMsbCenter }}" y="61" font-size="13" font-weight="600" style="fill:var(--tinted-stroke)">msb = {{ msb }}</text>
</g>
{%- for b in bits -%}
{%- assign idx = w | minus: 1 | minus: forloop.index0 -%}
{%- if idx < msb -%}
{%- assign x = base | plus: forloop.index0 | times: cw | plus: pad -%}
<rect x="{{ x }}" y="18" width="{{ cw }}" height="{{ ch }}"/>
{%- endif -%}
{%- endfor -%}
{%- for b in bits -%}
{%- assign x = base | plus: forloop.index0 | times: cw | plus: pad -%}
{%- assign xc = x | plus: half -%}
<text x="{{ xc }}" y="31" font-size="15">{{ b }}</text>
{%- endfor -%}
{%- for b in bits -%}
{%- assign x = base | plus: forloop.index0 | times: cw | plus: pad -%}
{%- assign xc = x | plus: half -%}
{%- assign idx = w | minus: 1 | minus: forloop.index0 -%}
<text x="{{ xc }}" y="9" font-size="11" fill-opacity=".55">{{ idx }}</text>
{%- endfor -%}
</svg>
</div>

This tells you how many bits you can shift the value left without
overflow, which sounds good but that's not always as useful as it
sounds.

If you perform that shift then you'll find you're always leaving the
"top" bit set (unless the original input was zero).  Knowing it's always
set means you often don't care to save it, and you're happy to shove it
off the end and forget about it.  In that case `clz(input) + 1` is the
shift amount you really want.  So even for this basic operation you
already need to tweak the result before using it.

If you're doing anything else then that fixup probably folds into
another operation.  Like, maybe you're normalising things to 12-bit, not
to the word size you started with.  Then you really want to shift by
`12 - (WORD_SIZE - clz(input) + 1)`, which simplifies to
`clz(input) - (WORD_SIZE - 13)`.

Around and around we go with numerous hypothetical use cases, but we
almost always end up doing some kind of fix-up which simplifies down to
a single add or subtract of a constant on the result of the `clz`
operation; and nothing seems too terrible about all that.

Except... if we're already on the hook for a fix-up in almost every
situation then why not just say what you mean in the first place?  `msb`
tells us the bit index (weight) of the most significant set bit.  So why
not just shift by `12 - msb(x)` to place the msb in bit 12 of the
result?

It happens to implement `floor(log2(x))` for integers, and doesn't bring
in word-size considerations unnecessarily.  You insert word size
constants yourself when trying to bit-pack according to your intent,
rather than according to an implementation detail.  So the result of the
operation is consistent across data types and platforms.

In my experience it has minimal effect on compiled code size, but it
comes out much more succint in the source, and it's easier to reason
about, and I doubt the hardware cares at all about the difference in
implementation cost.  Architectures can use zero-extension to re-use
the logic on different sizes if need be, and C type promotion can't trip
you up.
