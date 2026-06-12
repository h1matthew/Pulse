import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.fn()
const mockGetGenerativeModel = vi.fn((_config: unknown) => ({
  generateContent: mockGenerateContent,
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel(config: unknown) {
      return mockGetGenerativeModel(config)
    }
  },
}))

import {
  verifyReceiptImage,
  merchantNamePlausiblyMatches,
} from '../verify-receipt'

function geminiResponse(payload: unknown) {
  return { response: { text: () => JSON.stringify(payload) } }
}

const baseOptions = {
  imageBase64: 'aGVsbG8=',
  mimeType: 'image/jpeg',
  businessName: 'Diamond Bar Dental Studio',
}

describe('verifyReceiptImage', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset()
    mockGetGenerativeModel.mockClear()
  })

  it('runs verification deterministically (temperature 0, JSON output)', async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: false,
        merchant_name: null,
        merchant_matches_business: false,
        purchase_date: null,
        total_amount: null,
        reasoning: 'n/a',
      })
    )

    await verifyReceiptImage(baseOptions)

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          temperature: 0,
          responseMimeType: 'application/json',
        }),
      })
    )
  })

  it('verifies a matching, recent receipt and extracts the total', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: true,
        merchant_name: 'Diamond Bar Dental',
        merchant_matches_business: true,
        purchase_date: today,
        total_amount: 42.5,
        reasoning: 'Receipt matches.',
      })
    )

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(true)
    expect(result.total).toBe(42.5)
    expect(result.merchantName).toBe('Diamond Bar Dental')
  })

  it('rejects images that are not receipts', async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: false,
        merchant_name: null,
        merchant_matches_business: false,
        purchase_date: null,
        total_amount: null,
        reasoning: 'Photo of a storefront.',
      })
    )

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(false)
    expect(result.reason).toMatch(/doesn't look like a purchase receipt/i)
  })

  it('rejects receipts from a different merchant', async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: true,
        merchant_name: 'Some Other Store',
        merchant_matches_business: false,
        purchase_date: null,
        total_amount: 10,
        reasoning: 'Different merchant.',
      })
    )

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(false)
    expect(result.reason).toContain('Some Other Store')
  })

  it('rejects stale receipts older than the freshness window', async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: true,
        merchant_name: 'Diamond Bar Dental',
        merchant_matches_business: true,
        purchase_date: '2020-01-01',
        total_amount: 20,
        reasoning: 'Old receipt.',
      })
    )

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(false)
    expect(result.reason).toMatch(/last 7 days/i)
  })

  it('accepts receipts with unreadable dates (benefit of the doubt)', async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: true,
        merchant_name: 'Diamond Bar Dental',
        merchant_matches_business: true,
        purchase_date: null,
        total_amount: null,
        reasoning: 'Date unreadable.',
      })
    )

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(true)
  })

  it('handles fenced JSON output from the model', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '```json\n' +
          JSON.stringify({
            is_receipt: true,
            merchant_name: 'DB Dental',
            merchant_matches_business: true,
            purchase_date: today,
            total_amount: 12,
            reasoning: 'ok',
          }) +
          '\n```',
      },
    })

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(true)
  })

  it('parses JSON even when the model adds surrounding commentary', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          'Sure! Here is the verdict:\n' +
          JSON.stringify({
            is_receipt: true,
            merchant_name: 'Diamond Bar Dental',
            merchant_matches_business: true,
            purchase_date: today,
            total_amount: 30,
            reasoning: 'ok',
          }) +
          '\nLet me know if you need anything else.',
      },
    })

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(true)
    expect(result.total).toBe(30)
  })

  it('fails closed when the model returns garbage', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'not json at all' },
    })

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(false)
    expect(result.reason).toMatch(/could not read/i)
  })

  // Regression: live testing showed the model approving receipts from
  // unrelated businesses; the deterministic guardrail must catch that.
  it('rejects a model-approved match between unrelated names', async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: true,
        merchant_name: 'BLUE BOTTLE COFFEE',
        merchant_matches_business: true, // model hallucinated a match
        purchase_date: null,
        total_amount: 9.75,
        reasoning: 'Looks fine.',
      })
    )

    const result = await verifyReceiptImage({
      ...baseOptions,
      businessName: "Joe's Pizza Palace",
    })

    expect(result.verified).toBe(false)
    expect(result.reason).toContain('BLUE BOTTLE COFFEE')
    expect(result.reason).toContain("Joe's Pizza Palace")
  })

  it('rejects a claimed match when no merchant name was readable', async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: true,
        merchant_name: null,
        merchant_matches_business: true,
        purchase_date: null,
        total_amount: 12,
        reasoning: 'Merchant illegible.',
      })
    )

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(false)
    expect(result.reason).toMatch(/merchant name/i)
  })

  it('rejects future-dated receipts', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: true,
        merchant_name: 'Diamond Bar Dental',
        merchant_matches_business: true,
        purchase_date: future,
        total_amount: 20,
        reasoning: 'ok',
      })
    )

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(false)
    expect(result.reason).toMatch(/future/i)
  })

  it('discards nonsense totals instead of recording them', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockGenerateContent.mockResolvedValue(
      geminiResponse({
        is_receipt: true,
        merchant_name: 'Diamond Bar Dental',
        merchant_matches_business: true,
        purchase_date: today,
        total_amount: -50,
        reasoning: 'ok',
      })
    )

    const result = await verifyReceiptImage(baseOptions)

    expect(result.verified).toBe(true)
    expect(result.total).toBeNull()
  })
})

describe('merchantNamePlausiblyMatches', () => {
  it('accepts exact and contained names', () => {
    expect(
      merchantNamePlausiblyMatches('BLUE BOTTLE COFFEE', 'Blue Bottle Coffee')
    ).toBe(true)
    expect(
      merchantNamePlausiblyMatches('Blue Bottle', 'Blue Bottle Coffee Co.')
    ).toBe(true)
  })

  it('accepts POS-style truncation via shared or prefixed tokens', () => {
    expect(
      merchantNamePlausiblyMatches('DIAMOND BAR DENT', 'Diamond Bar Dental Studio')
    ).toBe(true)
    expect(
      merchantNamePlausiblyMatches('DB Dental', 'Diamond Bar Dental Studio')
    ).toBe(true)
  })

  it('accepts initialisms', () => {
    expect(
      merchantNamePlausiblyMatches('DBDS', 'Diamond Bar Dental Studio')
    ).toBe(true)
  })

  it('rejects unrelated names', () => {
    expect(
      merchantNamePlausiblyMatches('BLUE BOTTLE COFFEE', "Joe's Pizza Palace")
    ).toBe(false)
    expect(
      merchantNamePlausiblyMatches('Walmart Supercenter', 'Daily Grind Coffee')
    ).toBe(false)
  })

  it('does not match on generic words alone', () => {
    expect(
      merchantNamePlausiblyMatches("Philz Coffee", 'Blue Bottle Coffee')
    ).toBe(false)
    expect(
      merchantNamePlausiblyMatches('The Corner Store', 'The Book Store')
    ).toBe(false)
  })

  it('rejects empty or whitespace names', () => {
    expect(merchantNamePlausiblyMatches('', 'Blue Bottle Coffee')).toBe(false)
    expect(merchantNamePlausiblyMatches('  ', 'Blue Bottle Coffee')).toBe(false)
  })
})
