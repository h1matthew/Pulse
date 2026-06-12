/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { ReceiptCheckInDialog } from '../ReceiptCheckInDialog'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// jsdom lacks createObjectURL
beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

function renderDialog(overrides: Partial<React.ComponentProps<typeof ReceiptCheckInDialog>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    businessId: 'biz-1',
    businessName: 'Daily Grind Coffee',
    onSuccess: vi.fn(),
    onAlreadyCheckedIn: vi.fn(),
    ...overrides,
  }
  render(<ReceiptCheckInDialog {...props} />)
  return props
}

function pickFile() {
  const input = screen.getByLabelText('Receipt photo') as HTMLInputElement
  const file = new File(['img'], 'receipt.jpg', { type: 'image/jpeg' })
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ReceiptCheckInDialog', () => {
  it('explains that proof is required and disables submit without a file', () => {
    renderDialog()

    expect(screen.getByText(/proof of purchase/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verify & check in/i })).toBeDisabled()
  })

  it('submits the receipt and reports success with mission updates', async () => {
    const result = {
      message: 'ok',
      verification: { merchant: 'Daily Grind', total: 12 },
      missionUpdates: [],
    }
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => result,
    })
    const props = renderDialog()

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /verify & check in/i }))

    await waitFor(() => {
      expect(props.onSuccess).toHaveBeenCalledWith(result)
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/businesses/biz-1/checkin')
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('receipt')).toBeInstanceOf(File)
  })

  it('shows the verification failure reason without closing', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: 'Receipt verification failed',
        reason: 'This receipt appears to be from Other Store.',
      }),
    })
    const props = renderDialog()

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /verify & check in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Other Store')
    })
    expect(props.onSuccess).not.toHaveBeenCalled()
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('rejects images over 8MB before uploading', () => {
    renderDialog()

    const input = screen.getByLabelText('Receipt photo') as HTMLInputElement
    const oversized = new File(['x'], 'huge.jpg', { type: 'image/jpeg' })
    Object.defineProperty(oversized, 'size', { value: 9 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [oversized] } })

    expect(screen.getByRole('alert')).toHaveTextContent(/8MB/)
    expect(
      screen.getByRole('button', { name: /verify & check in/i })
    ).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports already-checked-in and closes', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Already checked in today' }),
    })
    const props = renderDialog()

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /verify & check in/i }))

    await waitFor(() => {
      expect(props.onAlreadyCheckedIn).toHaveBeenCalled()
    })
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
  })
})
