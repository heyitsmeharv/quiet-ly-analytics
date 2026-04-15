import { Analytics } from './Analytics'

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true })
;(globalThis as any).fetch = mockFetch

// Mock Web Storage
const storage: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v },
  removeItem: (k: string) => { delete storage[k] },
}
;(globalThis as any).sessionStorage = {
  getItem: (k: string) => storage[`s_${k}`] ?? null,
  setItem: (k: string, v: string) => { storage[`s_${k}`] = v },
  removeItem: (k: string) => { delete storage[`s_${k}`] },
}

beforeEach(() => {
  mockFetch.mockClear()
  Object.keys(storage).forEach((k) => delete storage[k])
})

describe('Analytics', () => {
  const config = { endpoint: 'https://example.lambda-url.aws', appId: 'test-app' }

  it('sends a page_view event on pageview()', async () => {
    const a = new Analytics(config)
    a.pageview('/home')

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('page_view')
    expect(body.path).toBe('/home')
    expect(body.appId).toBe('test-app')
    expect(body.timestamp).toBeTruthy()
    expect(body.visitorId).toBeTruthy()
    expect(body.sessionId).toBeTruthy()
    expect(typeof body.timezone).toBe('string')
    expect(typeof body.locale).toBe('string')
  })

  it('sends a custom event on track()', async () => {
    const a = new Analytics(config)
    a.track('button_clicked', { label: 'submit' })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('button_clicked')
    expect(body.params).toEqual({ label: 'submit' })
  })

  it('includes userId after identify()', async () => {
    const a = new Analytics(config)
    a.identify('user-123')
    a.track('signed_in')

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.userId).toBe('user-123')
  })

  it('does not send when debug mode is on', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const a = new Analytics({ ...config, debug: true })
    a.pageview('/test')

    expect(mockFetch).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith('[quiet-ly]', expect.objectContaining({ type: 'page_view' }))
    consoleSpy.mockRestore()
  })

  it('reuses the same visitorId across instances', async () => {
    const a1 = new Analytics(config)
    const a2 = new Analytics(config)
    a1.pageview('/a')
    a2.pageview('/b')

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetch).toHaveBeenCalledTimes(2)

    const vid1 = JSON.parse(mockFetch.mock.calls[0][1].body).visitorId
    const vid2 = JSON.parse(mockFetch.mock.calls[1][1].body).visitorId
    expect(vid1).toBe(vid2)
  })

  it('clears IDs on reset()', async () => {
    const a = new Analytics(config)
    a.pageview('/a')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const vidBefore = JSON.parse(mockFetch.mock.calls[0][1].body).visitorId

    a.reset()
    mockFetch.mockClear()

    a.pageview('/b')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const vidAfter = JSON.parse(mockFetch.mock.calls[0][1].body).visitorId

    expect(vidBefore).not.toBe(vidAfter)
  })
})
