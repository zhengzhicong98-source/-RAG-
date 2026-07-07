// _shared/auth.ts — JWT 鉴权中间件
// 参照 notify/index.ts 和 embed-document/index.ts 的已有写法

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { err } from './response.ts'

export interface AuthUser {
  id: string
  email?: string
  role?: string
}

/**
 * JWT Bearer Token 鉴权
 * 成功返回 { user, supabaseAdmin }，失败返回 401 Response
 */
export async function requireAuth(req: Request): Promise<
  | { user: AuthUser; supabaseAdmin: ReturnType<typeof createClient> }
  | Response
> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return err('请先登录', req, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)

  if (authError || !user) {
    return err('认证失败，请重新登录', req, 401)
  }

  // 查询用户角色（profiles 表）
  const supabaseAdmin = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    user: {
      id: user.id,
      email: user.email,
      role: profile?.role || 'user',
    },
    supabaseAdmin,
  }
}

/**
 * 要求 admin 或 moderator 角色，否则返回 403
 */
export function requireAdmin(user: AuthUser, req: Request): Response | null {
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return err('权限不足', req, 403)
  }
  return null
}
