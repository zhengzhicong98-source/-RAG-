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

    const body = await req.json()
    const { address, city } = body

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'address 为必填参数' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const params = new URLSearchParams({ address, key: amapKey })
    if (city) params.set('city', city)

    const upstream = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?${params}`,
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    )

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `上游服务错误: ${upstream.status}` }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const data = await upstream.json()
    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('geocoding 错误:', err)
    return new Response(
      JSON.stringify({ error: '地理编码服务异常，请稍后重试' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
