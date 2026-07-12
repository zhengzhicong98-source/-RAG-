import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getAdminStats, getRagAccuracyStats, getRecentTraces, getQualityStats, type QualityStats } from '@/db/api'
import { RoleGuard } from '@/components/RoleGuard'

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
    prompt_text: string | null
    response_text: string | null
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
  const [ragStats, setRagStats] = useState<any>(null)
  const [qualityStats, setQualityStats] = useState<QualityStats | null>(null)
  const [traces, setTraces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // 展开的日志 id + 各文本"查看全文"状态
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [fullTextIds, setFullTextIds] = useState<Set<string>>(new Set())

  const toggleFullText = (key: string) => {
    setFullTextIds(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await getAdminStats()
      setStats(data)
      getRagAccuracyStats().then(setRagStats).catch(() => {})
      getRecentTraces(20).then(setTraces).catch(() => {})
      getQualityStats().then(setQualityStats).catch(() => {})
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
    <RoleGuard requiredRole="admin">
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
                  {stats.recentLogs.map(log => {
                    const isExpanded = expandedLogId === log.id
                    const hasText = !!(log.prompt_text || log.response_text)
                    const promptKey = `${log.id}-p`
                    const responseKey = `${log.id}-r`
                    const showFullPrompt = fullTextIds.has(promptKey)
                    const showFullResponse = fullTextIds.has(responseKey)
                    const TRUNCATE = 200
                    return (
                      <div key={log.id} className="px-4 py-3">
                        <div
                          className="flex items-start justify-between gap-2 active:bg-muted/30"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-base px-2 py-0.5 rounded-full flex items-center gap-1 ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                <div className={log.success ? 'i-mdi-check-circle text-base' : 'i-mdi-alert-circle text-base'} />
                                {log.success ? '成功' : '失败'}
                              </span>
                              <span className="text-lg font-medium text-foreground">{log.function_name}</span>
                              {hasText && (
                                <div className={`i-mdi-chevron-down text-lg text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              )}
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

                        {/* 展开面板：完整 prompt / response */}
                        {isExpanded && hasText && (
                          <div className="mt-3 flex flex-col gap-3">
                            {log.prompt_text && (
                              <div className="bg-muted rounded-xl p-3">
                                <div className="flex items-center gap-1 mb-2">
                                  <div className="i-mdi-account-question-outline text-lg text-primary" />
                                  <span className="text-base font-medium text-foreground">用户提问</span>
                                </div>
                                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                  {showFullPrompt || log.prompt_text.length <= TRUNCATE
                                    ? log.prompt_text
                                    : log.prompt_text.slice(0, TRUNCATE) + '…'}
                                </p>
                                {log.prompt_text.length > TRUNCATE && (
                                  <span
                                    className="inline-block mt-2 text-base text-primary active:opacity-70"
                                    onClick={(e) => { e.stopPropagation(); toggleFullText(promptKey) }}
                                  >
                                    {showFullPrompt ? '收起' : '查看全文'}
                                  </span>
                                )}
                              </div>
                            )}
                            {log.response_text && (
                              <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                                <div className="flex items-center gap-1 mb-2">
                                  <div className="i-mdi-robot-outline text-lg text-primary" />
                                  <span className="text-base font-medium text-foreground">AI 回答</span>
                                </div>
                                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                  {showFullResponse || log.response_text.length <= TRUNCATE
                                    ? log.response_text
                                    : log.response_text.slice(0, TRUNCATE) + '…'}
                                </p>
                                {log.response_text.length > TRUNCATE && (
                                  <span
                                    className="inline-block mt-2 text-base text-primary active:opacity-70"
                                    onClick={(e) => { e.stopPropagation(); toggleFullText(responseKey) }}
                                  >
                                    {showFullResponse ? '收起' : '查看全文'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* AI 回答质量评分（多维度） */}
            {qualityStats && qualityStats.total_evaluated > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xl font-semibold text-foreground">AI 回答质量评分</p>
                  <span className="text-base text-muted-foreground">
                    已评估 {qualityStats.total_evaluated} 条
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { key: 'overall', label: '综合评分', value: qualityStats.avg_overall },
                    { key: 'relevance', label: '相关性', value: qualityStats.avg_relevance },
                    { key: 'accuracy', label: '法条准确性', value: qualityStats.avg_accuracy },
                    { key: 'completeness', label: '完整性', value: qualityStats.avg_completeness },
                    { key: 'helpfulness', label: '帮助程度', value: qualityStats.avg_helpfulness },
                  ].map(dim => {
                    const score = Number(dim.value) || 0
                    const pct = Math.round(score * 100)
                    // 分数分档配色
                    const barColor = score >= 0.8
                      ? 'bg-green-500'
                      : score >= 0.6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                    const textColor = score >= 0.8
                      ? 'text-green-600'
                      : score >= 0.6
                      ? 'text-yellow-600'
                      : 'text-red-600'
                    return (
                      <div key={dim.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg text-foreground">{dim.label}</span>
                          <span className={`text-lg font-semibold ${textColor}`}>{pct}%</span>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* RAG 准确率统计 */}
            {ragStats && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xl font-semibold text-foreground mb-3">RAG 检索准确率</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-base text-muted-foreground">总查询次数</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{ragStats.total_queries || 0}</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-base text-muted-foreground">用户满意率</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{ragStats.satisfaction_rate || 0}%</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-base text-muted-foreground">Top1 平均相似度</p>
                    <p className="text-3xl font-bold text-primary mt-1">{ragStats.avg_top1_similarity || 0}</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-base text-muted-foreground">AI 自评有用率</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">
                      {ragStats.total_queries > 0
                        ? Math.round((ragStats.ai_eval_useful / ragStats.total_queries) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 链路追踪看板 */}
            {traces.length > 0 && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xl font-semibold text-foreground">最近 {traces.length} 条调用链路</p>
                </div>
                <div className="divide-y divide-border">
                  {traces.map((trace: any) => (
                    <div key={trace.trace_id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-medium text-foreground truncate">{trace.trace_id}</p>
                          <p className="text-base text-muted-foreground">
                            {trace.spans.length} 个 span · 总耗时 {trace.total_duration_ms}ms
                            {trace.status === 'error' && <span className="text-red-600 ml-2">含错误</span>}
                          </p>
                        </div>
                        <span className="text-base text-muted-foreground flex-shrink-0">
                          {trace.spans.map((s: any) => `${s.span_name}:${s.duration_ms || '?'}ms`).join(' → ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </RoleGuard>
  )
}
