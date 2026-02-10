/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNavigation } from '../useNavigation'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}))

describe('useNavigation', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('calls router.push when navigate is called', () => {
    const { result } = renderHook(() => useNavigation())

    act(() => {
      result.current.navigate('/test')
    })

    expect(mockPush).toHaveBeenCalledWith('/test')
  })

  it('returns isNavigating as false initially', () => {
    const { result } = renderHook(() => useNavigation())
    expect(result.current.isNavigating).toBe(false)
  })
})
