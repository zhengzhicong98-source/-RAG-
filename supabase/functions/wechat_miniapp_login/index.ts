import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ok, err, handleOptions, logRequest } from '../_shared/response.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// 简易 IP 频率限制：每 IP 每分钟最多 5 次
const rateLimit = new Map<string, number[]>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()

  try {
    logRequest(req, 'wechat-login')

    // 频率限制检查
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    const now = Date.now()
    const timestamps = rateLimit.get(ip) || []
    const recent = timestamps.filter(t => now - t < RATE_WINDOW_MS)
    if (recent.length >= RATE_MAX) {
      return err('操作过于频繁，请稍后再试', 429)
    }
    recent.push(now)
    rateLimit.set(ip, recent)

    const { code } = await req.json().catch(() => ({}))
    if (!code) return err('缺少code', 400)

    const APP_ID = Deno.env.get('WECHAT_MINIPROGRAM_LOGIN_APP_ID')
    const APP_SECRET = Deno.env.get('WECHAT_MINIPROGRAM_LOGIN_APP_SECRET')
    if (!APP_ID || !APP_SECRET) return err('微信小程序配置缺失，请联系管理员', 500)

    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`
    )
    const wxData = await wxRes.json()

    if (wxData.errcode) return err(`微信接口错误: ${wxData.errmsg}`, 500)

    const { openid } = wxData
    const email = `${openid}@wechat.login`

    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { from: 'wechat', openid },
    })
    if (createError && !createError.message.includes('already been registered')) {
      return err(createError.message, 500)
    }

    const { data: magicLinkData, error: magicLinkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { data: { from: 'wechat', openid } },
      })

    if (magicLinkError) return err(magicLinkError.message, 500)

    const hashedToken = magicLinkData?.properties?.hashed_token ?? ''
    if (!hashedToken) return err('无法生成token', 500)

    return ok({
      token: hashedToken,
      verification_type: magicLinkData?.properties?.verification_type ?? 'email',
      openid,
    })
  } catch (error) {
    console.error('[wechat-login] 错误:', error)
    return err(error.message, 500)
  }
})
