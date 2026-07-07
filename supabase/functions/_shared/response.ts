import { getCorsHeaders } from './cors.ts'

/** 标准 JSON 成功响应 */
export function ok(data: unknown, req: Request, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    ...init,
  })
}

/** 标准 JSON 错误响应 */
export function err(message: string, req: Request, status = 400, code?: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: message, code: code || `HTTP_${status}` }),
    { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  )
}

/** OPTIONS 预检请求快速返回 */
export function handleOptions(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) })
}

/** 简单的请求日志（仅记录 method + path，不打敏感 body） */
export function logRequest(req: Request, label = ''): void {
  const url = new URL(req.url)
  console.log(`[${label || 'fn'}] ${req.method} ${url.pathname}${url.search}`)
}
