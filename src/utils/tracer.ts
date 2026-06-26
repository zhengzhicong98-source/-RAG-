// 轻量级前端链路追踪工具
import { supabase } from '@/client/supabase'

export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export class Span {
  private traceId: string
  private spanName: string
  private startTime: Date
  private userId?: string

  constructor(traceId: string, spanName: string, userId?: string) {
    this.traceId = traceId
    this.spanName = spanName
    this.startTime = new Date()
    this.userId = userId
  }

  async finish(status: 'ok' | 'error' | 'timeout' = 'ok', metadata?: Record<string, unknown>) {
    const endTime = new Date()
    const durationMs = endTime.getTime() - this.startTime.getTime()

    void supabase.from('trace_logs').insert({
      trace_id: this.traceId,
      user_id: this.userId || null,
      span_name: this.spanName,
      start_time: this.startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_ms: durationMs,
      status,
      metadata: metadata || {},
    })

    return durationMs
  }
}
