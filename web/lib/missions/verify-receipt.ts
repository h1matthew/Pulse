/**
 * Receipt Verification — Gemini Vision
 *
 * Check-ins (and therefore mission progress) require proof of an actual
 * purchase. The user scans their receipt; Gemini reads it and answers three
 * questions: is this a purchase receipt, does the merchant match the business
 * being checked into, and when was the purchase made. Only verified receipts
 * create check-ins.
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

const VERIFICATION_PROMPT = (businessName: string) => `You are verifying a
purchase receipt for a local-business rewards app. Look at the image and
answer in STRICT JSON (no markdown fences, no commentary):

{
  "is_receipt": boolean,        // is this an actual purchase receipt or order confirmation?
  "merchant_name": string|null, // merchant name printed on the receipt
  "merchant_matches_business": boolean, // does the merchant plausibly match "${businessName}"? Allow abbreviations, location suffixes, POS-system truncation.
  "purchase_date": string|null, // purchase date as YYYY-MM-DD if readable, else null
  "total_amount": number|null,  // receipt total in dollars if readable, else null
  "reasoning": string           // one short sentence
}

Be strict about is_receipt (screenshots of menus, storefront photos, or random
images are NOT receipts) but lenient about merchant matching when names are
truncated or abbreviated.`

function parseVerdict(text: string): GeminiReceiptVerdict | null {
  // Models occasionally wrap JSON in fences despite instructions
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (typeof parsed?.is_receipt !== 'boolean') return null
    return parsed as GeminiReceiptVerdict
  } catch {
    return null
  }
}

function isFreshEnough(purchaseDate: string | null): boolean {
  if (!purchaseDate) return true // unreadable date: give the benefit of the doubt
  const date = new Date(`${purchaseDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return true
  const ageMs = Date.now() - date.getTime()
  return ageMs <= MAX_RECEIPT_AGE_DAYS * 24 * 60 * 60 * 1000
}

export async function verifyReceiptImage(options: {
  imageBase64: string
  mimeType: string
  businessName: string
}): Promise<ReceiptVerification> {
  const { imageBase64, mimeType, businessName } = options

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

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

  if (!isFreshEnough(verdict.purchase_date)) {
    return {
      verified: false,
      reason: `This receipt is from ${verdict.purchase_date} — only purchases from the last ${MAX_RECEIPT_AGE_DAYS} days count.`,
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
