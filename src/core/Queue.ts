export interface QueueItem<T = unknown> {
  payload: T
  endpoint: string
}

export class Queue<T = unknown> {
  private queue: QueueItem<T>[] = []
  private flushing = false

  enqueue(item: QueueItem<T>): void {
    this.queue.push(item)
    void this.flush()
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return
    this.flushing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      await this.send(item)
    }

    this.flushing = false
  }

  private async send(item: QueueItem<T>, attempt = 0): Promise<void> {
    try {
      const res = await fetch(item.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
        keepalive: true,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await this.send(item, attempt + 1)
      }
      // Second failure - drop silently. Analytics must never break the host app.
    }
  }
}
