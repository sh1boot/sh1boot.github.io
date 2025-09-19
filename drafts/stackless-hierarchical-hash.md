---
layout: post
title: How to maintain magic, secret numbers without a stack.
---
Suppose you want to traverse a tree, like a function call graph (say
you're a CPU and you're actually executing the code -- that's a tree
traversal) and you need a magic number for each node, but you don't want
to spend extra storage on a stack of extra numbers.

All you need is a reversible transform of some sort.  Say a CRC or a
lightweight tweakable cypher.

On descent you set `h = F(h,o)`, on return you set `h = F^-1(h,o)`,
where `o` is a hash, or a pointer, or a hash of a pointer, of the object
you descend into.  These should both be things you know both at the
beginning and end of the visit (even if, yes, you did have to stack the
object itself while you iterated).

You can replace `o` with a return address of a function call to make
sure every call site into the same function is unique, because the
return address is still the absolute last thing a function must be able
to remember.  Unless it's doing tail call optimisation; but that's fine,
because the return address is just the return address of the last
function to _not_ end with a jump to another function.
