---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/styles.css"]
---

# Earth Sonata app (web/)

Scope: the main app, `web/src` (App.tsx and its components, styles.css). Mode: Operate.
Audience: visitors and Space Apps judges comparing two NASA ocean regions by ear; testers incl. low-vision, keyboard and screen-reader users.
Constraints: PRODUCT.md honesty lines and credit; keyboard first; colour never the only cue; light and dark themes with a switch.

## Direction contract

THESIS: Earth Sonata is a record catalogue: each NASA picture is a catalogue entry, each region a side, and the rhythm is drawn as a stack of hairline pulse lines from the real alignment numbers. It refuses both the dark map viewer with glowing floating panels and the previous tide-table print.

OWN-WORLD: Record sleeve. Light: white sleeve (oklch 0.975, no hue), black ink, hairline grey rules. Dark: matte black sleeve, white ink. Square corners everywhere; boxed controls joined by 1px rules like a catalogue index. Labels in letterspaced caps (Geist), numbers in Geist Mono. Colour appears only where something is live or chosen, and then it is the playing side's colour (Side A violet, Side B rose): the needle, the end block on the current tab and on Play. Focus is an ink ring.

STORY: The visitor picks a catalogue entry (picture) and a side (region), presses Play, and watches a needle in the side's colour run along the sound bars as each pulse lights; Compare shows the two sides' numbers.

FIRST VIEWPORT: Layout unchanged from the page owners' Listen (page plan P1): letterspaced EARTH SONATA left, boxed caps tabs, boxed Light/Dark; picture and region choice; the NASA picture inside its 1px ink frame on the black well; the boxed player bar with Play filled in ink and the coloured needle on the sound bars.

FORM: Pulse Catalogue: dealt challenger (Factory catalogue sleeve) fused with Impeccable's pick (record sleeve, Side A / Side B), chosen by the team from three mockups; seed adcae389. Scope by user decision: look only; page layouts stay with their owners in docs/page_plan.md. Signature: the side-coloured needle with a square cap and dot on the sound bars, and the PulsePlot component (ridge plot with a per-beat needle) offered to Compare (P2).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
