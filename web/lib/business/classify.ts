// ============================================================================
// Business Chain Classification
// Determines whether a business is a national/regional chain or franchise
// versus a local independent business, based on a curated brand list.
// ============================================================================

export interface ChainCheckInput {
  name: string
  tags?: string[]
}

/**
 * Curated list of US national/regional chain and franchise brand names.
 * All entries are lowercase. Matching is prefix-based with a word boundary,
 * so "h mart" also matches "H Mart Diamond Bar".
 */
const RAW_CHAINS: string[] = [
  // Fast food / QSR
  'subway',
  "mcdonald's",
  'starbucks',
  'wienerschnitzel',
  'chipotle',
  'panda express',
  'in-n-out burger',
  'chick-fil-a',
  'taco bell',
  'pizza hut',
  "domino's",
  'kfc',
  'burger king',
  "wendy's",
  'jack in the box',
  'del taco',
  "carl's jr",
  "raising cane's",
  'sonic drive-in',
  'popeyes',
  'panera bread',
  'corner bakery',
  'einstein bros',
  'krispy kreme',
  "dunkin'",
  'little caesars',
  "papa john's",
  'round table pizza',
  'blaze pizza',
  'mod pizza',
  'pieology',
  'yoshinoya',
  'flame broiler',
  'waba grill',
  'el pollo loco',
  'pollo campero',
  'ono hawaiian bbq',
  'wingstop',
  'five guys',
  'shake shack',
  'the habit burger grill',
  // Casual dining
  'buffalo wild wings',
  "denny's",
  'ihop',
  'olive garden',
  "applebee's",
  "chili's",
  'red robin',
  "bj's restaurant",
  'boiling point',
  'the boiling crab',
  'kura revolving sushi',
  // Coffee / dessert / drinks
  'jamba',
  'baskin-robbins',
  'cold stone creamery',
  'yogurtland',
  '85°c bakery cafe',
  'paris baguette',
  "peet's coffee",
  'the coffee bean & tea leaf',
  'dutch bros',
  'sharetea',
  'gong cha',
  // Grocery / big box
  'h mart',
  '99 ranch market',
  'smart & final',
  'vons',
  'ralphs',
  'albertsons',
  "trader joe's",
  'whole foods',
  'sprouts',
  'costco',
  "sam's club",
  'walmart',
  'target',
  // Pharmacy / convenience / fuel
  'cvs',
  'walgreens',
  '7-eleven',
  'chevron',
  'shell',
  'mobil',
  '76',
  'arco',
  'speedway',
  'circle k',
  // Retail
  'home depot',
  "lowe's",
  'best buy',
  'petsmart',
  'petco',
  "michael's",
  'joann',
  'ross',
  'tj maxx',
  'marshalls',
  'burlington',
  'old navy',
  'gap',
  'banana republic',
  'nordstrom',
  "macy's",
  "kohl's",
  'jcpenney',
  'sephora',
  'ulta',
  'bath & body works',
  "victoria's secret",
  'gnc',
  'vitamin shoppe',
  'daiso',
  'miniso',
  'uniqlo',
  'h&m',
  'zara',
  'forever 21',
  'hot topic',
  "spencer's",
  'gamestop',
  'barnes & noble',
  'office depot',
  'staples',
  // Fitness / wellness
  '24 hour fitness',
  'la fitness',
  'planet fitness',
  'crunch fitness',
  'orangetheory',
  'f45',
  'club pilates',
  'massage envy',
  'european wax center',
  'the joint chiropractic',
  // Pet / medical
  'banfield pet hospital',
  'vca animal hospital',
  // Auto
  'jiffy lube',
  'valvoline',
  'midas',
  'pep boys',
  'autozone',
  "o'reilly auto parts",
  'firestone',
  'goodyear',
  'enterprise rent-a-car',
  'hertz',
  'u-haul',
  // Storage / shipping
  'public storage',
  'extra space storage',
  'the ups store',
  'fedex office',
  // Banks
  'bank of america',
  'chase',
  'wells fargo',
  // Services / salons
  'supercuts',
  'great clips',
  // Entertainment
  'harkins theatres',
  'round1',
  'regal',
  'amc',
  'raging waters',
  // Telecom
  'verizon',
  't-mobile',
  'at&t',
  'metro by t-mobile',
  'cricket wireless',
]

/**
 * Light normalization: lowercase, unify apostrophes/dashes/whitespace,
 * trim outer punctuation noise. Keeps inner punctuation like "'", "-", "&".
 */
function normalizeLight(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’`´]/g, "'") // curly/backtick apostrophes -> '
    .replace(/[–—]/g, '-') // en/em dash -> hyphen
    .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' ') // unicode spaces -> space
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Aggressive normalization: collapse all punctuation (except "&") to spaces
 * so "chick-fil-a" and "Chick Fil A" compare equal.
 */
function normalizeAggressive(value: string): string {
  return normalizeLight(value)
    .replace(/[^a-z0-9&°]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Produce comparable variants of a name (light, aggressive, leading-"the" stripped). */
function nameVariants(value: string): string[] {
  const light = normalizeLight(value)
  const aggressive = normalizeAggressive(value)
  const out = new Set<string>([light, aggressive])
  for (const v of [light, aggressive]) {
    if (v.startsWith('the ')) out.add(v.slice(4))
  }
  out.delete('')
  return Array.from(out)
}

export const KNOWN_CHAINS: string[] = Array.from(
  new Set(RAW_CHAINS.map((entry) => normalizeLight(entry)))
)

/** Precomputed variant forms for every known chain entry. */
const CHAIN_VARIANTS: string[][] = KNOWN_CHAINS.map((entry) => nameVariants(entry))

/** True when the character after a matched prefix is a word boundary (or end of string). */
function isBoundary(char: string | undefined): boolean {
  if (char === undefined) return true
  return !/[a-z0-9]/.test(char)
}

/** True when `name` equals `entry` or starts with `entry` followed by a word boundary. */
function matchesEntry(name: string, entry: string): boolean {
  if (name === entry) return true
  if (!name.startsWith(entry)) return false
  return isBoundary(name[entry.length])
}

/**
 * Classify a business as a chain (true) or independent (false).
 *
 * The name is normalized (lowercase, punctuation variants unified, whitespace
 * collapsed) and compared against the curated chain list. A business counts as
 * a chain when its normalized name equals a chain entry or starts with one
 * followed by a word boundary — which handles trailing location suffixes like
 * "H Mart Diamond Bar" or "Harkins Theatres Chino Hills".
 */
export function isChainBusiness(input: ChainCheckInput): boolean {
  if (!input || typeof input.name !== 'string') return false
  const variants = nameVariants(input.name)
  if (variants.length === 0) return false

  for (const entryForms of CHAIN_VARIANTS) {
    for (const entry of entryForms) {
      for (const name of variants) {
        if (matchesEntry(name, entry)) return true
      }
    }
  }
  return false
}
