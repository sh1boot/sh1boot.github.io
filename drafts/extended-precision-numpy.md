---
layout: post
title: Extending range of numpy modular arithmetic
---
A frustration with numpy is that its pow() implementation doesn't
support modular arithmetic.

Another frustration is that its integers only go up to 64-bit.  So they
overflow pretty quickly when calculating powers.

You can mitigate the latter by implementing pow() manually, but it's
still pretty easy to overflow the intermediates, even while you're
regularly reducing the range of the numbers.

So there's a basic technique for extending multiplication beyond the
size of the native data types you have where you slice each input into
high and low parts and multiply these together the way you learned in
primary school.  As it turns out you can do exactly this trick with
modular matrix arithmetic in almost exactly the same way, so you still
use whatever accelerated implementation is behind the 64-bit matrix
multiplication, and mash the results together with a bit of careful
modular arithmetic without overflow.

TODO: show the code
