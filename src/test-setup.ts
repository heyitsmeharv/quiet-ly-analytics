// ResizeObserver is used by recharts ResponsiveContainer but is not
// available in jsdom - provide a no-op mock for all tests.
;(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
