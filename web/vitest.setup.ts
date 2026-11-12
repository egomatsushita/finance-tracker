import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// @testing-library/react's auto-cleanup relies on a global `afterEach`,
// which isn't available since this project doesn't enable Vitest's
// `globals` option — register it explicitly instead.
afterEach(() => {
  cleanup()
})

// jsdom has no matchMedia. Default to "no match" (light); tests that care
// about the result (e.g. useColorScheme, AppShell) override this per-test
// via vi.stubGlobal.
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList)

// jsdom has no ResizeObserver; recharts' <ResponsiveContainer> needs one to
// measure its container and render children at all.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).ResizeObserver = ResizeObserverStub

// jsdom has no real layout engine, so getBoundingClientRect() (what
// recharts' <ResponsiveContainer> reads to size itself) always returns 0x0,
// and recharts renders nothing. Stub a plausible fixed size for tests.
HTMLElement.prototype.getBoundingClientRect = () =>
  ({
    width: 500,
    height: 300,
    top: 0,
    left: 0,
    right: 500,
    bottom: 300,
    x: 0,
    y: 0,
    toJSON() {},
  }) as DOMRect
