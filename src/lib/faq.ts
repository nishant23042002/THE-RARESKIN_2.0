export type Faq = { q: string; a: string };

/**
 * Real FAQ content — grounded in the actual product model and stated policies,
 * not filler. Kept here so the page and the FAQPage JSON-LD read from one
 * source. Anything the brand has not confirmed (cruelty-free / vegan status,
 * hard longevity numbers, IFRA statements) is deliberately left out rather than
 * guessed at.
 */
export const FAQ_GROUPS: { title: string; items: Faq[] }[] = [
  {
    title: "The fragrances",
    items: [
      {
        q: "What is Extrait de Parfum?",
        a: "Extrait de Parfum — also called parfum or pure perfume — is the most concentrated form of fragrance. It carries more perfume oil and less alcohol than an eau de parfum or eau de toilette, so it sits closer to the skin, unfolds more slowly, and a small amount goes a long way.",
      },
      {
        q: "How is THE RARESKIN different from an eau de parfum?",
        a: "Every THE RARESKIN scent is made only as an extrait. The higher oil load and lower alcohol mean it projects less aggressively than an eau de parfum but stays with you far longer, into a soft, extended dry-down. Two or three sprays is enough for the day.",
      },
      {
        q: "How long does the fragrance last?",
        a: "As an extrait it generally outlasts an eau de parfum and stays close to the skin rather than filling a room. Exact wear time depends on your skin, the weather and where you apply it. We show an indicative longevity on each product page and update it as formal wear tests are completed.",
      },
      {
        q: "How should I apply it?",
        a: "Two or three sprays to pulse points — wrists, base of the neck, behind the ears — from about 15 cm. Don't rub it in; let it settle. Because an extrait sits close to the skin, resist the urge to reapply through the day.",
      },
      {
        q: "Are the fragrances for men or women?",
        a: "All three are made to be worn by anyone. We describe them by character — a quiet confidence, a lasting impression, an unexplained attraction — not by gender.",
      },
      {
        q: "How different are the three scents from each other?",
        a: "Distinct. AURÉVAN is fresh and composed, ORVÉLIS is warm and rounded, VAYRÉN is dark and intense. The Discovery Set is the easiest way to try all three before committing to a full bottle.",
      },
      {
        q: "What size are the bottles?",
        a: "50 ml. At two or three sprays a day, one bottle lasts a long time — part of the reason the launch price works.",
      },
    ],
  },
  {
    title: "The Discovery Set",
    items: [
      {
        q: "What's in the Discovery Set?",
        a: "Three 10 ml extraits — AURÉVAN, ORVÉLIS and VAYRÉN — in the exact full-size formula, not a diluted sample.",
      },
      {
        q: "How does the launch credit work?",
        a: "The ₹799 you pay for the Discovery Set is credited in full toward your first 50 ml bottle. In effect, trying all three costs nothing once you buy the one you love. One credit per customer, applied to a first 50 ml purchase.",
      },
      {
        q: "Can I return the Discovery Set?",
        a: "It is non-refundable once any vial is opened, and the credit is forfeited if the set is returned. Full details are on the Returns page.",
      },
    ],
  },
  {
    title: "Orders, payment & delivery",
    items: [
      {
        q: "How much does a fragrance cost?",
        a: "₹799 during launch (MRP ₹1,199) for a 50 ml extrait. Prices shown are all-inclusive.",
      },
      {
        q: "Which payment methods do you accept?",
        a: "Cards (Visa, Mastercard, RuPay, American Express), UPI, and cash on delivery on eligible pincodes. Payments are processed securely through Razorpay — we never see or store your card details.",
      },
      {
        q: "Is cash on delivery available?",
        a: "Yes, on serviceable pincodes across India. Please keep the exact amount ready for the courier.",
      },
      {
        q: "Where do you ship, and how long does it take?",
        a: "Across India. Orders are dispatched within 24–48 hours of confirmation; delivery time then depends on your location. Tracking is shared by email and SMS once the parcel leaves us. We do not ship internationally yet.",
      },
      {
        q: "Is shipping free?",
        a: "Yes — shipping is free on every order during launch.",
      },
      {
        q: "Can I change or cancel my order?",
        a: "If your order has not yet been dispatched, contact us as soon as possible and we'll do our best to change or cancel it. Once it has left us it can't be recalled, but you can still use the Returns process.",
      },
    ],
  },
  {
    title: "Returns, authenticity & care",
    items: [
      {
        q: "Can I return a fragrance I've opened?",
        a: "For hygiene and safety reasons, opened bottles can't be returned unless they arrived damaged or faulty. Unopened bottles in their original packaging can be returned within the window shown on our Returns page.",
      },
      {
        q: "What if my order arrives damaged?",
        a: "Contact us within a few days of delivery with photos of the bottle and packaging, and we'll replace it or refund it in full.",
      },
      {
        q: "How should I store my fragrance?",
        a: "Keep it capped and away from direct sunlight, heat and humidity — a drawer or cupboard is ideal, not a bathroom shelf. Stored well, an unopened extrait keeps for years.",
      },
      {
        q: "Is THE RARESKIN authentic, and where is it made?",
        a: "THE RARESKIN is our own brand, created and bottled in India by Velocity Ventures Group in Roha, District Raigad, Maharashtra. Every bottle ships directly from us or an authorised courier — there are no third-party sellers or marketplaces.",
      },
      {
        q: "Are the ingredients listed?",
        a: "Yes — the full ingredient list is printed on every carton. If you have a specific fragrance sensitivity, email us before ordering and we'll help you check.",
      },
    ],
  },
];

export const ALL_FAQS: Faq[] = FAQ_GROUPS.flatMap((g) => g.items);
