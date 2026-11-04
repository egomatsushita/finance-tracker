import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// @testing-library/react's auto-cleanup relies on a global `afterEach`,
// which isn't available since this project doesn't enable Vitest's
// `globals` option — register it explicitly instead.
afterEach(() => {
  cleanup()
})
