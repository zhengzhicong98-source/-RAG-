import { getCorsHeaders } from '../_shared/cors.ts'
import { ok, err, handleOptions, logRequest } from '../_shared/response.ts'
import { requireAuth, requireAdmin } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)

  try {
    logRequest(req, 'notify')

    // JWT 鉴权
    const authResult = await requireAuth(req)
    if (authResult instanceof Response) return authResult
    const { user, supabaseAdmin } = authResult

    const body = await req.json()
    const { to_user_id, type, title, body: notifyBody, related_id } = body

    if (!to_user_id || !type || !title) return err('缺少必要参数', req, 400)
    if (!['like', 'save', 'comment', 'system'].includes(type)) return err('无效的通知类型', req, 400)

    // 防伪造：禁止给自己发通知
    if (to_user_id === user.id) return err('不能给自己发通知', req, 400)

    // 权限校验
    if (type === 'system') {
      // system 类型必须是 admin/moderator
      const adminCheck = requireAdmin(user, req)
      if (adminCheck) return adminCheck
    } else {
      // like/save/comment: related_id 必须指向 case_posts，且 to_user_id 必须是该帖作者
      if (!related_id) return err('缺少 related_id', req, 400)
      const { data: post, error: postErr } = await supabaseAdmin
        .from('case_posts')
        .select('user_id')
        .eq('id', related_id)
        .single()
      if (postErr || !post) return err('相关内容不存在', req, 404)
      if (post.user_id !== to_user_id) return err('通知目标与内容归属不匹配', req, 403)
    }

    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: to_user_id,
      type,
      title,
      body: notifyBody || '',
      related_id: related_id || null,
    })

    if (error) { console.error('[notify] insert error:', error); return err('通知写入失败', req, 500) }
    return ok({ success: true }, req)
  } catch (e) {
    console.error('[notify] 错误:', e)
    return err('服务异常', req, 500)
  }
})
// 保留 getCorsHeaders 引用以防调用者需要
void getCorsHeaders;
