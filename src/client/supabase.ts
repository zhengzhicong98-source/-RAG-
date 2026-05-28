// @ts-nocheck

import {createClient} from '@supabase/supabase-js'
import Taro, {showToast} from '@tarojs/taro'

const supabaseUrl: string = process.env.TARO_APP_SUPABASE_URL!
const supabaseAnonKey: string = process.env.TARO_APP_SUPABASE_ANON_KEY || 'TOKEN'
const appId: string = process.env.TARO_APP_APP_ID!

let noticed = false
export const customFetch: typeof fetch = async (url: string, options: RequestInit) => {
  let headers: HeadersInit = options.headers || {}
  const {method = 'GET', body} = options

  if (options.headers instanceof Map) {
    headers = Object.fromEntries(options.headers)
  }

  return new Promise((resolve) => {
    Taro.request({
      url,
      method: method as keyof Taro.request.Method,
      header: headers,
      data: body,
      responseType: 'text',
      timeout: 30000,
      success(res) {
        if (res.statusCode > 300 && res.data?.code === 'SupabaseNotReady' && !noticed) {
          const tip = res.data.message || res.data.msg || '服务端报错'
          noticed = true
          showToast({ title: tip, icon: 'error', duration: 5000 })
        }

        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => res.data,
          text: async () => JSON.stringify(res.data),
          data: res.data,
          headers: {
            get: (key: string) => {
              if (!res.header || !key) return null
              const lowerKey = key.toLowerCase()
              for (const [k, v] of Object.entries(res.header)) {
                if (k.toLowerCase() === lowerKey) return v as string
              }
              return null
            }
          }
        } as unknown as Response)
      },
      fail(err) {
        // fail 时 resolve 而非 reject，避免未捕获异常导致页面崩溃
        resolve({
          ok: false,
          status: 0,
          json: async () => ({ error: err.errMsg }),
          text: async () => JSON.stringify({ error: err.errMsg }),
          data: null,
          headers: { get: () => null }
        } as unknown as Response)
      },
    })
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  },
  auth: {
    storageKey: `${appId}-auth-token`
  }
})
