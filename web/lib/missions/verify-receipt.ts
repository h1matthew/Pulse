/**
 * Receipt Verification — Gemini Vision
 *
 * Check-ins (and therefore mission progress) require proof of an actual
 * purchase. The user scans their receipt; Gemini reads it and answers three
 * questions: is this a purchase receipt, does the merchant match the business
 * being checked into, and when was the purchase made. Only verified receipts
 * create check-ins.
 *
 * The model's merchant-match boolean alone proved unreliable (it sometimes
 * approved receipts from unrelated businesses), so verification runs at
 * temperature 0 with JSON output and a deterministic name-similarity
 * guardrail backs the model's decision — the gate only ever tightens.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ReceiptVerification {
  verified: boolean
  /** Human-readable reason when verification fails */
  reason: string | null
  merchantName: string | null
  total: number | null
}

interface GeminiReceiptVerdict {
  is_receipt: boolean
  merchant_name: string | null
  merchant_matches_business: boolean
  purchase_date: string | null
  total_amount: number | null
  reasoning: string
}

/** Receipts older than this no longer count as proof of a fresh visit. */
const MAX_RECEIPT_AGE_DAYS = 7
/** Allow up to a day of timezone/clock skew before calling a date "future". */
const FUTURE_DATE_SLACK_MS = 24 * 60 * 60 * 1000

const VERIFICATION_PROMPT = (businessName: string) => `You are verifying a
purchase receipt for a local-business rewards app. Look at the image and
answer in STRICT JSON (no markdown fences, no commentary):

{
  "is_receipt": boolean,        // is this an actual purchase receipt or order confirmation?
  "merchant_name": string|null, // merchant name printed on the receipt
  "merchant_matches_business": boolean, // does the printed merchant name refer to "${businessName}"?
  "purchase_date": string|null, // purchase date as YYYY-MM-DD if readable, else null
  "total_amount": number|null,  // receipt total in dollars if readable, else null
  "reasoning": string           // one short sentence
}

Be strict about is_receipt (screenshots of menus, storefront photos, or random
images are NOT receipts). merchant_matches_business must be true ONLY when the
printed merchant name clearly refers to "${businessName}" — allow POS-system
truncation, abbreviations, and missing location suffixes, but a receipt from a
different business must be false.`

/**
 * Tokens too generic to count as evidence that two business names refer to
 * the same merchant ("Joe's Coffee" vs "Java Coffee" share only "coffee").
 */
const GENERIC_NAME_TOKENS = new Set([
  'the', 'and', 'of', 'a', 'an', 'at', 'on', 'in',
  'inc', 'llc', 'ltd', 'co', 'corp', 'company',
  'shop', 'store', 'cafe', 'coffee', 'restaurant', 'bar', 'grill',
  'market', 'kitchen', 'house', 'local', 'studio', 'salon', 'center',
])

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function significantTokens(name: string): string[] {
  return name.split(' ').filter((t) => t.length >= 3 && !GENERIC_NAME_TOKENS.has(t))
}

/**
 * Deterministic backstop for the model's merchant-match decision: the
 * extracted merchant name must share at least one recognizable piece of the
 * business name (a significant token, containment, a POS-style prefix
 * truncation, or an initialism). This prevents a hallucinated "match" between
 * unrelated names from validating a check-in; it never loosens the gate.
 */
export function merchantNamePlausiblyMatches(
  merchantName: string,
  businessName: string
): boolean {
  const merchant = normalizeName(merchantName)
  const business = normalizeName(businessName)
  if (!merchant || !business) return false

  const merchantCompact = merchant.replace(/\s/g, '')
  const businessCompact = business.replace(/\s/g, '')
  if (
    merchantCompact.includes(businessCompact) ||
    businessCompact.includes(merchantCompact)
  ) {
    return true
  }

  for (const mt of significantTokens(merchant)) {
    for (const bt of significantTokens(business)) {
      if (mt === bt) return true
      // POS systems truncate long names; accept 4+ char prefix matches
      if (mt.length >= 4 && bt.startsWith(mt)) return true
      if (bt.length >= 4 && mt.startsWith(bt)) return true
    }
  }

  // Initialisms: "DBDS" for "Diamond Bar Dental Studio"
  const businessInitials = business.split(' ').map((w) => w[0]).join('')
  if (merchantCompact.length >= 2 && merchantCompact === businessInitials) return true
  const merchantInitials = merchant.split(' ').map((w) => w[0]).join('')
  if (businessCompact.length >= 2 && businessCompact === merchantInitials) return true

  return false
}

function parseVerdict(text: string): GeminiReceiptVerdict | null {
  // Models occasionally wrap JSON in fences despite instructions
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (typeof parsed?.is_receipt !== 'boolean') return null
    // Trust nothing about the shape beyond is_receipt; coerce field by field
    return {
      is_receipt: parsed.is_receipt,
      merchant_name:
        typeof parsed.merchant_name === 'string' && parsed.merchant_name.trim()
          ? parsed.merchant_name.trim()
          : null,
      merchant_matches_business: parsed.merchant_matches_business === true,
      purchase_date:
        typeof parsed.purchase_date === 'string' ? parsed.purchase_date : null,
      total_amount:
        typeof parsed.total_amount === 'number' &&
        Number.isFinite(parsed.total_amount) &&
        parsed.total_amount > 0
          ? parsed.total_amount
          : null,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    }
  } catch {
    return null
  }
}

/** Returns a rejection reason for stale or future-dated receipts, else null. */
function checkPurchaseDate(purchaseDate: string | null): string | null {
  if (!purchaseDate) return null // unreadable date: give the benefit of the doubt
  const date = new Date(`${purchaseDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const ageMs = Date.now() - date.getTime()
  if (ageMs < -FUTURE_DATE_SLACK_MS) {
    return `This receipt is dated ${purchaseDate}, which is in the future.`
  }
  if (ageMs > MAX_RECEIPT_AGE_DAYS * 24 * 60 * 60 * 1000) {
    return `This receipt is from ${purchaseDate} — only purchases from the last ${MAX_RECEIPT_AGE_DAYS} days count.`
  }
  return null
}

export async function verifyReceiptImage(options: {
  imageBase64: string
  mimeType: string
  businessName: string
}): Promise<ReceiptVerification> {
  const { imageBase64, mimeType, businessName } = options

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    // Verification is a gate, not a creative task: deterministic output only
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent([
    VERIFICATION_PROMPT(businessName),
    { inlineData: { data: imageBase64, mimeType } },
  ])

  const verdict = parseVerdict(result.response.text())
  if (!verdict) {
    return {
      verified: false,
      reason: 'Could not read the receipt — try a clearer photo.',
      merchantName: null,
      total: null,
    }
  }

  if (!verdict.is_receipt) {
    return {
      verified: false,
      reason: "That image doesn't look like a purchase receipt.",
      merchantName: verdict.merchant_name,
      total: null,
    }
  }

  if (!verdict.merchant_matches_business) {
    return {
      verified: false,
      reason: `This receipt appears to be from ${verdict.merchant_name ?? 'a different business'}, not ${businessName}.`,
      merchantName: verdict.merchant_name,
      total: verdict.total_amount,
    }
  }

  // A match claim without a readable merchant name is not evidence
  if (!verdict.merchant_name) {
    return {
      verified: false,
      reason: 'Could not read the merchant name on the receipt — try a clearer photo.',
      merchantName: null,
      total: verdict.total_amount,
    }
  }

  // Deterministic backstop: the model has approved receipts from unrelated
  // businesses, so its match decision alone is not enough
  if (!merchantNamePlausiblyMatches(verdict.merchant_name, businessName)) {
    return {
      verified: false,
      reason: `This receipt appears to be from ${verdict.merchant_name}, not ${businessName}.`,
      merchantName: verdict.merchant_name,
      total: verdict.total_amount,
    }
  }

  const dateProblem = checkPurchaseDate(verdict.purchase_date)
  if (dateProblem) {
    return {
      verified: false,
      reason: dateProblem,
      merchantName: verdict.merchant_name,
      total: verdict.total_amount,
    }
  }

  return {
    verified: true,
    reason: null,
    merchantName: verdict.merchant_name,
    total: verdict.total_amount,
  }
}
