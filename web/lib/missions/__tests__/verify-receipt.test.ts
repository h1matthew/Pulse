import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent }
    }
  },
}))

import { verifyReceiptImage } from '../verify-receipt'

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
})
