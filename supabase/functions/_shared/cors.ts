// CORS 白名单：仅允许下列来源
// 注意：GitHub Pages 的 Origin 只到域名（不含 /legal-assistant/ 路径）
const ALLOWED_ORIGINS = new Set<string>([
  'https://zhengzhicong98-source.github.io',
  'http://localhost:10086',
  'http://localhost:5173',
  'http://localhost:3000',
])

// 与 Origin 无关的基础 CORS 头
const BASE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PATCH, PUT',
  // 关键：告知 CDN/浏览器响应因 Origin 而异，防止缓存串源
  'Vary': 'Origin',
}

/**
 * 根据请求 Origin 动态生成 CORS 头
 * - 白名单内 → 回显 Origin
 * - 白名单外 → 不返回 Access-Control-Allow-Origin（浏览器会拒绝跨域）
 * - 无 Origin（微信小程序等非浏览器客户端）→ 不返回 Allow-Origin，请求正常放行
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': origin }
  }
  return { ...BASE_HEADERS }
}

/**
 * 兼容旧代码：静态导出仅含基础头（不含 Allow-Origin）。
 * 新代码请统一使用 getCorsHeaders(req)。
 */
export const corsHeaders = BASE_HEADERS
