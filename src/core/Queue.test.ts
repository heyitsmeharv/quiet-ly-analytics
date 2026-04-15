import { Queue } from './Queue'

const mockFetch = vi.fn().mockResolvedValue({ ok: true })
;(globalThis as any).fetch = mockFetch

beforeEach(() => {
  mockFetch.mockClear()
  vi.useRealTimers()
})

describe('Queue', () => {
  it('flushes an enqueued item via fetch', async () => {
    const q = new Queue()
    q.enqueue({ payload: { type: 'test' }, endpoint: 'https://example.com' })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe('https://example.com')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ type: 'test' })
  })

  it('sends items in order', async () => {
    const q = new Queue()
    q.enqueue({ payload: { seq: 1 }, endpoint: 'https://example.com' })
    q.enqueue({ payload: { seq: 2 }, endpoint: 'https://example.com' })
    q.enqueue({ payload: { seq: 3 }, endpoint: 'https://example.com' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockFetch).toHaveBeenCalledTimes(3)
    const seqs = mockFetch.mock.calls.map((call: any[]) => JSON.parse(call[1].body).seq)
    expect(seqs).toEqual([1, 2, 3])
  })

  it('does not throw when fetch fails', async () => {
    vi.useFakeTimers()
    mockFetch.mockRejectedValue(new Error('network error'))
    const q = new Queue()

    q.enqueue({ payload: { type: 'test' }, endpoint: 'https://example.com' })
    await vi.advanceTimersByTimeAsync(2100)

    // No throw — just silent drop after retry
    expect(mockFetch).toHaveBeenCalledTimes(2) // initial + one retry
  })

  it('retries once after a network failure', async () => {
    vi.useFakeTimers()
    mockFetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({ ok: true })

    const q = new Queue()
    q.enqueue({ payload: { seq: 1 }, endpoint: 'https://example.com' })

    await vi.advanceTimersByTimeAsync(2100)

    expect(mockFetch).toHaveBeenCalledTimes(2) // initial fail + retry success
  })

  it('continues processing subsequent items after a failed item is retried', async () => {
    vi.useFakeTimers()
    mockFetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({ ok: true })

    const q = new Queue()
    q.enqueue({ payload: { seq: 1 }, endpoint: 'https://example.com' })
    q.enqueue({ payload: { seq: 2 }, endpoint: 'https://example.com' })

    await vi.advanceTimersByTimeAsync(2100)

    // 3 calls: initial fail for seq=1, retry success for seq=1, seq=2
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('uses keepalive: true on fetch calls', async () => {
    const q = new Queue()
    q.enqueue({ payload: {}, endpoint: 'https://example.com' })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockFetch.mock.calls[0][1].keepalive).toBe(true)
  })
})
