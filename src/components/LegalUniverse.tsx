import { useState, useMemo, useCallback } from 'react'
import Taro from '@tarojs/taro'
import type { ConsultHistory } from '@/db/types'

// ==================== 类型定义 ====================

interface StarData {
  id: string
  question: string
  date: string
  category: string
  color: string
  x: number
  y: number
  radius: number
  animationDelay: string
}

interface CategoryGroup {
  category: string
  color: string
  stars: StarData[]
  labelX: number
  labelY: number
}

interface Props {
  history: ConsultHistory[]
  onDelete?: (id: string) => void
}

// ==================== 常量 ====================

const CATEGORY_ORDER = ['劳动法', '租房', '消费者权益', '合同法', '通用'] as const

const CATEGORY_ICONS: Record<string, string> = {
  '劳动法': '⚖️',
  '租房': '🏠',
  '消费者权益': '🛡️',
  '合同法': '📜',
  '通用': '⭐',
}

const SVG_W = 390
const SVG_H = 300
const MARGIN = 30
const ZONE_TOP = 50
const ZONE_BOTTOM = 270

const BACKGROUND_STARS: { x: number; y: number; r: number; opacity: number }[] = [
  { x: 12, y: 45, r: 1, opacity: 0.4 },   { x: 55, y: 18, r: 1.5, opacity: 0.3 },
  { x: 100, y: 72, r: 1, opacity: 0.5 },   { x: 150, y: 15, r: 1.2, opacity: 0.35 },
  { x: 200, y: 55, r: 1, opacity: 0.45 },  { x: 245, y: 22, r: 1.3, opacity: 0.3 },
  { x: 310, y: 60, r: 1, opacity: 0.5 },   { x: 350, y: 18, r: 1.1, opacity: 0.4 },
  { x: 375, y: 48, r: 1, opacity: 0.35 },  { x: 30, y: 130, r: 1.2, opacity: 0.3 },
  { x: 75, y: 180, r: 1, opacity: 0.5 },   { x: 125, y: 230, r: 1, opacity: 0.4 },
  { x: 175, y: 165, r: 1.3, opacity: 0.3 }, { x: 220, y: 210, r: 1, opacity: 0.45 },
  { x: 280, y: 140, r: 1.1, opacity: 0.35 },{ x: 330, y: 195, r: 1, opacity: 0.4 },
  { x: 370, y: 135, r: 1.2, opacity: 0.3 }, { x: 45, y: 260, r: 1, opacity: 0.5 },
  { x: 105, y: 140, r: 1, opacity: 0.3 },   { x: 160, y: 275, r: 1.1, opacity: 0.4 },
  { x: 255, y: 265, r: 1, opacity: 0.35 },  { x: 295, y: 250, r: 1.3, opacity: 0.45 },
  { x: 340, y: 275, r: 1, opacity: 0.3 },   { x: 195, y: 108, r: 1, opacity: 0.4 },
  { x: 380, y: 240, r: 1.1, opacity: 0.5 },
]

// ==================== 工具函数 ====================

function inferCategory(question: string): { category: string; color: string } {
  const q = question || ''
  if (/工资|劳动|辞退|试用期|五险一金|加班|解雇|赔偿|劳动合同|被开除|被裁|裁员/.test(q))
    return { category: '劳动法', color: '#00d9ff' }       // 亮青蓝
  if (/租房|押金|房东|房租|合租|退房/.test(q))
    return { category: '租房', color: '#4ade80' }         // 翠绿
  if (/退款|退货|消费|购买|商品|质量|网购/.test(q))
    return { category: '消费者权益', color: '#ff9500' }   // 鲜橙
  if (/合同|协议|违约|条款/.test(q))
    return { category: '合同法', color: '#c084fc' }       // 亮紫
  return { category: '通用', color: '#ff4d94' }           // 玫红
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '未知日期'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function hexToRgba(hex: string, alpha: number): string {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ==================== Tooltip / Stats / Share ====================

function TooltipOverlay({ star, onClose, onReask, onDelete }: { star: StarData; onClose: () => void; onReask?: () => void; onDelete?: () => void }) {
  const TOOLTIP_W = 190; const TOOLTIP_H = 90
  let left = star.x - TOOLTIP_W / 2
  let top = star.y - TOOLTIP_H - 16
  if (left < 4) left = 4
  if (left + TOOLTIP_W > SVG_W - 4) left = SVG_W - 4 - TOOLTIP_W
  if (top < 4) top = star.y + star.radius + 8

  const leftPct = `${(left / SVG_W) * 100}%`
  const topPct = `${(top / SVG_H) * 100}%`

  return (
    <div
      style={{
        position: 'absolute', left: leftPct, top: topPct, width: `${TOOLTIP_W}px`,
        background: 'rgba(20,25,45,0.96)', border: `1px solid ${star.color}50`,
        borderRadius: '10px', boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 12px ${star.color}30`,
        zIndex: 20, padding: '10px 12px',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: star.color, fontSize: '11px', fontWeight: 600, background: `${star.color}20`, padding: '2px 8px', borderRadius: '4px' }}>
          {star.category}
        </span>
        <span style={{ color: '#666', fontSize: '10px' }}>{star.date}</span>
      </div>
      {/* 问题 */}
      <p style={{ color: '#ddd', fontSize: '13px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: '0 0 8px 0' }}>
        {star.question.length > 40 ? star.question.slice(0, 40) + '...' : star.question}
      </p>
      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div
          style={{
            flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: '6px',
            background: `${star.color}30`, color: star.color, fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onClick={(e) => { e.stopPropagation(); onReask?.() }}
        >
          🔁 继续咨询
        </div>
        <div
          style={{
            flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: '6px',
            background: 'rgba(255,255,255,0.08)', color: '#999', fontSize: '12px',
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onClick={(e) => { e.stopPropagation(); onDelete?.() }}
        >
          🗑 删除
        </div>
      </div>
      {/* 关闭 */}
      <div
        style={{ position: 'absolute', top: '6px', right: '10px', color: '#555', fontSize: '14px', cursor: 'pointer', lineHeight: '14px' }}
        onClick={(e) => { e.stopPropagation(); onClose() }}
      >
        ×
      </div>
    </div>
  )
}

function StatsBar({ groups, hiddenCategories, onToggleCategory, groupStarCounts }: { groups: CategoryGroup[]; hiddenCategories: Set<string>; onToggleCategory: (cat: string) => void; groupStarCounts: Map<string, number> }) {
  const totalStars = groups.reduce((sum, g) => sum + g.stars.length, 0)
  const visibleStars = groups.reduce((sum, g) => sum + g.stars.filter(s => !hiddenCategories.has(s.category)).length, 0)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px', padding: '0 4px' }}>
      <span style={{ fontSize: '13px', color: 'var(--tw-foreground, #e0e0e0)', fontWeight: 500 }}>
        宇宙中共有 <span style={{ color: '#f48fb1', fontWeight: 700 }}>{totalStars}</span> 颗星
      </span>
      {hiddenCategories.size > 0 && (
        <>
          <span style={{ fontSize: '10px', color: '#555' }}>·</span>
          <span style={{ fontSize: '13px', color: 'var(--tw-foreground, #e0e0e0)', fontWeight: 500 }}>
            可见 <span style={{ color: '#81c784', fontWeight: 700 }}>{visibleStars}</span> 颗
          </span>
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
        {groups.map(g => {
          const hidden = hiddenCategories.has(g.category)
          const count = groupStarCounts.get(g.category) || 0
          return (
            <div
              key={g.category}
              style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', opacity: hidden ? 0.35 : 1, transition: 'opacity 0.2s' }}
              onClick={() => onToggleCategory(g.category)}
            >
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: g.color }} />
              <span style={{ fontSize: '11px', color: hidden ? '#555' : '#888' }}>{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ShareButton() {
  const handleShare = useCallback(() => {
    Taro.showToast({ title: '请点击右上角 ··· 分享', icon: 'none', duration: 2000 })
  }, [])

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', marginTop: '10px', cursor: 'pointer' }}
      onClick={handleShare}
    >
      <span style={{ fontSize: '14px', color: '#aaa' }}>🔗</span>
      <span style={{ fontSize: '13px', color: '#aaa' }}>分享我的维权宇宙</span>
    </div>
  )
}

// ==================== EmptyState ====================

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 10px' }}>
      <div style={{ width: '100%', height: '200px', position: 'relative' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={`es-${i}`} style={{ position: 'absolute', left: `${60 + i * 60 - 1}px`, top: `${30 + (i % 3) * 25 - 1}px`, width: '2px', height: '2px', borderRadius: '50%', background: 'white', opacity: 0.3 + i * 0.05 }} />
        ))}
        <div style={{ position: 'absolute', left: 'calc(50% - 14px)', top: '76px', width: '28px', height: '28px', borderRadius: '50%', background: '#f48fb1', opacity: 0.1 }} />
        <div style={{ position: 'absolute', left: 'calc(50% - 8px)', top: '82px', width: '16px', height: '16px', borderRadius: '50%', background: '#f48fb1', boxShadow: '0 0 16px #f48fb1' }} />
      </div>
      <p style={{ fontSize: '16px', fontWeight: 600, color: '#e0e0e0', marginTop: '4px', marginBottom: 0 }}>你的维权宇宙还是一片虚空</p>
      <p style={{ fontSize: '13px', color: '#999', marginTop: '4px', marginBottom: 0 }}>开始第一次法律咨询，点亮你的第一颗星 ✨</p>
      <div style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '12px', color: '#fff', fontWeight: 500, fontSize: '14px', backgroundColor: 'hsl(220 80% 50%)' }} onClick={() => Taro.switchTab({ url: '/pages/consult/index' })}>去咨询</div>
    </div>
  )
}

// ==================== 主组件 ====================

export default function LegalUniverse({ history, onDelete }: Props) {
  const [activeStar, setActiveStar] = useState<StarData | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

  const handleToggleCategory = useCallback((cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const handleReask = useCallback((star: StarData) => {
    const record = history.find(h => h.id === star.id)
    if (record) {
      Taro.setStorageSync('continue_consult', JSON.stringify({
        id: record.id,
        question: record.question,
        answer: record.answer,
        ragUsed: record.rag_used,
        timestamp: new Date(record.created_at).getTime(),
      }))
    }
    Taro.switchTab({ url: '/pages/consult/index' })
    setActiveStar(null)
  }, [history])

  const handleDeleteStar = useCallback((star: StarData) => {
    Taro.showModal({
      title: '删除星星',
      content: '确定删除这条咨询记录吗？',
      confirmText: '删除',
      confirmColor: '#ff4d94',
      success: (res) => {
        if (res.confirm) {
          onDelete?.(star.id)
          setActiveStar(null)
        }
      },
    })
  }, [onDelete])

  const positionSeed = useMemo(() => history.map(h => h.id).sort().join('|'), [history])

  const { starDatas, groups } = useMemo(() => {
    const catMap = new Map<string, { color: string; items: ConsultHistory[] }>()
    for (const item of history) {
      const { category, color } = inferCategory(item.question)
      if (!catMap.has(category)) catMap.set(category, { color, items: [] })
      catMap.get(category)!.items.push(item)
    }

    const sortedCategories = CATEGORY_ORDER.filter(c => catMap.has(c))
    const activeGroups: CategoryGroup[] = []
    const allStars: StarData[] = []

    const innerWidth = SVG_W - MARGIN * 2
    const zoneWidth = innerWidth / Math.max(sortedCategories.length, 1)

    for (let gi = 0; gi < sortedCategories.length; gi++) {
      const cat = sortedCategories[gi]
      const { color, items } = catMap.get(cat)!
      const zoneLeft = MARGIN + gi * zoneWidth + 12
      const zoneRight = MARGIN + (gi + 1) * zoneWidth - 12
      const zoneCenter = MARGIN + gi * zoneWidth + zoneWidth / 2
      const radius = items.length >= 4 ? 12 : items.length >= 2 ? 9 : 6

      const groupStars: StarData[] = []
      const placedCoords: { x: number; y: number }[] = []

      for (let si = 0; si < items.length; si++) {
        const item = items[si]
        let x: number; let y: number; let attempts = 0
        do {
          x = zoneLeft + Math.random() * (zoneRight - zoneLeft)
          y = ZONE_TOP + Math.random() * (ZONE_BOTTOM - ZONE_TOP)
          attempts++
        } while (attempts < 100 && placedCoords.some(p => Math.hypot(p.x - x, p.y - y) < 22))

        if (attempts >= 100 && placedCoords.length > 0) {
          const last = placedCoords[placedCoords.length - 1]
          x = last.x + 24; y = last.y + (si % 2 === 0 ? 24 : -24)
          if (x > zoneRight) x = zoneRight - 4
          if (y > ZONE_BOTTOM) y = ZONE_BOTTOM - 4
          if (y < ZONE_TOP) y = ZONE_TOP + 4
        }
        placedCoords.push({ x, y })

        const star: StarData = {
          id: item.id, question: item.question || '', date: formatDate(item.created_at),
          category: cat, color,
          x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, radius,
          animationDelay: `${((si * 0.3 + gi * 0.15) % 2).toFixed(1)}s`,
        }
        groupStars.push(star); allStars.push(star)
      }

      activeGroups.push({ category: cat, color, stars: groupStars, labelX: Math.round(zoneCenter), labelY: 26 })
    }
    return { starDatas: allStars, groups: activeGroups }
  }, [positionSeed]) // eslint-disable-line react-hooks/exhaustive-deps

  // 派生数据（必须在 starDatas 定义之后）
  const groupStarCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of starDatas) map.set(s.category, (map.get(s.category) || 0) + 1)
    return map
  }, [starDatas])

  if (history.length === 0) return <EmptyState />

  // 将虚拟坐标 (SVG_W x SVG_H) 换算成容器内的百分比偏移量
  const toPct = (v: number, total: number) => `${(v / total) * 100}%`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>🌌</span>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#e0e0e0' }}>我的维权宇宙</span>
      </div>
      <p style={{ fontSize: '12px', color: '#7986cb', marginTop: 0, marginBottom: '4px' }}>每一次维权都是宇宙中一颗星 · 点击标签筛选星座</p>

      {/* 星空区域 — 纯 CSS + View，无 SVG / Canvas */}
      <div
        style={{
          width: '100%', height: `${SVG_H}px`, position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(ellipse at 30% 20%, #2a3060 0%, #1a1f3a 45%, #0a0e1a 100%)',
          borderRadius: '16rpx',
          boxShadow: 'inset 0 0 40rpx rgba(80,100,200,0.15), 0 4rpx 20rpx rgba(0,0,0,0.4)',
        }}
      >
        {/* 星云 1 — 蓝紫色，左上 */}
        <div
          style={{
            position: 'absolute', left: '25%', top: '30%',
            width: '360rpx', height: '360rpx', borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(100,120,220,0.28) 0%, rgba(80,90,180,0.10) 40%, transparent 70%)',
            filter: 'blur(20rpx)',
            animation: 'nebula-drift 40s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        {/* 星云 2 — 粉红色，右下 */}
        <div
          style={{
            position: 'absolute', left: '75%', top: '70%',
            width: '280rpx', height: '280rpx', borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(244,143,177,0.22) 0%, rgba(206,147,216,0.10) 40%, transparent 70%)',
            filter: 'blur(20rpx)',
            animation: 'nebula-drift 55s ease-in-out infinite reverse',
            pointerEvents: 'none',
          }}
        />

        {/* 流星 × 3 — 交错时间 */}
        {[
          { top: '10%', left: '90%', duration: 5, delay: 0, color: '#a0c4ff' },
          { top: '18%', left: '85%', duration: 7, delay: 3.5, color: '#ffd6a5' },
          { top: '5%',  left: '95%', duration: 6, delay: 6.5, color: '#ffffff' },
        ].map((s, i) => (
          <div
            key={`shoot-${i}`}
            style={{
              position: 'absolute', top: s.top, left: s.left,
              width: '80rpx', height: '2rpx',
              background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`,
              boxShadow: `0 0 6rpx ${s.color}`,
              animation: `shooting-star ${s.duration}s linear ${s.delay}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* 背景装饰星 — 加浮动动画 */}
        {BACKGROUND_STARS.map((s, i) => (
          <div
            key={`bg-${i}`}
            style={{
              position: 'absolute', left: toPct(s.x, SVG_W), top: toPct(s.y, SVG_H),
              width: `${s.r * 6}rpx`, height: `${s.r * 6}rpx`, borderRadius: '50%',
              backgroundColor: 'white',
              boxShadow: `0 0 ${s.r * 4}rpx rgba(255,255,255,0.8)`,
              transform: 'translate(-50%, -50%)',
              animation: `bg-drift ${3 + (i % 5)}s ease-in-out ${(i * 0.3) % 4}s infinite`,
            }}
          />
        ))}

        {/* 星座连线 — 加呼吸动画 */}
        {groups.map(g =>
          g.stars.slice(0, -1).map((star, i) => {
            const next = g.stars[i + 1]
            const dx = next.x - star.x; const dy = next.y - star.y
            const dist = Math.hypot(dx, dy)
            if (dist < 1) return null
            const angle = Math.atan2(dy, dx) * (180 / Math.PI)
            const midX = (star.x + next.x) / 2; const midY = (star.y + next.y) / 2
            return (
              <div
                key={`line-${star.id}`}
                style={{
                  position: 'absolute', left: toPct(midX, SVG_W), top: toPct(midY, SVG_H),
                  width: `${dist * 2}rpx`, height: '2rpx',
                  backgroundColor: g.color,
                  boxShadow: `0 0 4rpx ${g.color}`,
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  transformOrigin: 'center center',
                  animation: `line-breath ${3 + (i % 3)}s ease-in-out infinite`,
                }}
              />
            )
          })
        )}

        {/* 星星（光晕 + 主星）— 筛选项半透明 */}
        {starDatas.map(star => {
          const hidden = hiddenCategories.has(star.category)
          const sizeRpx = Math.round(star.radius * 2.7)
          const glowRpx = Math.round((star.radius + 4) * 2.7)
          const coreRpx = Math.max(6, Math.round(star.radius * 1.3))
          return (
            <div
              key={star.id}
              style={{
                position: 'absolute', left: toPct(star.x, SVG_W), top: toPct(star.y, SVG_H),
                width: `${glowRpx}rpx`, height: `${glowRpx}rpx`,
                transform: 'translate(-50%, -50%)',
                zIndex: hidden ? 1 : 5,
                opacity: hidden ? 0.12 : 1,
                transition: 'opacity 0.35s ease',
                pointerEvents: hidden ? 'none' : 'auto',
              }}
              onClick={(e) => {
                if (hidden) return
                e.stopPropagation()
                setActiveStar(activeStar?.id === star.id ? null : star)
              }}
            >
              {/* 外层光晕 */}
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: `${glowRpx}rpx`, height: `${glowRpx}rpx`, borderRadius: '50%',
                  backgroundColor: star.color, opacity: 0.25,
                  animation: hidden ? 'none' : `pulse-glow ${3 + parseFloat(star.animationDelay)}s ease-in-out ${star.animationDelay} infinite`,
                }}
              />
              {/* 主星 */}
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: `${sizeRpx}rpx`, height: `${sizeRpx}rpx`, borderRadius: '50%',
                  backgroundColor: star.color,
                  boxShadow: hidden ? 'none' : `0 0 ${sizeRpx}rpx ${star.color}, 0 0 ${sizeRpx / 2}rpx ${star.color}`,
                  transform: 'translate(-50%, -50%)',
                  animation: hidden ? 'none' : `twinkle ${2 + parseFloat(star.animationDelay)}s ease-in-out ${star.animationDelay} infinite`,
                }}
              />
              {/* 白色核心 */}
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: `${coreRpx}rpx`, height: `${coreRpx}rpx`, borderRadius: '50%',
                  backgroundColor: '#ffffff', opacity: hidden ? 0.2 : 0.85,
                  boxShadow: hidden ? 'none' : `0 0 ${coreRpx}rpx #ffffff`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              />
              {/* 十字光芒 */}
              {star.radius >= 9 && !hidden && (
                <>
                  <div
                    style={{
                      position: 'absolute', left: '50%', top: '50%',
                      width: `${glowRpx + 16}rpx`, height: '2rpx',
                      backgroundColor: star.color, opacity: 0.55,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: `0 0 6rpx ${star.color}`,
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute', left: '50%', top: '50%',
                      width: '2rpx', height: `${glowRpx + 16}rpx`,
                      backgroundColor: star.color, opacity: 0.55,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: `0 0 6rpx ${star.color}`,
                      pointerEvents: 'none',
                    }}
                  />
                </>
              )}
            </div>
          )
        })}

        {/* 分类标签 — 可点击筛选 */}
        {groups.map(g => {
          const hidden = hiddenCategories.has(g.category)
          return (
            <div
              key={`label-${g.category}`}
              style={{
                position: 'absolute', left: toPct(g.labelX, SVG_W), top: toPct(g.labelY, SVG_H),
                transform: 'translate(-50%, -50%)',
                color: hidden ? '#444' : g.color,
                fontSize: '20rpx', fontWeight: 500, opacity: hidden ? 0.4 : 0.9,
                textShadow: hidden ? 'none' : `0 0 8rpx ${g.color}`,
                zIndex: 6, cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: '4rpx 10rpx',
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleToggleCategory(g.category)
              }}
            >
              {CATEGORY_ICONS[g.category] || '⭐'} {g.category}
            </div>
          )
        })}

        {/* Tooltip */}
        {activeStar && (
          <TooltipOverlay
            star={activeStar}
            onClose={() => setActiveStar(null)}
            onReask={() => handleReask(activeStar)}
            onDelete={() => handleDeleteStar(activeStar)}
          />
        )}
      </div>

      <StatsBar groups={groups} hiddenCategories={hiddenCategories} onToggleCategory={handleToggleCategory} groupStarCounts={groupStarCounts} />
      <ShareButton />
    </div>
  )
}
