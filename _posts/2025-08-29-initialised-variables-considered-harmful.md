---
layout: post
title: Initialisation at declaration considered harmful
excerpt: The trouble with always initialising variables at definition, and how it weakens tools which should be there to help you diagnose logic errors.
redirect_from:
  - /drafts/initialised-variables-considered-harmful/
  - /initialized-variables-considered-harmful/
---
Suppose you have a variable `x`.

```c++
int x;
```

Hello `x`.

Now suppose you decide that under some circumstances `x` should have a
particular value.

```c++
if (some_circumstances) x = particular_value;
```

And later on `x`'s good buddy `y` wants to have it's own value based
on`x`'s value.

```c++
int y = f(x);
```

Hey `y`, how's it going?  What's that?  You say you don't feel so good?

Oh dear.  It looks like somebody's coming down with a touch of the
Undefined Behaviour.  Perhaps `some_circumstances` wasn't the only case
we should have addressed, here.

Conventional wisdom says you should avoid this situation by always
initialising your variables when you define them.  Ideally you do this
by declaring them only when you know what they should be.  But sometimes
you have only partial information when you want to put a value in there,
and so in the alternate case you can only make something up:

```c++
int x = 0;
if (some_circumstances) x = particular_value;
int y = f(x);
```

But what if your intention was not to set `y` to `f(0)`?  What if the real
bug was in failing to consider another case and come up with a suitable
result in that case as well?  What if `x` was actually a `uid_t`?
Should a uid be initialised to zero as a "safe default" in the case of
logic bugs?

Well, you could initialise `x` with a value so absurd that the mistake
was bound to be highly visible in some way or other.  Good choices are
signalling NaNs, `nullptr`, etc., or something you'll eventually catch
in an `assert()` eventually (if you remember).  That's problematic if
your type can only represent legal and appropriate values (very often
the case for DSP work).

You could use a bigger type as a temporary, or use `std::optional<>`
which includes an explicit flag saying whether or not the variable has
been initialised.  But these require that extra checks be _manually_
implemented before the variable is used.  Otherwise they'll likely
produce silent failures of their own.  And checks might not be put in
all the necessary places, because they're a _manual_ effort.

The thing is, though, leaving the variable uninitialised _is_ setting it
to an illegal value which the compiler will try to prove cannot escape:

```c++
int x;  // will definitely get overwritten
if (some_circumstances) x = particular_value;
if (some_other_circumstances) x = different_value;
if (unusual_circumstances) x = spooky_value;
int y = f(x);
```

Ideally, if `(some_circumstances || some_other_circumstances ||
unusual_circumstances)` isn't provably true then the compiler will gripe
about this and you'll have to revisit the code and make it right.  This
is most valuable if the code was clean before you made changes and
afterwards this warning suddenly turns up.

Sadly, Clang and GCC really only care if they're going to produce an
undefined value, and with optimisations enabled most of these cases are
obviated by replacing predicates with constants.  That might cover
security vulnerabilities but it's no help with logic bugs.  To get the
job done properly you need to run Clang with `--analyze`, or use your
own favourite static analyser.

Clearly the compiler's still not going to get all of them, and the
static analyser might miss something too, so being the diligent you that
you are you'll hopefully catch the remaining cases when you run your
unit tests with `-fsanitize=memory`.

But if you do initialise the variable before you know what should be in
that variable, then those checks will never work.  Consequently you can
introduce bugs which cause the initialiser you chose (before you knew
what the value should be) to become the final value, and neither the
compiler nor the sanitiser will be able to tell you that you've done so.
You'd have been better off knowing you just broke something, but instead
you'll just get that "safe" value you initialised with.

Modern tooling has made an uninitialised variable the implicit
signalling illegal state.  But it's also long-established bad style, so
people have put time and effort into hiding bugs which would have been
surfaced by the tools had they _not_ tried to improve their code.

It's unfortunate that there's no consistent way to _explicitly_ declare
a variable as having an illegal state which should raise an error if
it's used.  All we have is well-known ad-hoc solutions like `nullptr`,
`NAN`, `std::numeric_limits<T>::signaling_NaN`, maybe `T::end()`, etc..

I would prefer explicit syntax for "I don't know yet" initialisers which
still allow the tools to do their job but can drop in default fill
values when the tools reach their limits.  Like C++26's [erroneous
behaviour][], but made explicit so as to stave off those generic
"uninitialised variable" warnings.  Perhaps name it `undecided<T>{}` or
`uncommitted<T>{}` or `provisional<T>{}`, with an optional value
argument if you don't want to leave that choice to the implementation,
reflecting that the developer hasn't chosen a value and any attempt to
read it before it changes would be a mistake, but without implying that
it could be uninitialised.

```c++
int x = uncommitted<int>{};
if (some_circumstances) x = particular_value;
if (some_other_circumstances) x = different_value;
if (unusual_circumstances) x = spooky_value;
int y = f(x);  // invoke C++26 erroneous behaviour as needed
```

Ideally the compiler or static analyser would pick up any oversights in
that logic.  If not, `-fsanitize=memory` might pick it up provided you
have a test case that covers it.  If not, then a default value is
inserted as chosen by `uncommitted<int>{}`, or the value you specify if
you choose to do so (even though you've clearly never tested it).  One
might expect `uncomitted<float>{}` to choose a signalling NaN and any
pointer type to choose `nullptr`.

C++26 might achieve that if you leave the variable uninitialised at
definition, but that just looks like a mistake, and it's a landmine if
you don't have your compiler configured appropriately.


[erroneous behaviour]: <https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p2795r5.html>
