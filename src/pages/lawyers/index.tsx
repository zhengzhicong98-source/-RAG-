import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getLawyers } from '@/db/api'

const SPECIALTY_OPTIONS = ['全部', '劳动纠纷', '租房纠纷', '消费维权', '合同纠纷', '婚姻家庭', '刑事辩护']

export default function LawyersPage() {
  const [lawyers, setLawyers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [specialty, setSpecialty] = useState('全部')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getLawyers(specialty === '全部' ? undefined : { specialty }).then(d => { setLawyers(d); setLoading(false) })
  }, [specialty])

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="i-mdi-arrow-left text-2xl text-foreground" onClick={() => Taro.navigateBack()} />
          <span className="text-2xl font-semibold text-foreground">律师在线咨询</span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {SPECIALTY_OPTIONS.map(s => (
            <div key={s} className={`px-3 py-1.5 rounded-full text-base whitespace-nowrap transition-all flex-shrink-0 ${specialty === s ? 'bg-primary text-primary-foreground font-medium' : 'bg-secondary text-foreground'}`}
              onClick={() => setSpecialty(s)}>{s}</div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <div className="i-mdi-information-outline text-xl text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xl text-amber-700 leading-relaxed">律师信息仅供参考，建议通过正规渠道核实律师执业资格后再进行咨询。</p>
        </div>

        {loading ? (
          <div className="text-center py-16"><div className="i-mdi-loading animate-spin text-3xl text-muted-foreground" /></div>
        ) : lawyers.length === 0 ? (
          <div className="flex flex-col items-center pt-16 text-muted-foreground">
            <div className="i-mdi-account-tie-outline text-5xl opacity-40 mb-3" />
            <p className="text-xl">暂无相关律师信息</p>
            <p className="text-xl mt-1">律师数据正在持续收录中…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lawyers.map(l => (
              <div key={l.id} className="bg-card rounded-xl border border-border overflow-hidden"
                onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">{l.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xl font-semibold text-foreground">{l.name}</p>
                      {l.is_verified && <div className="i-mdi-check-decagram text-lg text-primary" />}
                    </div>
                    <p className="text-xl text-muted-foreground">{l.title}{l.firm ? ` · ${l.firm}` : ''}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(l.specialties || []).slice(0, 3).map((s: string) => (
                        <span key={s} className="px-2 py-0.5 bg-secondary rounded text-base text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className={`i-mdi-chevron-down text-xl text-muted-foreground transition-transform flex-shrink-0 mt-1 ${expandedId === l.id ? 'rotate-180' : ''}`} />
                </div>
                {expandedId === l.id && (
                  <div className="px-4 pb-4 border-t border-border">
                    <p className="text-xl text-foreground leading-relaxed mt-3">{l.description || '暂无简介'}</p>
                    <div className="flex items-center gap-4 mt-3">
                      {l.city && <span className="text-xl text-muted-foreground"><span className="i-mdi-map-marker-outline" /> {l.city}</span>}
                      {l.phone && (
                        <button className="text-xl text-primary" onClick={e => { e.stopPropagation(); Taro.makePhoneCall({ phoneNumber: l.phone }) }}>
                          <span className="i-mdi-phone-outline mr-1" />联系律师
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
