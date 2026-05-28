import { corsHeaders } from '../_shared/cors.ts'

const ENDPOINTS: Record<string, string> = {
  driving: 'https://restapi.amap.com/v3/direction/driving',
  riding:  'https://restapi.amap.com/v4/direction/bicycling',
  walking: 'https://restapi.amap.com/v3/direction/walking',
  transit: 'https://restapi.amap.com/v3/direction/transit/integrated',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const amapKey = Deno.env.get('AMAP_KEY')
    if (!amapKey) {
      return new Response(
        JSON.stringify({ error: '服务配置错误' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { mode, origin, destination } = body

    if (!ENDPOINTS[mode]) {
      return new Response(
        JSON.stringify({ error: `无效的出行模式：${mode}，支持 driving/riding/walking/transit` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: 'origin 和 destination 为必填参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const params = new URLSearchParams({ origin, destination, key: amapKey })

    const upstream = await fetch(`${ENDPOINTS[mode]}?${params}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `上游服务错误: ${upstream.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await upstream.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('route-direction 错误:', err)
    return new Response(
      JSON.stringify({ error: '路线规划服务异常，请稍后重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
