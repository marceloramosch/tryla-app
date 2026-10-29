# Tryla brand reference

## Logo — always use the real asset files, never redraw the T

The T-mark has a specific shape/proportion. Do not hand-roll it from the
SVG polygon points found in `tryla-site/index.html` (`21.6,25.8 98.3,25.8
106.9,45.0 30.2,45.0` / `57.9,45.0 79.2,45.0 100.5,94.2 79.2,94.2`) inside
a smaller icon box — those coordinates are correct, but the T must fill
**almost the entire squircle** (icon width = squircle width, no extra
shrinking margin). Shrinking the SVG down inside its container (e.g. to
80% of the box) makes the T look visibly smaller/thinner than the real
logo and has been flagged as wrong before.

**For any letterhead / PDF / document with the Tryla logo, use these
ready-made files instead of reconstructing the logo:**

- `assets/tryla_logo.png` — icon only (T on purple squircle), 560x560, the
  master source used to verify proportions.
- `assets/tryla_logo_full.png` — full horizontal lockup (icon + "TRYLA®"
  wordmark), icon in color, text in **black**. Use this as the default
  letterhead logo on white/light backgrounds.
- `assets/tryla_logo_full_white.png` — same lockup, text in **white**, for
  dark backgrounds.

If a variant doesn't exist yet (e.g. icon-only in black/white, or a
different size), regenerate it from `assets/tryla_logo.png`'s exact T
proportions rather than the SVG, and verify by eye against the master
file before using it in a real document.

## Letterhead documents (PDFs, invoices, payment instructions, etc.)

- Use the full-page layout style established for `Payment Instructions`:
  a thin blue accent bar at the very top, the logo lockup + date/address
  in the header, a bold navy title, content sections with light-purple
  (`#F1F0FF`) bordered tables, and a solid navy footer band at the bottom
  of the page (contact info left, confidentiality note right) so the page
  doesn't look empty — don't leave large blank vertical space.
- Brand colors: `--blue:#5B54FF`, `--blue-dim:#3B36D6`, `--navy:#06038D`,
  `--light:#F1F0FF`, `--border:#D6D3FF`, `--text2:#5C6270`.
- Company address: `1111 Ellenwood St, Dallas, TX 75217`.
- Contact: Marcelo Ramos Schiaffino · +1 (645) 235-3186 ·
  marcelo.ramos@thetryla.com
