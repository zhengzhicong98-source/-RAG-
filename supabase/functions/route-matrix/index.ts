import { corsHeaders } from '../_shared/cors.ts'

const TYPE_MAP: Record<string, string> = {
  driving: '0',
  riding:  '3',
  walking: '1',
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
    const { mode, origins, destinations } = body

    if (!TYPE_MAP[mode]) {
      return new Response(
        JSON.stringify({ error: `无效的出行模式：${mode}，支持 driving/riding/walking` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!Array.isArray(origins) || origins.length === 0) {
      return new Response(
        JSON.stringify({ error: 'origins 必须为非空数组' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!Array.isArray(destinations) || destinations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'destinations 必须为非空数组' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 高德距离矩阵仅支持单个 destination，取 destinations 的第一个
    const destination = destinations[0]

    const params = new URLSearchParams({
      origins: origins.join('|'),
      destination,
      type: TYPE_MAP[mode],
      key: amapKey,
    })

    const upstream = await fetch(
      `https://restapi.amap.com/v5/direction/distance?${params}`,
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    )

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
    console.error('route-matrix 错误:', err)
    return new Response(
      JSON.stringify({ error: '批量算路服务异常，请稍后重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
