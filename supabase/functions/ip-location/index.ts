import { getCorsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors })
  }

  // JWT 鉴权
  const authResult = await requireAuth(req)
  if (authResult instanceof Response) return authResult

  try {
    const amapKey = Deno.env.get('AMAP_KEY')
    if (!amapKey) {
      return new Response(
        JSON.stringify({ error: '服务配置错误' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch(`https://restapi.amap.com/v3/ip?key=${amapKey}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`IP API 响应错误: ${response.status}`)
    }

    const data = await response.json()

    // 高德 status "1" 表示成功
    if (data.status !== '1') {
      return new Response(
        JSON.stringify({ error: 'IP定位失败', code: data.status, info: data.info }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        province: data.province || '',
        city: data.city || '',
        adcode: data.adcode || '',
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('ip-location 错误:', error)
    return new Response(
      JSON.stringify({ error: 'IP定位服务异常，请稍后重试' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
