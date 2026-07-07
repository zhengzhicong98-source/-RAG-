import { createClient } from 'jsr:@supabase/supabase-js@2'
import { ok, err, handleOptions, logRequest } from '../_shared/response.ts'

// 简易 IP 频率限制：每 IP 每分钟最多 5 次
const rateLimit = new Map<string, number[]>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)

  try {
    logRequest(req, 'wechat-login')

    // 频率限制检查
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    const now = Date.now()
    const timestamps = rateLimit.get(ip) || []
    const recent = timestamps.filter(t => now - t < RATE_WINDOW_MS)
    if (recent.length >= RATE_MAX) {
      return err('操作过于频繁，请稍后再试', req, 429)
    }
    recent.push(now)
    rateLimit.set(ip, recent)
    // 定期清理过期 IP 条目（每 100 次请求清理一次）
    if (Math.random() < 0.01) {
      for (const [k, v] of rateLimit) {
        if (v.every(t => now - t > RATE_WINDOW_MS)) rateLimit.delete(k)
      }
    }

    const { code } = await req.json().catch(() => ({}))
    if (!code) return err('缺少code', req, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return err('服务配置错误', req, 500)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const APP_ID = Deno.env.get('WECHAT_MINIPROGRAM_LOGIN_APP_ID')
    const APP_SECRET = Deno.env.get('WECHAT_MINIPROGRAM_LOGIN_APP_SECRET')
    if (!APP_ID || !APP_SECRET) return err('微信小程序配置缺失，请联系管理员', req, 500)

    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`
    )
    const wxData = await wxRes.json()

    if (wxData.errcode) return err(`微信接口错误: ${wxData.errmsg}`, req, 500)

    const { openid } = wxData
    const email = `${openid}@wechat.login`

    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { from: 'wechat', openid },
    })
    if (createError && !createError.message.includes('already been registered')) {
      return err(createError.message, req, 500)
    }

    const { data: magicLinkData, error: magicLinkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { data: { from: 'wechat', openid } },
      })

    if (magicLinkError) return err(magicLinkError.message, req, 500)

    const hashedToken = magicLinkData?.properties?.hashed_token ?? ''
    if (!hashedToken) return err('无法生成token', req, 500)

    return ok({
      token: hashedToken,
      verification_type: magicLinkData?.properties?.verification_type ?? 'email',
      openid,
    }, req)
  } catch (error) {
    console.error('[wechat-login] 错误:', error)
    return err(error instanceof Error ? error.message : String(error), req, 500)
  }
})
