import '@testing-library/jest-dom/vitest'

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(performance.now()), 16) as unknown as number
  }
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id)
  }
}
