---
layout: post
title: Weighting 3d prints
tags: 3d-printing
---

I wanted to add some weight to 3D prints to stop them blowing away in
the wind, so I looked around and settled on some washers I already had.
Only when I needed more of them did I realise that washers really
weren't a cheap option.  So how much should ballast cost?

## bulk guide prices

I started by looking at bulk retail prices for various materials,
without regard to how much I would have to buy.  Also, without much
regard to whether or not AI was telling me the truth.

| Material              | Best retail price (USD/kg) | Density[^1] (g/cm³) | notes |
| :---                  |          ---: | ---: | :--- |
| **Sand**              | $0.03–0.05 *(bulk)*<br/>$0.20–0.35 *(bagged)* | 1.4–1.6 *(dry bulk)* | Loose |
| **Concrete**          | $0.10–0.25    | 2.3–2.4 *(solid)* | Pourable, sets hard |
| **Barite**            | $1–3          | 4.3–4.5 *(solid)* | Loose powder |
| **Plaster of Paris**  | $1.50–4       | 0.8–1.1 *(powder)*<br/>**1.2–1.7** *(cured)* | Pourable, sets hard |
| **Mild steel**        | $2–4          | 7.85 |  |
| **Magnetite / iron sand** | $2–5      | 2.8 *(loose)*<br/>5.15–5.2 *(solid)* | Loose, magnetic |
| **Steel shot / BBs**  | $2.60–4.00    | 4.5–5 *(loose)*<br/>7.6–7.8 *(solid)* | Loose |
| **Lead**              | $3–5          | 11.34 |  |
| **Aluminium**         | $5–15         | 2.70 | Lightweight solid bar/sheet |
| **Copper / brass scrap** | $8–15      | 5.5 *(loose)*<br/>8.4–8.96 *(solid)* | Chopped wire, turnings, hardware |
| **Craft / marine epoxy** | $14–24     | 1.1–1.2 | Binding matrix and waterproof seal |
| **Depleted Uranium**  | $30.00–$100.00 *(est.)* | 19.1 |  |
| **Bismuth**           | $60–100       | 9.78 | melts at 271°C |
| **Tungsten**          | $170–300      | 19.25 | Extreme-density solid / powder |
| **Gold**              | $130000–150000 | 19.3 |  |
| **Plutonium**         | $4M–$8M       | 19.8 | 10kg hard limit |

[^1]: note for American readers: water is ~1 g/cm³

With those prices in mind I could now feel _really_ bad about the price
of my washers.  Great!

But I do not want a pallet of unused ballast sat on my driveway for
years, and I do not want to spend more than $10--$20.  So, after a bit
of manual guessing and searching I decided to try to make ChatGPT figure
it out for me.

That was only modestly successful.  It does take most of the labour out
of comparing units, etc., and after some encouragement it can make
weight estimates based on materials, dimensions, and quantities rather
than reverting to shipping weights.  It also observed one case where a
reviewer measured the product and gave corrected dimensions in their
review, and it revised my original cost-per-kg estimate to make me feel
even worse.

But ChatGPT did not do so well at coming up with new ideas on what kinds
of product might provide the cheapest bulk weight of material.  And a
lot of sites don't admit off-leash ChatGPT sessions and serve modified
data or no data at all.  It couldn't get prices from Amazon, for
example.

## Findings

Here's a list of things it found, available mostly from Home Depot or
eBay.

| Description and URL | Price | Weight | Price/kg | Volume (mL/kg) | notes |
|:---|---:|---:|---:|---:|:---|
| [Sakrete play sand, 50&nbsp;lb](https://www.homedepot.com/p/202007298) | $7.52 | 22.68&nbsp;kg | $0.33 | 624 | Loose |
| [Laguna granular magnetite, minimum 5&nbsp;lb](https://www.lagunaclay.com/products/magnetite-granular) | $5.30 +&nbsp;shipping | 2.27&nbsp;kg | $2.34 +&nbsp;shipping | 310–400 | Loose |
| [Quikrete Vinyl Concrete Patcher, 10&nbsp;lb](https://www.homedepot.com/p/100318504) | $11.97 | 4.8&nbsp;kg *(cured)* | $2.50 | 550 *(cured)* |  |
| [Quikrete Quick-Setting Cement, 10&nbsp;lb](https://www.homedepot.com/p/100318542) | $12.97 | 5.0&nbsp;kg *(cured)* | $2.60 | 530 *(cured)* |  |
| [Mazel 2-inch bright finish nails, 50&nbsp;lb; model 10205006](https://www.hardwareworld.com/cpfkl81/Finish-Nails) | $82.57 +&nbsp;shipping | 22.68&nbsp;kg | $3.64 +&nbsp;shipping | &ge; 127 | Not weatherproof, manual packing |
| [Grip-Rite 2-inch bright common nails, 50&nbsp;lb](https://www.zoro.com/grip-rite-common-nail-2-in-l-6d-steel-bright-finish-1150-ga-6c/i/G207369778/) | $97.89, listed free shipping | 22.68&nbsp;kg | $4.32 | &ge; 127 | Not weatherproof |
| [Blastline S550 steel shot, 5&nbsp;lb](https://www.ebay.com/itm/227490077389) | $12.00, free shipping | 2.27&nbsp;kg | $5.29 | 200–250 | Not weatherproof |
| [DAP Plaster of Paris, 4&nbsp;lb](https://www.homedepot.com/p/DAP-Plaster-of-Paris-4-lbs-White-Dry-Mix-10318/100126904) | $11.48 | 2.1&nbsp;kg *(cured)* | $5.50 | 800 *(cured)* | Not weatherproof |
| [Grip-Rite 2-inch 13-gauge galvanized finish nails, 5&nbsp;lb](https://www.homedepot.com/p/202308630) | $12.90 | 2.27&nbsp;kg | $5.69 | &ge; 127 | Loose, manual packing |
| [New Mexico Clay granular magnetite](https://nmclay.com/magnetite-granular) | $2.64/lb +&nbsp;shipping | Sold by weight | $5.82 +&nbsp;shipping | 310–400 | Loose |
| [Freeman 16-gauge 2½-inch collated finish nails, 2500](https://www.homedepot.com/p/319239559) | $17.59 | 2.8&nbsp;kg | $6.30 | &ge; 127 |  |
| [Bolt Depot ½-13 × 2-inch zinc-plated hex bolts, 50](https://boltdepot.com/Product-Details?product=246) | $22.81 +&nbsp;shipping | 3.0–3.3&nbsp;kg | $6.90–7.60 +&nbsp;shipping | &ge; 127 | Loose, manual packing |
| [Freeman 18-gauge 2-inch collated brads, 5000](https://www.homedepot.com/p/310836940) | $16.03 | 2.0–2.1&nbsp;kg | $7.70–8.00 | &ge; 127 |  |
| [Barra zinc-plated BBs, 3000](https://www.barraairguns.com/products/3000-count-zinc-plated-4-5mm-bbs) | $10.00 +&nbsp;shipping | 1.05&nbsp;kg | $9.52 +&nbsp;shipping | 200–230 | Loose |
| [Bolt Depot ½-13 zinc-plated hex nuts, 50](https://boltdepot.com/Product-Details?product=2652) | $8.33 +&nbsp;shipping | 0.85&nbsp;kg | $9.80 +&nbsp;shipping | &ge; 213 |  |
| BCPrecision/Jaxshot zinc-plated BBs, 10000 | $36.00 | 3.42&nbsp;kg from stated grain weight | $10.52 | 200–230 | Loose |
| [302 stainless cut-wire slugs, 5&nbsp;lb](https://www.ebay.com/itm/305164530886) | $16.79 + $9.20 displayed shipping | 2.27&nbsp;kg | $11.46 with displayed shipping | 180–220 | Loose |
| [Everbilt ½-13 zinc-plated hex nuts, 50](https://www.homedepot.com/p/204274094) | $14.05 | 0.85&nbsp;kg | $16.50 | &ge; 213 | Loose, manual packing |
| [Everbilt 5/16 × 1½-inch zinc-plated fender washers, 100](https://www.homedepot.com/p/204276331) | $21.47 | 1.08&nbsp;kg | $19.80 | 134 stacked | Loose, manual stacking |

My interest was outdoor use which is why there's so much in here with
zinc plating.  Apparently concrete (*but not Plaster*) adds corrosion
resistance if you use it to cover and fill gaps around metal filler.

Sand, plaster of Paris, and cement are the standouts on raw cost if you
have a suitable container and don't mind the mess.

If you want more density then steel shot is good.  That has big gaps in
it, so you can improve that density by filling the voids with plaster or
cement or epoxy.

But the real density standout is collated nails --- like, for a nail
gun.  They're rectangular and glued together in breakable sheets, so
packing is close to optimal.  And you can get them zinc-coated.

ChatGPT also made the point, which may be common knowledge in the
community, that if you're going to pour and cure directly in the print
where it will stay then you can add ribs to that cavity to hold it in
place after it shrinks.
