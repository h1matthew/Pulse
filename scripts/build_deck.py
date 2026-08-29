#!/usr/bin/env python3
"""Build the FBLA presentation PPTX for import into Canva.

12 slides, 16:9, light theme matching the Pulse app (blue primary),
real screenshots from assets/, speaker notes embedded per slide.
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")
LOGO = os.path.join(ROOT, "web", "public", "pulse-logo.png")
OUT = os.path.join(ROOT, "assets", "pulse-fbla-deck.pptx")

BLUE = RGBColor(0x3B, 0x6E, 0xF6)
DARK = RGBColor(0x0F, 0x17, 0x2A)
MUTED = RGBColor(0x64, 0x74, 0x8B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT = RGBColor(0xF1, 0xF5, 0xF9)
FONT = "Inter"

SW, SH = Inches(13.333), Inches(7.5)

prs = Presentation()
prs.slide_width = SW
prs.slide_height = SH
BLANK = prs.slide_layouts[6]


def add_slide():
    return prs.slides.add_slide(BLANK)


def box(slide, x, y, w, h, fill=None, line=None):
    from pptx.enum.shapes import MSO_SHAPE
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    sh.adjustments[0] = 0.08
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = Pt(1)
    sh.shadow.inherit = False
    return sh


def text(slide, x, y, w, h, runs, size=18, color=DARK, bold=False,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.0,
         space_after=6):
    """runs: str, or list of paragraphs; each paragraph str or list of (txt, dict)."""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    if isinstance(runs, str):
        runs = [runs]
    for i, para in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        p.space_after = Pt(space_after)
        if isinstance(para, str):
            para = [(para, {})]
        for txt, style in para:
            r = p.add_run()
            r.text = txt
            r.font.name = FONT
            r.font.size = Pt(style.get("size", size))
            r.font.bold = style.get("bold", bold)
            r.font.color.rgb = style.get("color", color)
    return tb


def pic(slide, path, x, y, w=None, h=None, max_w=None, max_h=None):
    """Place image fitting inside (max_w, max_h) anchored at x,y (top-left)."""
    iw, ih = Image.open(path).size
    if max_w is not None and max_h is not None:
        scale = min(max_w / iw, max_h / ih)
        w, h = int(iw * scale), int(ih * scale)
        return slide.shapes.add_picture(path, x, y, Emu(w * Emu(1)), Emu(h * Emu(1))) \
            if False else slide.shapes.add_picture(path, x, y, width=Emu(int(max_w)) if False else None,
                                                   height=None) if False else \
            slide.shapes.add_picture(path, x, y, width=int(iw * scale), height=int(ih * scale))
    return slide.shapes.add_picture(path, x, y, width=w, height=h)


def fit_pic(slide, path, cx, cy, max_w, max_h, border=True):
    """Center image inside the rect (cx,cy,max_w,max_h), preserving aspect."""
    iw, ih = Image.open(path).size
    scale = min(max_w / iw, max_h / ih)
    w, h = int(iw * scale), int(ih * scale)
    x = int(cx + (max_w - w) / 2)
    y = int(cy + (max_h - h) / 2)
    p = slide.shapes.add_picture(path, x, y, width=w, height=h)
    if border:
        p.line.color.rgb = RGBColor(0xE2, 0xE8, 0xF0)
        p.line.width = Pt(1)
    p.shadow.inherit = False
    return p


def footer(slide, n):
    text(slide, Inches(0.45), Inches(7.08), Inches(8), Inches(0.35),
         "Pulse · FBLA Coding & Programming 2025–26", size=10, color=MUTED)
    text(slide, Inches(12.3), Inches(7.08), Inches(0.6), Inches(0.35),
         str(n), size=10, color=MUTED, align=PP_ALIGN.RIGHT)
    slide.shapes.add_picture(LOGO, Inches(12.75), Inches(7.02), width=Inches(0.32))


def kicker(slide, label):
    text(slide, Inches(0.45), Inches(0.32), Inches(8), Inches(0.4),
         label.upper(), size=13, color=BLUE, bold=True)


def heading(slide, t, y=0.68, size=34):
    text(slide, Inches(0.45), Inches(y), Inches(12.4), Inches(0.9),
         t, size=size, color=DARK, bold=True)


def notes(slide, txt):
    slide.notes_slide.notes_text_frame.text = txt


def caption(slide, x, y, w, t):
    text(slide, x, y, w, Inches(0.3), t, size=11, color=MUTED, align=PP_ALIGN.CENTER)


# ---------------------------------------------------------------- Slide 1
s = add_slide()
bar = box(s, 0, 0, SW, Inches(0.18), fill=BLUE)
s.shapes.add_picture(LOGO, Inches(6.07), Inches(1.25), width=Inches(1.2))
text(s, Inches(1.6), Inches(2.65), Inches(10.13), Inches(1.1), "Pulse",
     size=64, color=DARK, bold=True, align=PP_ALIGN.CENTER)
text(s, Inches(1.6), Inches(3.85), Inches(10.13), Inches(0.6),
     [[("Discover. Support. ", {}), ("See your impact.", {"color": BLUE, "bold": True})]],
     size=24, color=MUTED, align=PP_ALIGN.CENTER)
text(s, Inches(1.6), Inches(5.05), Inches(10.13), Inches(0.5),
     "Felix Yin  ·  Oscar Gao  ·  Matthew Heng", size=18, color=DARK,
     align=PP_ALIGN.CENTER, bold=True)
text(s, Inches(1.6), Inches(5.55), Inches(10.13), Inches(0.8),
     ["Diamond Bar FBLA", "Coding & Programming 2025–26 · Byte-Sized Business Boost"],
     size=14, color=MUTED, align=PP_ALIGN.CENTER)
footer(s, 1)
notes(s, "FELIX (0:00-0:30)\n\nGood morning, judges. I'm Felix Yin, and with me are Oscar Gao and Matthew Heng from Diamond Bar FBLA. For the \"Byte-Sized Business Boost\" topic we built Pulse — a web platform that helps people discover small local businesses, and then shows them exactly how their spending strengthens their own community. Discovery gets a customer in the door once; visible impact brings them back. That second half is what makes Pulse different.\n\nHandoff: \"Oscar will show you the problem we started from.\"\n\n[Assets: Lucide icons (ISC); Pulse logo (original work)]")

# ---------------------------------------------------------------- Slide 2
s = add_slide()
kicker(s, "The Problem & Our Solution")
heading(s, "Local dollars work harder — when they stay local")
b = box(s, Inches(0.45), Inches(1.75), Inches(5.6), Inches(2.5), fill=LIGHT)
text(s, Inches(0.75), Inches(2.0), Inches(5.0), Inches(1.1),
     [[("68¢", {"size": 54, "bold": True, "color": BLUE}),
       ("  of a local dollar stays local", {"size": 18, "color": DARK})]])
text(s, Inches(0.75), Inches(3.25), Inches(5.0), Inches(0.8),
     [[("43¢", {"size": 32, "bold": True, "color": MUTED}),
       ("  at a national chain", {"size": 16, "color": MUTED})]])
pills = ["Category sort", "Reviews & ratings", "Sort by rating",
         "Bookmarks", "Deals & coupons", "Bot verification"]
for i, ptxt in enumerate(pills):
    px = Inches(0.45 + (i % 3) * 1.95)
    py = Inches(4.6 + (i // 3) * 0.62)
    pb = box(s, px, py, Inches(1.82), Inches(0.5), fill=WHITE, line=BLUE)
    tf = pb.text_frame
    tf.word_wrap = False
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p0 = tf.paragraphs[0]
    p0.alignment = PP_ALIGN.CENTER
    r = p0.add_run(); r.text = ptxt
    r.font.name = FONT; r.font.size = Pt(12); r.font.bold = True
    r.font.color.rgb = BLUE
text(s, Inches(0.45), Inches(6.0), Inches(5.6), Inches(0.4),
     "Every prompt requirement — one platform.", size=14, color=DARK, bold=True)
fit_pic(s, f"{A}/app-home.png", Inches(6.45), Inches(1.75), Inches(6.4), Inches(4.4))
caption(s, Inches(6.45), Inches(6.2), Inches(6.4), "Pulse home — live local guide for Diamond Bar")
footer(s, 2)
notes(s, "OSCAR (0:30-1:10)\n\nResearch shows 68 cents of every dollar spent locally recirculates in the community — versus just 43 cents at a national chain. Yet small businesses keep losing customers to chains, because they have no shared platform for discovery. Pulse answers every requirement of the prompt: users browse businesses sorted by category, leave reviews and ratings, sort by those ratings, bookmark favorites, claim deals and coupons, and every submission passes bot verification. On top of that foundation we added assistant search and a live economic-impact dashboard — you'll see all of it today.\n\nHandoff: \"Felix will explain the technology choices behind it.\"\n\n[Assets: app screenshot (original); business data via Google Places, attributed]")

# ---------------------------------------------------------------- Slide 3
s = add_slide()
kicker(s, "Language Selection")
heading(s, "TypeScript + Next.js 16")
bullets = [
    ("Static typing", "bugs caught at compile time, not on stage"),
    ("strict: true", "no implicit any, no null surprises"),
    ("SSR + API routes", "one production artifact, fast first paint"),
    ("Considered Python/Flask", "no end-to-end type safety across client + server"),
]
for i, (head, sub) in enumerate(bullets):
    y = Inches(1.9 + i * 1.08)
    box(s, Inches(0.45), y, Inches(0.12), Inches(0.85), fill=BLUE)
    text(s, Inches(0.75), y, Inches(5.3), Inches(0.45), head, size=18, bold=True, color=DARK)
    text(s, Inches(0.75), y + Inches(0.42), Inches(5.3), Inches(0.45), sub, size=13, color=MUTED)
fit_pic(s, f"{A}/code-language-tsconfig.png", Inches(6.45), Inches(1.75), Inches(6.4), Inches(4.6))
caption(s, Inches(6.45), Inches(6.45), Inches(6.4), "web/tsconfig.json — strict mode on")
footer(s, 3)
notes(s, "FELIX (1:10-1:45)\n\nWe chose TypeScript with Next.js. TypeScript's static type system catches entire classes of bugs at compile time — null references, wrong argument types — before they ever reach a judge's screen, and strict mode is enabled in our compiler config. Next.js gives us server-side rendering for fast first paint, file-based API routes so we don't maintain a separate backend, and React's component model for the UI. We weighed Python with Flask — simpler, but no end-to-end type safety across client and server — and chose the industry-standard production stack used by companies like Netflix and Vercel.\n\nHandoff: \"Matthew will walk through how the code is organized.\"")

# ---------------------------------------------------------------- Slide 4
s = add_slide()
kicker(s, "Architecture & Modular Design")
heading(s, "Organized by responsibility")
fit_pic(s, f"{A}/code-module-tree.png", Inches(0.45), Inches(1.7), Inches(6.3), Inches(4.9))
caption(s, Inches(0.45), Inches(6.55), Inches(6.3), "Module structure — routes, features, hooks, lib, types")
fit_pic(s, f"{A}/code-modular-providers.png", Inches(7.0), Inches(1.7), Inches(5.9), Inches(4.2))
caption(s, Inches(7.0), Inches(6.0), Inches(5.9), "app/layout.tsx — four single-purpose providers")
text(s, Inches(7.0), Inches(6.35), Inches(5.9), Inches(0.5),
     "PostgreSQL + row-level security beneath", size=13, color=DARK, bold=True,
     align=PP_ALIGN.CENTER)
footer(s, 4)
notes(s, "MATTHEW (1:45-2:20)\n\nThe codebase is organized by responsibility, which you can see in this structure. Pages and API routes live in app, reusable components are grouped by feature, all data fetching is isolated in React Query hooks, shared utilities in lib, and every data shape is a TypeScript interface in types. At the root, four nested providers — theme, server-state, authentication, and accessibility — each do exactly one job. Behind it all sits Supabase PostgreSQL with row-level security, so authorization is enforced in the database itself, not just in our code.\n\nHandoff: \"Felix will zoom into the code itself.\"")

# ---------------------------------------------------------------- Slide 5
s = add_slide()
kicker(s, "Code Quality")
heading(s, "Every file tells you its job")
fit_pic(s, f"{A}/code-comments.png", Inches(1.7), Inches(1.65), Inches(9.9), Inches(4.75))
caption(s, Inches(1.7), Inches(6.45), Inches(9.9),
        "app/api/reviews/route.ts — User Journey · Input Validation · Accessibility · Bot Prevention")
footer(s, 5)
notes(s, "FELIX (2:20-2:50)\n\nEvery significant file opens with the same four-section comment header: User Journey, Input Validation, Accessibility, and Design Rationale — here it is on our reviews API. Naming follows one convention everywhere: PascalCase components, camelCase utilities, typed named exports. The point isn't decoration — a teammate can open any file cold and know what it does, what it checks, and why it's built that way.\n\nHandoff: \"Oscar will cover the user experience.\"")

# ---------------------------------------------------------------- Slide 6
s = add_slide()
kicker(s, "UX Design")
heading(s, "Designed for everyone")
journey = ["Discover", "Engage", "Impact"]
for i, j in enumerate(journey):
    jx = Inches(0.45 + i * 2.0)
    jb = box(s, jx, Inches(1.85), Inches(1.6), Inches(0.62), fill=BLUE if i == 0 else LIGHT)
    tf = jb.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p0 = tf.paragraphs[0]; p0.alignment = PP_ALIGN.CENTER
    r = p0.add_run(); r.text = j
    r.font.name = FONT; r.font.size = Pt(15); r.font.bold = True
    r.font.color.rgb = WHITE if i == 0 else DARK
    if i < 2:
        text(s, jx + Inches(1.6), Inches(1.85), Inches(0.4), Inches(0.62), "→",
             size=18, color=MUTED, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
a11y = ["Skip-to-content link · full keyboard navigation",
        "Focus traps in dialogs · aria-live announcements",
        "WCAG contrast — light & dark mode",
        "Honors reduced-motion preference",
        "Built-in onboarding tour + help menu"]
text(s, Inches(0.45), Inches(2.95), Inches(5.9), Inches(3.2),
     a11y, size=15, color=DARK, line_spacing=1.15, space_after=10)
fit_pic(s, f"{A}/app-onboarding-tour.png", Inches(6.6), Inches(1.75), Inches(6.25), Inches(4.4))
caption(s, Inches(6.6), Inches(6.2), Inches(6.25), "Onboarding tour — in-app instructions, no manual needed")
footer(s, 6)
notes(s, "OSCAR (2:50-3:25)\n\nWe designed for everyone. The user journey is three steps — discover, engage, see your impact — and the persistent header reaches every feature in one click. Accessibility is engineered, not assumed: a skip-to-content link for keyboard users, focus trapping inside dialogs, screen-reader announcements through live regions, WCAG-compliant contrast in light and dark mode, and the app honors your system's reduced-motion setting. A built-in onboarding tour and help menu mean nobody needs a manual.\n\nHandoff: \"Now the part we're most excited about — Matthew, take it away.\"")

# ---------------------------------------------------------------- Slide 7
s = add_slide()
kicker(s, "Live Demo")
heading(s, "Watch every requirement, live")
checklist = ["Sort by category", "Leave a review & rating", "Sort by ratings",
             "Bookmark favorites", "Claim deals & coupons", "Bot verification",
             "Customizable impact report"]
rows = []
for c in checklist:
    rows.append([("✓  ", {"color": BLUE, "bold": True, "size": 16}), (c, {"size": 16, "color": DARK})])
text(s, Inches(0.45), Inches(1.85), Inches(4.4), Inches(4.6), rows, line_spacing=1.1, space_after=12)
grid = [("app-category-sort.png", "Category sort"), ("app-rating-sort.png", "Sort by rating"),
        ("app-bookmarks.png", "Bookmarks"), ("app-deals.png", "Deals & claims")]
for i, (img, cap) in enumerate(grid):
    gx = Inches(5.1 + (i % 2) * 4.05)
    gy = Inches(1.8 + (i // 2) * 2.55)
    fit_pic(s, f"{A}/{img}", gx, gy, Inches(3.9), Inches(2.2))
    caption(s, gx, gy + Inches(2.22), Inches(3.9), cap)
footer(s, 7)
notes(s, "MATTHEW (3:25-5:25) — THIS SLIDE STAYS UP DURING THE LIVE DEMO\n\nFollow DEMO_SCRIPT.md click-by-click. Narration: Here's Pulse running live. On Discover, these category pills filter instantly — Food & Drink, Retail, Services — that's sort by category. The sort menu ranks by highest rated, weighted by review volume, so one five-star review can't beat a hundred. On a business page I'll leave a review — four stars, my feedback — and before submitting I complete this puzzle: bot verification, validated again on the server. Tapping the heart bookmarks a favorite; here's my saved list. The Deals page shows live coupons — I claim one and get a redemption code under my Claimed tab. Finally, my dashboard: dollars kept local, businesses supported — and this customizable impact report filters by date and category, downloads as CSV, and prints clean. Every required feature, live, with zero errors.\n\nHandoff: \"Felix will show you the intelligence underneath.\"")

# ---------------------------------------------------------------- Slide 8
s = add_slide()
kicker(s, "Intelligent Feature")
heading(s, "Assistant search with retrieval")
flow = ["User query", "Extract keywords", "Detect category\n+ amenities", "Retrieve real\nbusinesses", "Gemini answers"]
fx = 0.45
for i, f in enumerate(flow):
    fb = box(s, Inches(fx), Inches(1.8), Inches(2.18), Inches(0.85),
             fill=BLUE if i == len(flow) - 1 else LIGHT)
    tf = fb.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE; tf.word_wrap = True
    for li, line in enumerate(f.split("\n")):
        p0 = tf.paragraphs[0] if li == 0 else tf.add_paragraph()
        p0.alignment = PP_ALIGN.CENTER
        r = p0.add_run(); r.text = line
        r.font.name = FONT; r.font.size = Pt(12); r.font.bold = True
        r.font.color.rgb = WHITE if i == len(flow) - 1 else DARK
    fx += 2.18
    if i < len(flow) - 1:
        text(s, Inches(fx - 0.04), Inches(1.8), Inches(0.42), Inches(0.85), "→",
             size=16, color=MUTED, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        fx += 0.38
fit_pic(s, f"{A}/app-intelligent-feature.png", Inches(0.45), Inches(3.0), Inches(6.6), Inches(3.5))
caption(s, Inches(0.45), Inches(6.55), Inches(6.6), "Assistant answering from live business data")
fit_pic(s, f"{A}/code-intelligent-feature.png", Inches(7.35), Inches(2.95), Inches(5.55), Inches(3.6))
caption(s, Inches(7.35), Inches(6.55), Inches(5.55), "lib/assistant — query-type routing")
text(s, Inches(0.45), Inches(6.85), Inches(12.4), Inches(0.3),
     "Real data, never hallucinated — prompt-injection filtered.", size=13, bold=True, color=DARK)
footer(s, 8)
notes(s, "FELIX (5:25-5:55)\n\nOur assistant uses retrieval-augmented generation. When you ask for \"a cozy coffee shop with wifi,\" we extract keywords, detect the category and amenities, pull matching businesses from our own database, and only then hand that context to Google's Gemini model — so answers cite real local businesses, never hallucinated ones. Prompt-injection filters sanitize every query before it reaches the model.\n\nHandoff: \"Oscar — how we keep bad data out.\"")

# ---------------------------------------------------------------- Slide 9
s = add_slide()
kicker(s, "Input Validation")
heading(s, "Checked twice: format, then meaning")
text(s, Inches(0.45), Inches(1.62), Inches(6.1), Inches(0.4),
     [[("SYNTACTIC", {"color": BLUE, "bold": True, "size": 14}),
       ("  Zod schemas — format", {"size": 14, "color": MUTED})]])
fit_pic(s, f"{A}/code-validation-syntactic.png", Inches(0.45), Inches(2.05), Inches(6.1), Inches(4.1))
text(s, Inches(6.85), Inches(1.62), Inches(6.05), Inches(0.4),
     [[("SEMANTIC", {"color": BLUE, "bold": True, "size": 14}),
       ("  server checks — meaning", {"size": 14, "color": MUTED})]])
fit_pic(s, f"{A}/code-validation-semantic.png", Inches(6.85), Inches(2.05), Inches(6.05), Inches(4.1))
text(s, Inches(0.45), Inches(6.45), Inches(12.4), Inches(0.4),
     "Rating 1–5 · content 10–2000 chars · UUIDs · duplicates → 409 · CAPTCHA re-verified · friendly errors, no crashes",
     size=13, color=DARK, bold=True, align=PP_ALIGN.CENTER)
footer(s, 9)
notes(s, "OSCAR (5:55-6:15)\n\nValidation happens twice. Syntactic — Zod schemas verify format: ratings must be integers one through five, reviews ten to two thousand characters, IDs valid UUIDs. Semantic — the server checks meaning: duplicate reviews are rejected with a clear message, CAPTCHA tokens re-verified. Friendly errors, never crashes.\n\nHandoff: \"Matthew — where the data lives.\"")

# ---------------------------------------------------------------- Slide 10
s = add_slide()
kicker(s, "Data Storage & Structures")
heading(s, "Typed end to end")
store = [
    ("Typed arrays of interface objects", "businesses, reviews, deals — compiler-enforced shape"),
    ("Module constants", "static data: categories, tiers"),
    ("Component state", "UI only: filters, sort order"),
    ("React Query cache", "server data, deduplicated, 24h TTL"),
    ("PostgreSQL", "persistence — foreign keys, unique constraints, RLS"),
]
for i, (head, sub) in enumerate(store):
    y = Inches(1.85 + i * 0.95)
    box(s, Inches(0.45), y, Inches(0.12), Inches(0.75), fill=BLUE)
    text(s, Inches(0.75), y, Inches(5.6), Inches(0.4), head, size=16, bold=True, color=DARK)
    text(s, Inches(0.75), y + Inches(0.38), Inches(5.6), Inches(0.4), sub, size=12, color=MUTED)
fit_pic(s, f"{A}/code-data-structures.png", Inches(6.75), Inches(1.75), Inches(6.1), Inches(4.7))
caption(s, Inches(6.75), Inches(6.5), Inches(6.1), "types/business.ts — the Business interface")
footer(s, 10)
notes(s, "MATTHEW (6:15-6:35)\n\nData flows as typed arrays of interface objects — every business, review, and deal matches a TypeScript contract. Scope is deliberate: module constants for static data, component state for UI, React Query cache for server data, PostgreSQL for persistence.")

# ---------------------------------------------------------------- Slide 11
s = add_slide()
kicker(s, "Output & Data Analysis")
heading(s, "Reports users act on")
fit_pic(s, f"{A}/app-impact-report.png", Inches(0.45), Inches(1.75), Inches(7.5), Inches(4.6))
caption(s, Inches(0.45), Inches(6.4), Inches(7.5), "Impact report — date & category filters, CSV export, print layout")
fit_pic(s, f"{A}/app-dashboard.png", Inches(8.25), Inches(1.75), Inches(4.65), Inches(2.9))
caption(s, Inches(8.25), Inches(4.68), Inches(4.65), "Live impact dashboard")
text(s, Inches(8.25), Inches(5.2), Inches(4.65), Inches(1.3),
     [[("$1,840", {"size": 30, "bold": True, "color": BLUE}),
       ("  kept local", {"size": 16, "color": DARK})],
      [("14 businesses · 26 check-ins · 2 jobs", {"size": 13, "color": MUTED})]],
     align=PP_ALIGN.CENTER)
footer(s, 11)
notes(s, "OSCAR (6:35-6:50)\n\nThe impact report turns raw check-ins into insight: category breakdowns, a sortable business table, CSV export for spreadsheets, and an economic multiplier showing your dollars kept local — data analysis users actually act on.")

# ---------------------------------------------------------------- Slide 12
s = add_slide()
box(s, 0, 0, SW, Inches(0.18), fill=BLUE)
s.shapes.add_picture(LOGO, Inches(6.17), Inches(1.5), width=Inches(1.0))
text(s, Inches(1.6), Inches(2.8), Inches(10.13), Inches(0.9),
     "A byte-sized business boost", size=40, color=DARK, bold=True, align=PP_ALIGN.CENTER)
text(s, Inches(1.6), Inches(3.8), Inches(10.13), Inches(0.5),
     "Six required features · one intelligent assistant · measurable community impact",
     size=16, color=MUTED, align=PP_ALIGN.CENTER)
text(s, Inches(1.6), Inches(4.85), Inches(10.13), Inches(0.8),
     [[("Questions?", {"size": 30, "bold": True, "color": BLUE})]], align=PP_ALIGN.CENTER)
text(s, Inches(1.6), Inches(5.9), Inches(10.13), Inches(0.4),
     "Felix Yin · Oscar Gao · Matthew Heng — Diamond Bar FBLA", size=13, color=MUTED,
     align=PP_ALIGN.CENTER)
footer(s, 12)
notes(s, "FELIX (6:50-7:00)\n\nSix required features, an intelligent assistant, and measurable community impact — that's Pulse: a byte-sized business boost. Thank you, judges — we welcome your questions.\n\n[Assets cited: Lucide icons (ISC), Pulse logo (original), all screenshots original from our application and source code; business photos within screenshots are Google Places content displayed with attribution.]")

prs.save(OUT)
print("saved", OUT, os.path.getsize(OUT) // 1024, "KB")
