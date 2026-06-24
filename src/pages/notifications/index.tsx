import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useAuth } from '@/contexts/AuthContext'
import { withRouteGuard } from '@/components/RouteGuard'
import { getNotifications, markNotifRead } from '@/db/api'

const TYPE_ICONS: Record<string, string> = {
  like: 'i-mdi-heart-outline',
  save: 'i-mdi-bookmark-outline',
  comment: 'i-mdi-comment-outline',
  system: 'i-mdi-bell-outline',
}
const TYPE_LABELS: Record<string, string> = {
  like: '点赞了你',
  save: '收藏了你',
  comment: '评论了你',
  system: '系统通知',
}

function NotificationsPage() {
  const { user } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getNotifications(user.id).then(data => { setList(data); setLoading(false) })
  }, [user])

  const handleMarkAll = async () => {
    const unreadIds = list.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    const ok = await markNotifRead(unreadIds)
    if (ok) setList(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n))
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="i-mdi-arrow-left text-2xl text-foreground" onClick={() => Taro.navigateBack()} />
          <span className="text-2xl font-semibold text-foreground">消息通知</span>
        </div>
        <button className="text-xl text-primary" onClick={handleMarkAll}>全部已读</button>
      </div>
      <div className="px-4 pt-4">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground"><div className="i-mdi-loading animate-spin text-3xl" /></div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center pt-16 text-muted-foreground">
            <div className="i-mdi-bell-outline text-5xl opacity-40 mb-3" />
            <p className="text-xl">暂无消息通知</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl ${n.is_read ? 'bg-card border border-border' : 'bg-primary/5 border border-primary/20'}`}>
                <div className={`text-2xl mt-0.5 ${n.is_read ? 'text-muted-foreground' : 'text-primary'}`}>
                  <div className={TYPE_ICONS[n.type] || 'i-mdi-bell-outline'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-medium text-foreground">{n.title}</span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                  {n.body && <p className="text-xl text-muted-foreground leading-snug">{n.body}</p>}
                  <p className="text-base text-muted-foreground mt-1">{formatTime(n.created_at)} · {TYPE_LABELS[n.type] || n.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default withRouteGuard(NotificationsPage)
