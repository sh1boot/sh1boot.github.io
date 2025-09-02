---
layout: post
title: Initialisation at declaration considered harmful
description: Why I think initialising variables at declaration is not such a good idea as people seem to think it is.
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
result in that case as well?

```c++
int x;  // will definitely get overwritten
if (some_circumstances) x = particular_value;
if (some_other_circumstances) x = different_value;
if (unusual_circumstances) x = spooky_value;
int y = f(x);
```

Well, you could initialise `x` with a value so absurd that the mistake
was bound to be highly visible in some way or other.  Perhaps by
crashing or triggering an `assert()`, or for floats you could use `NAN`,
or whatever.

That's problematic if your type can only represent legal and appropriate
values.  You could use a bigger type as a temporary, or you can go
out-of-band by using `std::optional<>` which includes a separate flag
saying whether or not the variable has been initialised.  But these
require that extra checks be _manually_ implemented before the variable
is used.  Otherwise they'll likely produce silent failures of their own.
And checks might not be put in all the necessary places, because they're
a _manual_ effort.

The thing is, though, leaving the variable uninitialised _is_ setting it
to an illegal value which the compiler will try to prove cannot escape.
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

The compiler's not going to get all of them, and the static analyser
might miss something too, so being the diligent you that you are you'll
hopefully catch the remaining cases when you run your unit tests with
`-fsanitize=memory`.

But if you do initialise the variable before you know what should be in
that variable, then those checks will never work.  You can introduce
bugs which cause the initialiser you chose (before you knew what the
value should be) to become the final value, and neither the compiler nor
the sanitiser will be able to tell you that you've done so.  You'd have
been better off knowing you just broke something, but instead you'll
just get that "safe" value you initialised with.

Modern tooling has made an uninitialised variable the implicit
signalling illegal state.  But it's also long-established bad style, so
people have put time and effort into hiding bugs which would have been
surfaced by the tools had they _not_ tried to improve their code.

It's unfortunate that there's no consistent way to _explicitly_ declare
a variable as having an illegal state which should raise an error if
it's used.  There are well-known values like `nullptr`, `NAN`,
`std::numeric_limits<T>::signaling_NaN`, maybe `T::end()`, etc., but all
the integers get is something ad-hoc like `-1` or `std::optional<>`
which need extra run-time checks everywhere.

I would prefer explicit syntax for "I don't know yet" initialisers which
still allow the tools to do their job but can drop in default fill
values when the tools reach their limits.  Like C++26's [erroneous
behaviour][], but made explicit so as to stave off those generic
"uninitialised variable" warnings.  Perhaps name it `undecided<T>{}` or
`uncommitted<T>{}`, with an optional value argument if you don't want to
leave that choice to the implementation, reflecting that the developer
hasn't chosen a value and any attempt to read it before it changes would
be a mistake, but without implying that it could be uninitialised.

[erroneous behaviour]: <https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p2795r5.html>
