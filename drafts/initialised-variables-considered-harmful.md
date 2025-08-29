---
layout: post
title: Initialisation at declaration considered harmful
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
Undefined Behaviour.  Perhaps `some_circumstances` wasn't the only case we should have addressed, here.

Conventional wisdom says you should avoid this situation by always
initialising your variables when you define them:

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

Well, you could initialise `x` with a value so absurd that the error was
bound to be highly visible in some way or other.  Perhaps by crashing or triggering
an `assert()`, or for floats you could use `NAN`, or whatever.

That's problematic if your type can only represent legal and
appropriate values.  You could use a bigger type
as a temporary,
or you can go out-of-band by using
`std::optional<>` which includes a separate flag saying whether or not
the variable has been initialised.  But that has consequences on syntax, which is annoying,
and it's not efficient in arrays.  It may not even be usable -- is there
any `std::array_of_optionals<>` with contiguous value storage?

Generally `std::optional<>` should have no performance impact
where the compiler can prove that the uninitialised case
never escapes, which is the intent of a correctly-formed program anyway; but 
I have less optimism for arrays[^1].

The thing is, though, on any worthwhile compiler leaving the variable
uninitialised _is_ setting it to an illegal value which the compiler will try to
prove cannot escape.  If `(some_circumstances ||
some_other_circumstances || unusual_circumstances)` isn't provably true
then the compiler will gripe about this and you'll have to revisit the
code and make it right.
This is most valuable if the code was clean before you made changes
and suddenly this warning turns up.

And if the compiler can't decide, maybe because the type is an array or whatever, then being 
the diligent you that you are you'll catch it when you run your unit tests
with `-fsanitize=memory`.

But if you do initialise the variable before you know what should be in
that variable, then those checks will never work.  You can introduce
bugs which cause the initialiser to become the final value and neither
the compiler nor the sanitiser will be able to tell you that you've done
so.  You'd have been better off knowing you just broke something, but
instead you'll just get that "safe" value you initialised with.

Modern tooling has made an uninitialised variable the implicit signalling
illegal state.  But it's also long-established
bad style, so people have put time and effort into hiding bugs which
would have been surfaced by the tools had they _not_ tried to
improve their code.

It's unfortunate that there's no consistent way to _explicitly_ declare a
variable as having an illegal state which should raise an error if it's
used.  There are well-known values like `nullptr`, `NAN`,
`std::numeric_limits<T>::signaling_NaN`, maybe `T::end()`, etc.,
but all the integers get is something ad-hoc like `-1`.
Only `std::optional<>` comes with a clear
statement that
the value is genuinely absent, but it demands compromises and is limited to run-time checking.

I would prefer explicit syntax for "I don't know yet" initialisers which still allow the tools to do their job but can drop in default fill values when the tools reach their limits.  Like C++26's [erroneous behaviour][], but made explicit so as to stave off those generic "uninitialised variable" warnings.  Perhaps name it `undecided<T>{}` or `uncommitted<T>{}`, with an optional value argument if you don't want to leave that choice to the implementation, reflecting that the developer hasn't chosen a value and any attempt to read it before it changes would be a mistake, but without implying that it could be uninitialised.

[^1]: Perhaps this will improve under pressure from promises made by C++26.

[erroneous behaviour]: <https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p2795r5.html>
