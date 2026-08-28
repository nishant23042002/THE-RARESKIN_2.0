# Payment marks

Official SVGs vendored from **`payments-icons-library`** (Cashfree, MIT) so
nothing is hot-linked at runtime. Rendered with `mix-blend-mode: multiply` in
the footer so each mark's white backing plate drops into the ground.

| file | source |
| --- | --- |
| `visa.svg` | `pg/card/svg/visa` (128² white plate stripped) |
| `mastercard.svg` | `pg/card/svg/mastercard` |
| `rupay.svg` | `pg/card/svg/rupay` |
| `bhim.svg` | `pg/upi/svg/bhim` — the UPI slot (`getIcon('upi')` resolves to BHIM) |
| `india.svg` | flagcdn `in.svg` — the region flag, **not** blended |

COD is a first-party glyph in `src/components/ui/payment-marks.tsx` (not a
network). To add a card network (`amex`, `diners`, `discover`, `jcb`, `maestro`):

```
curl -o public/pay/<name>.svg \
  https://cashfreelogo.cashfree.com/assets_images/pg/card/svg/<name>.svg
```

then strip its `<rect width="128" height="128" fill="white"/>` and add it to
`MARKS` in `payment-marks.tsx`.
