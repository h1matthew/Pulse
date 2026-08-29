import '@testing-library/jest-dom/vitest'

// Node 22+ ships an experimental built-in localStorage that shadows jsdom's and
// throws unless --localstorage-file is passed. Back the globals with real
// Storage instances so `vi.spyOn(Storage.prototype, ...)` still intercepts.
const backing = new WeakMap<object, Record<string, string>>()

function installPrototypeStorage(key: 'localStorage' | 'sessionStorage') {
  const proto = Storage.prototype as unknown as Record<string, unknown>
  if (!backing.has(proto)) {
    proto.getItem = function (k: string) {
      const store = backing.get(this as object)
      return store && k in store ? store[k] : null
    }
    proto.setItem = function (k: string, v: string) {
      const store = backing.get(this as object)
      if (store) store[k] = String(v)
    }
    proto.removeItem = function (k: string) {
      const store = backing.get(this as object)
      if (store) delete store[k]
    }
    proto.clear = function () {
      const store = backing.get(this as object)
      if (store) for (const k of Object.keys(store)) delete store[k]
    }
    proto.key = function (i: number) {
      const store = backing.get(this as object)
      return store ? Object.keys(store)[i] ?? null : null
    }
    // jsdom may define this as non-configurable; a shimmed length is optional.
    try {
      Object.defineProperty(proto, 'length', {
        get(this: object) {
          return Object.keys(backing.get(this) ?? {}).length
        },
        configurable: true,
      })
    } catch {
      // leave the native accessor in place
    }
    backing.set(proto, {})
  }
  const instance = Object.create(Storage.prototype) as Storage
  backing.set(instance, {})
  Object.defineProperty(globalThis, key, { value: instance, configurable: true, writable: true })
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
  let usable = false
  try {
    globalThis[key].setItem('__probe__', '1')
    globalThis[key].removeItem('__probe__')
    usable = true
  } catch {
    usable = false
  }
  if (!usable) installPrototypeStorage(key)
}

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
