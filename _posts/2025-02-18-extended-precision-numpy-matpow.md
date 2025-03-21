---
last_modified_at: Sat, 22 Feb 2025 18:03:07 -0800  # a55fae3 improved-modshl
layout: post
title: Extending range of numpy modular arithmetic
tags: numpy
---
A frustration with numpy is that its `pow()` implementation doesn't
support modular arithmetic.

Another frustration is that its integers only go up to 64-bit, so it
overflows really quickly if you're calculating `pow()` _without_ using
modular arithmetic.

You can mitigate that a little by implementing `pow()` manually, but for
large-ish modulo it's still possible to overflow the intermediates even
while regularly reducing the range between matrix operations.

So knowing that there's a basic technique for extending multiplication
beyond the size of the native data types you have, where you slice each
input into high and low parts and multiply these together the way you
learned in primary school, and which looks a bit like this:

```python
def mul(a, b):
  shift = 32
  mask = (1 << shift) - 1
  lo = (a & mask) * (b & mask)
  m0 = (a >> shift) * (b & mask)
  m1 = (a & mask) * (b >> shift)
  hi = (a >> shift) * (b >> shift)

  c = lo >> shift
  lo &= mask
  c += (m0 & mask) + (m1 & mask)
  lo |= (c & mask) << shift
  c >>= shift
  c += (m0 >> shift) + (m1 >> shift)
  hi += c
  assert a * b == lo + (hi << (shift * 2))
  return (lo, hi)
```

It turns out you can do exactly this trick but with modular matrix
arithmetic in much the same way.  Moreover you can continue to use numpy
to implement it; you just end up doing the multi-step approach on the
_outside_ of the iteration through the matrices rather than on the
inside the way `dtype=object` probably would.

This way you still use whatever accelerated implementation is behind the
64-bit numpy matrix multiplication; just in a few extra passes, and then
mash the results together with a bit of careful modular arithmetic
without overflow -- also vectorised by numpy.

### How?

First, if you only want array multiplication rather than matrix, you can
stick with `shift=32`, because it doesn't have those internal row/column
sums to make things worse.  For matrix multiplication, however, the
overflow ceiling is a little lower and `shift=32` will not do...

```python
def matmul(a, b, m):
  dim = a.shape[0]

  # if this isn't true then you know what you have to do
  assert (a < m).all() and (b < m).all()

  # largest acceptable value in a matrix of size dim x dim
  max_value = math.isqrt(0xffffffffffffffff // dim)

  # largest power of two not exceeding that
  shift = (max_value + 1).bit_length() - 1
  mask = (1 << shift) - 1

  # number of chunks values must be broken into to avoid overflow
  stages = (int(m).bit_length() + shift - 1) // shift
  # if it's just one chunk we don't need to do anything special
  if stages == 1:
    return a @ b % m
  # if it's more than two chunks this code isn't special enough
  if stages > 2:
    raise NotImplementedError(f"Need {stages=} implementation.")

  # Quick-and-dirty solution to implementing the shift left within the
  # modular range.
  def modshl(x, i, m=m, step=64-int(m).bit_length()):
    while i > 0:
      step = min(step, i)
      x %= m
      x <<= step
      i -= step
    return x

  alo = (a & mask).astype(numpy.uint64, casting='safe')
  ahi = (a >> shift).astype(numpy.uint64, casting='safe')
  blo = (b & mask).astype(numpy.uint64, casting='safe')
  bhi = (b >> shift).astype(numpy.uint64, casting='safe')

  # the matrix multiply operations:
  lo = alo @ blo
  m0 = ahi @ blo
  m1 = alo @ bhi
  hi = ahi @ bhi

  c = lo >> shift
  lo &= mask
  c += (m0 & mask) + (m1 & mask)
  lo += modshl((c & mask), shift)
  c >>= shift
  c += (m0 >> shift) + (m1 >> shift)
  hi += c
  return (lo + modshl(hi, shift * 2)) % m
```

And that should "just work" for modular matrix multiplictaion for `m`
approaching `2**62` or thereabouts, depending on the size of the matrix.
Not all that different from the scalar multiply above, but this time all
the operators are vector and matrix operations.  And there's the modular
reduction of the result.

This implementation of `modshl()` is questionable, but it'll get the job
done.  There are ranges of `m` which allow smarter implementations, but
that's not the general case.  It's not so bad.  Remember that for large
matrices the bulk of the time is going to be in the matrix
multiplication operations, rather than all this support cruft.

A potentially better way to shift left mod m is:

```python
mhi = m >> shift
mlo = m & ((1 << shift) - 1)
d, x = np.divmod(x, mhi)
x <<= shift
x -= d * mlo
```

But you have to be careful that `d * mlo` doesn't overflow; which
effectively means ensuring that `mlo` is less than `mhi`, by clamping
`shift` and doing multiple rounds, _or_ that x starts at a value which
restricts the maximum result for `d` to a value which can't overflow.

It gets fiddly.

Oh, and you might want a `matpow()` to copy-paste.  Let's see if I can
write it correctly on my first try without checking:

```python
def matpow(a, i, m):
  p = numpy.identity(a.shape[0], dtype=uint64)
  while i > 0:
    i, z = divmod(i, 2)
    if z:
      p = matmul(p, a, m)
    a = matmul(a, a, m)
  return p
```

There.  Bound to work!

Is it actually faster than `dtype=object`?  Yes for large matrices.  how
large the matrix has to be to benefit depends on `m`.  if it's very
large then the implementation of `modshl()` has to take more steps which
slows things down.  I need to think about a better general solution for
that part.

A quick test shows this implementation is about twice the speed of
`dtype=object` for `m=28059810762433, dim=12`.

I used this in my [nblfsr][] [search code][nblfsr code].

[nblfsr]: </non-binary-linear-feedback-shift-registers/>
[nblfsr code]: <https://github.com/sh1boot/nblfsr/nblfsr.py>
