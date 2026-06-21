import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getAdminStats } from '@/db/api'

interface AdminStats {
  total: number
  positive: number
  negative: number
  feedbackTotal: number
  avgResponseTime: number
  ragHitRate: number
  recentLogs: Array<{
    id: string
    function_name: string
    model: string
    response_time_ms: number
    success: boolean
    error_message: string | null
    created_at: string
  }>
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

export default function Stats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await getAdminStats()
      setStats(data)
    } catch (err) {
      console.error('加载统计数据失败:', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const satisfactionRate = stats && stats.feedbackTotal > 0
    ? Math.round((stats.positive / stats.feedbackTotal) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <div className="bg-gradient-primary px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-primary-foreground">数据看板</p>
            <p className="text-xl text-primary-foreground/70 mt-1">AI 服务可观测性</p>
          </div>
          <button
            type="button"
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
            onClick={loadStats}
          >
            <div className={`i-mdi-refresh text-2xl text-primary-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="i-mdi-loading text-4xl text-primary animate-spin" />
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="i-mdi-chart-line text-6xl text-muted-foreground" />
            <p className="text-2xl text-muted-foreground">暂无数据</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xl text-muted-foreground">总咨询次数</p>
                <p className="text-4xl font-bold text-foreground mt-2">{stats.total}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xl text-muted-foreground">平均响应时间</p>
                <p className="text-4xl font-bold text-foreground mt-2">{formatTime(stats.avgResponseTime)}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xl text-muted-foreground">RAG 命中率</p>
                <p className="text-4xl font-bold text-foreground mt-2">{Math.round(stats.ragHitRate * 100)}%</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xl text-muted-foreground">用户满意度</p>
                <p className="text-4xl font-bold text-green-600 mt-2">{satisfactionRate}%</p>
                <p className="text-lg text-muted-foreground mt-1">
                  👍 {stats.positive} / 👎 {stats.negative}
                </p>
              </div>
            </div>

            {/* 反馈统计条 */}
            {stats.feedbackTotal > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xl font-semibold text-foreground mb-3">反馈分布</p>
                <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${(stats.positive / stats.feedbackTotal) * 100}%` }}
                  />
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${(stats.negative / stats.feedbackTotal) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-lg text-green-600">有用 {stats.positive}</span>
                  <span className="text-lg text-red-600">没用 {stats.negative}</span>
                </div>
              </div>
            )}

            {/* 最近调用日志 */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xl font-semibold text-foreground">最近 20 条 AI 调用</p>
              </div>
              {stats.recentLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">暂无调用记录</div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.recentLogs.map(log => (
                    <div key={log.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-base px-2 py-0.5 rounded-full flex items-center gap-1 ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <div className={log.success ? 'i-mdi-check-circle text-base' : 'i-mdi-alert-circle text-base'} />
                              {log.success ? '成功' : '失败'}
                            </span>
                            <span className="text-lg font-medium text-foreground">{log.function_name}</span>
                          </div>
                          <p className="text-base text-muted-foreground mt-1">
                            {log.model} · {formatTime(log.response_time_ms)}
                          </p>
                          {log.error_message && (
                            <p className="text-sm text-red-600 mt-1 truncate">{log.error_message}</p>
                          )}
                        </div>
                        <span className="text-base text-muted-foreground flex-shrink-0">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
