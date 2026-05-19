const VID_KEY = 'qly_vid'
const SID_KEY = 'qly_sid'

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getVisitorId(): string {
  try {
    let vid = localStorage.getItem(VID_KEY)
    if (!vid) {
      vid = uuid()
      localStorage.setItem(VID_KEY, vid)
    }
    return vid
  } catch {
    return uuid()
  }
}

export function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY)
    if (!sid) {
      sid = uuid()
      sessionStorage.setItem(SID_KEY, sid)
    }
    return sid
  } catch {
    return uuid()
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(VID_KEY)
    sessionStorage.removeItem(SID_KEY)
  } catch {
    // ignore - storage may be unavailable
  }
}
