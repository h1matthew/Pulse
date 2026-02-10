import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useActionGuard } from '../useActionGuard'

describe('useActionGuard', () => {
  it('calls the action and returns its result', async () => {
    const action = vi.fn().mockResolvedValue('done')
    const { result } = renderHook(() => useActionGuard(action))

    let value: string | undefined
    await act(async () => {
      value = await result.current() as string | undefined
    })

    expect(action).toHaveBeenCalledTimes(1)
    expect(value).toBe('done')
  })

  it('prevents concurrent executions', async () => {
    let resolve: () => void
    const action = vi.fn().mockImplementation(
      () => new Promise<void>((r) => { resolve = r })
    )
    const { result } = renderHook(() => useActionGuard(action))

    // Start first call (will hang until we resolve)
    let p1Done = false
    let p1: Promise<void>
    let secondResult: undefined | void

    await act(async () => {
      p1 = result.current().then(() => {
        p1Done = true
      })
      secondResult = await result.current() as undefined | void
    })

    // Second call should return undefined (was rejected)
    expect(secondResult).toBeUndefined()
    expect(action).toHaveBeenCalledTimes(1)

    // Resolve the first call
    await act(async () => {
      resolve!()
      await p1!
    })

    expect(p1Done).toBe(true)
  })

  it('allows a new call after the previous one completes', async () => {
    const action = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useActionGuard(action))

    await act(async () => {
      await result.current()
    })
    await act(async () => {
      await result.current()
    })

    expect(action).toHaveBeenCalledTimes(2)
  })

  it('passes arguments through to the action', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useActionGuard(action))

    await act(async () => {
      await result.current('arg1', 42)
    })

    expect(action).toHaveBeenCalledWith('arg1', 42)
  })

  it('resets guard even if the action throws', async () => {
    const action = vi.fn().mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useActionGuard(action))

    await act(async () => {
      try {
        await result.current()
      } catch {
        // expected
      }
    })

    // Should be able to call again after error
    action.mockResolvedValue('recovered')
    let value: string | undefined
    await act(async () => {
      value = await result.current() as string | undefined
    })

    expect(value).toBe('recovered')
    expect(action).toHaveBeenCalledTimes(2)
  })
})
