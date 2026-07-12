import { callEdgeFunction } from '@/utils/callEdgeFunction'
import { supabase } from '@/client/supabase'

interface QualityScores {
  relevance: number
  accuracy: number
  completeness: number
  helpfulness: number
  overall: number
}

/**
 * 异步评估 AI 回答质量（不阻塞主流程）
 * 调用 legal-chat Edge Function 的 evaluate 模式
 */
export async function evaluateAnswerQuality(
  question: string,
  answer: string,
  consultHistoryId: string,
  userId: string
): Promise<void> {
  try {
    const { data, error } = await callEdgeFunction<{
      scores?: QualityScores | null
      raw?: string
    }>('legal-chat', {
      body: {
        messages: [{ role: 'user', content: question }],
        mode: 'evaluate',
        answer_to_evaluate: answer,
      },
    })

    if (error || !data?.scores) return

    await supabase.from('quality_scores').insert({
      consult_history_id: consultHistoryId,
      user_id: userId,
      relevance: data.scores.relevance,
      accuracy: data.scores.accuracy,
      completeness: data.scores.completeness,
      helpfulness: data.scores.helpfulness,
      overall: data.scores.overall,
      raw_response: data.raw || null,
    })
  } catch {
    // 静默失败，不影响主流程
  }
}
