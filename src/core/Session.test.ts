import { getVisitorId, getSessionId, clearSession } from './Session'

const storage: Record<string, string> = {}

beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k])
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
})

describe('Session', () => {
  describe('getVisitorId', () => {
    it('returns a UUID string', () => {
      const vid = getVisitorId()
      expect(vid).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('returns the same ID on repeated calls', () => {
      const vid1 = getVisitorId()
      const vid2 = getVisitorId()
      expect(vid1).toBe(vid2)
    })

    it('persists the visitor ID in localStorage', () => {
      const vid = getVisitorId()
      expect(localStorage.getItem('qly_vid')).toBe(vid)
    })
  })

  describe('getSessionId', () => {
    it('returns a UUID string', () => {
      const sid = getSessionId()
      expect(sid).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('returns the same ID on repeated calls', () => {
      const sid1 = getSessionId()
      const sid2 = getSessionId()
      expect(sid1).toBe(sid2)
    })

    it('persists the session ID in sessionStorage', () => {
      const sid = getSessionId()
      expect(sessionStorage.getItem('qly_sid')).toBe(sid)
    })

    it('generates a different ID from the visitor ID', () => {
      const vid = getVisitorId()
      const sid = getSessionId()
      expect(sid).not.toBe(vid)
    })
  })

  describe('clearSession', () => {
    it('removes both visitor and session IDs', () => {
      getVisitorId()
      getSessionId()
      clearSession()
      expect(localStorage.getItem('qly_vid')).toBeNull()
      expect(sessionStorage.getItem('qly_sid')).toBeNull()
    })

    it('causes a new visitor ID to be generated after clear', () => {
      const before = getVisitorId()
      clearSession()
      const after = getVisitorId()
      expect(after).not.toBe(before)
    })
  })
})
