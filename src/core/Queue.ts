export interface QueueItem {
  payload: unknown
  endpoint: string
}

export class Queue {
  private queue: QueueItem[] = []
  private flushing = false

  enqueue(item: QueueItem): void {
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

  private async send(item: QueueItem, attempt = 0): Promise<void> {
    try {
      await fetch(item.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
        keepalive: true,
      })
    } catch {
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await this.send(item, attempt + 1)
      }
      // Second failure — drop silently. Analytics must never break the host app.
    }
  }
}
