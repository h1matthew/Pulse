# Canva Animation Guide — Pulse FBLA Deck

Canva animations must be applied by hand. Keep it disciplined: **max two
animation styles per slide**, consistent across the deck, nothing that moves
while a presenter is talking over data. Judges reward clarity over flash.

## Global settings (apply first)

| Setting | Value | How |
|---|---|---|
| Slide transition | **Dissolve**, 0.5 s, applied to all | Click between slides → Add transition → Dissolve → "Apply to all" |
| Page animation default | **Rise** (subtle) | Select page → Animate → Rise |
| Text animation default | **Wipe** (for bullet groups) | Select text box → Animate → Wipe |
| Image/screenshot default | **Pop** | Select image → Animate → Pop |

Rationale: Dissolve between slides reads as calm and professional on a
projector; Rise/Wipe/Pop are the three most restrained Canva effects and we
reuse them everywhere instead of introducing new ones per slide.

## Per-slide spec

| # | Slide | Page animation | Element animations (order) |
|---|---|---|---|
| 1 | Title | **Breathe** (only slide that gets it — sets the opening) | Logo: Pop (1st) → title/team text: Rise (2nd, together) |
| 2 | Problem & Solution | Rise | "68¢ vs 43¢" stat: Pop (1st, on click) → six feature pills: Wipe, one group (2nd) |
| 3 | Language Selection | Rise | tsconfig screenshot: Pop (1st) → reasoning bullets: Wipe (2nd) |
| 4 | Architecture | Rise | Module-tree image: Pop (1st) → provider screenshot: Pop (2nd, on click) |
| 5 | Code Quality | Rise | Comment-header screenshot: Pop only. Nothing else — let them read |
| 6 | UX Design | Rise | Journey arrows: **Draw** (the one Draw in the deck — 3-step journey) → a11y bullets: Wipe |
| 7 | Live Demo roadmap | Rise | Checklist: Wipe as ONE group (not item-by-item — Matthew starts talking immediately). **No exit animation; slide stays up during demo** |
| 8 | Intelligent Feature | Rise | RAG flow diagram boxes: Wipe in sequence (query → retrieve → Gemini → answer) → code screenshot: Pop |
| 9 | Input Validation | Rise | Syntactic screenshot: Pop (1st) → semantic screenshot: Pop (2nd, on click) |
| 10 | Data Storage | Rise | Interface screenshot: Pop → scope bullets: Wipe |
| 11 | Output & Analysis | Rise | Report screenshot: Pop → insight bullets: Wipe |
| 12 | Closing | **Breathe** (bookends slide 1) | Logo: Pop → "Questions?" text: Rise |

## Timing & click discipline

- Set element animations to **"On click"** wherever a presenter reveals a
  second visual mid-slide (slides 2, 4, 9). Everything else: "After previous,"
  0.3–0.5 s duration.
- Slide 7 must be fully revealed within ~3 s — Matthew switches to the live
  app almost immediately.
- Do **not** animate the footer/logo watermark on any slide.

## What to avoid

- Neon, Stomp, Tumble, or any bounce effect — too playful for a business judging panel.
- Per-bullet staggered reveals on text-heavy slides (reads as stalling).
- Animating both a screenshot and its caption separately — group them, animate the group.
