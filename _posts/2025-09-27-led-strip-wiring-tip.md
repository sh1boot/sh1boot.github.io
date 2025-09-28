---
layout: post
title: Getting even light from long LED strips
svg: true
---
Something you may notice for very long runs of LED strip is that they
can be bright at one end and dim at the other.  That's because the
strips are two long power rails with a bit of internal resistance and
current through the LEDs at the far end have more of that resistance to
travel through.

Here's how LED strips are typically wired:
<svg width="100%" viewbox="0 0 799 319">
<style>
@-webkit-keyframes currentAnimation {
  from { stroke-dashoffset: 12; }
  to { stroke-dashoffset: 0; }
}
.component {
    fill: currentColor;
    fill-opacity:0.0625;
}
.hookup-plus {
    stroke: color-mix(in oklab, currentColor, red);
    stroke-width: 3px;
    stroke-linecap: round;
}
.hookup-minus {
    stroke: color-mix(in oklab, currentColor, blue);
    stroke-width: 3px;
    stroke-linecap: round;
}
.current {
    visibility:hidden;
    opacity: 0%;
    stroke-dasharray: 6;
}
.ledcurrent:hover .current {
    visibility:visible;
    opacity: 100%;
    -webkit-animation-name: currentAnimation;
    -webkit-animation-iteration-count: infinite;
    -webkit-animation-duration: 1.5s;
    -webkit-animation-timing-function: linear;
}
</style>
<defs>
        <g id="pos"><path d="m-5,0h10m-5,-5v10" /></g>
        <g id="neg"><path d="m-5,0h10" /></g>
        <g id="batt"><path d="M0,0v20 M-30,20h60 M-20,30h40 M-30,40h60 M-20,50h40 M0,50v20 M15,5v10 M10,10h10"/></g>
        <g id="power"><circle cx="0" cy="35" r="25" /><path d="M0,0v10 M0,60v10"/><use href="#pos" x="0" y="22" /><use href="#neg" x="0" y="48" /></g>
        <g id="powerh"><circle cx="35" cy="0" r="25" /><path d="M0,0h10 M60,0h10"/><use href="#pos" x="22" y="0" /><use href="#neg" x="48" y="0" /></g>
        <g id="led"><path d="M0,0v14 M0,56l-25,-42h50z M-25,56h50 M36,29l2,6l-6,2m6,-2l-12,-7  M31,39l2,6l-6,2m6,-2l-12,-7   M0,56v14" class="component" /></g>
        <g id="lamp"><circle cx="0" cy="35" r="25" /><path d="M-17.6,17.4L17.6,52.6 M17.6,17.4L-17.6,52.6 M0,0v10 M0,60v10 "/></g>
        <g id="resistor"><rect x="-10" y="10" width="20" height="50" /><path d="M0,0v10 M0,60v10 "/></g>
        <g id="ledstack"><use x="0" y="0" href="#led" /><use x="0" y="70" href="#led" /><use x="0" y="140" href="#led" /><use x="0" y="210" href="#resistor" /></g>
</defs>
        <use href="#power" x="40" y="120" />
        <path d="M40,120 C40,50  0, 20 140, 20" class="hookup-plus" />
        <path d="M40,190 C40,250 0,300 140,300" class="hookup-minus" />
        <line x1="140" y1="20" x2="750" y2="20" />
        <use href="#pos" x="145" y="10"/>
        <use href="#pos" x="745" y="10"/>
        <line x1="140" y1="300" x2="750" y2="300" />
        <use href="#neg" x="145" y="290"/>
        <use href="#neg" x="745" y="290"/>
        <use href="#ledstack" x="200" y="20" />
        <use href="#ledstack" x="300" y="20" />
        <use href="#ledstack" x="400" y="20" />
        <use href="#ledstack" x="500" y="20" />
        <use href="#ledstack" x="600" y="20" />
        <use href="#ledstack" x="700" y="20" />
</svg>

The vertical stack of LEDs is distributed along the strip somewhat,
which is why you're restricted to cutting the strip at regular intervals
of every three or six LEDs.

Let's simplify that by treating the LED circuits as lamps:

<svg width="100%" viewbox="0 -10 799 129">
        <use href="#power" x="40" y="20" />
        <path d="M40,20 C40,-20  90,20 140,20" class="hookup-plus" />
        <path d="M40,90 C40,130  90,90 140,90" class="hookup-minus" />
        <line x1="140" y1="20" x2="750" y2="20" />
        <use href="#pos" x="145" y="10"/>
        <use href="#pos" x="745" y="10"/>
        <line x1="140" y1="90" x2="750" y2="90" />
        <use href="#neg" x="145" y="80"/>
        <use href="#neg" x="745" y="80"/>
        <g class="ledcurrent">
        <use href="#lamp" x="200" y="20" />
        <path d="M30,20 C30,-35 90,10 140,10
            H170
            c25,0 30,20 30,45 0,25 -5,45 -30,45
            H140 C90,100, 30,145 30,90" class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="300" y="20" />
        <path d="M30,20 C30,-35 90,10 140,10
            H270
            c25,0 30,20 30,45 0,25 -5,45 -30,45
            H140 C90,100, 30,145 30,90" class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="400" y="20" />
        <path d="M30,20 C30,-35 90,10 140,10
            H370
            c25,0 30,20 30,45 0,25 -5,45 -30,45
            H140 C90,100, 30,145 30,90" class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="500" y="20" />
        <path d="M30,20 C30,-35 90,10 140,10
            H470
            c25,0 30,20 30,45 0,25 -5,45 -30,45
            H140 C90,100, 30,145 30,90" class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="600" y="20" />
        <path d="M30,20 C30,-35 90,10 140,10
            H570
            c25,0 30,20 30,45 0,25 -5,45 -30,45
            H140 C90,100, 30,145 30,90" class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="700" y="20" />
        <path d="M30,20 C30,-35 90,10 140,10
            H670
            c25,0 30,20 30,45 0,25 -5,45 -30,45
            H140 C90,100, 30,145 30,90" class="current" />
        </g>
</svg>

You can hover over a lamp to see how long the circuit is.  The further
you go from the power supply the greater the resistance of the power
rails.

But if you happen to be running the strip in a loop, such that the ends
end up somewhat close to each other, or if you happen to have a heap of
extra wire to run alongside the strip, then there's a simple fix for
that difference in brightness.

Connect one side of the power supply to the near end of the strip, and
connect the other side of the power supply to the far end of the strip.
Be careful to still connect minus to minus and plus to plus, though.
Like so:

<svg width="100%" viewbox="0 0 799 189">
        <use href="#powerh" x="365" y="150" />
        <path d="M375,150 C-105,150  0,20 100,20" class="hookup-plus" />
        <path d="M435,150 C935,150 800,90 700,90" class="hookup-minus" />
        <line x1="100" y1="20" x2="700" y2="20" />
        <use href="#pos" x="105" y="10"/>
        <use href="#pos" x="695" y="10"/>
        <line x1="100" y1="90" x2="700" y2="90" />
        <use href="#neg" x="105" y="80"/>
        <use href="#neg" x="695" y="80"/>
        <g class="ledcurrent">
        <use href="#lamp" x="150" y="20" />
        <path d="M365,160 C-135,160  0,10 100,10
                 H120
                 c25,0 30,20 30,45 0,25 5,45 30,45 H700
                 C 790,100 905,140, 435,140"
            class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="250" y="20" />
        <path d="M365,160 C-135,160  0,10 100,10
                 H220
                 c25,0 30,20 30,45 0,25 5,45 30,45 H700
                 C 790,100 905,140, 435,140"
            class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="350" y="20" />
        <path d="M365,160 C-135,160  0,10 100,10
                 H320
                 c25,0 30,20 30,45 0,25 5,45 30,45 H700
                 C 790,100 905,140, 435,140"
            class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="450" y="20" />
        <path d="M365,160 C-135,160  0,10 100,10
                 H420
                 c25,0 30,20 30,45 0,25 5,45 30,45 H700
                 C 790,100 905,140, 435,140"
            class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="550" y="20" />
        <path d="M365,160 C-135,160  0,10 100,10
                 H520
                 c25,0 30,20 30,45 0,25 5,45 30,45 H700
                 C 790,100 905,140, 435,140"
            class="current" />
        </g>
        <g class="ledcurrent">
        <use href="#lamp" x="650" y="20" />
        <path d="M365,160 C-135,160  0,10 100,10
                 H620
                 c25,0 30,20 30,45 0,25 5,45 30,45 H700
                 C 790,100 905,140, 435,140"
            class="current" />
        </g>
</svg>

This way the length of the circuit through each LED is (approximately)
the same, and so the resistance is the same they all come out the same
brightness all the way along the strip.

You'll see this in some prefabricated lighting strings which are _not_
designed to be cut.  They'll have a third wire which is not be connected
directly to the LEDs, but at the end it'll be connected to one of the
wires which is, and it will complete the circuit from the far end back
to the power supply to balance things out.  If you cut those then they
just don't work anymore, because you would need to reconnect two of the
wires at the same end.

It doesn't matter if the power supply hookup lines are different
lengths.  Having the total length be unnecessarily long will be less
energy efficient, but they affect all the LEDs equally regardless of
whether or not both sides are the same length.

It might be tempting to link both ends of the strip together in tee
intersections with the power supply.  That should work, and you'll get
more light out of the system overall, but you may still see a bit of
dimming in the middle of the loop.
