import { useRole } from '@/hooks/useRole'
import Taro from '@tarojs/taro'

interface RoleGuardProps {
  requiredRole: 'admin' | 'moderator'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ requiredRole, children, fallback }: RoleGuardProps) {
  const { isAdmin, isModerator } = useRole()

  const hasAccess = requiredRole === 'admin' ? isAdmin : isModerator

  if (!hasAccess) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="i-mdi-shield-off-outline text-6xl text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">无权限访问此页面</p>
      </div>
    )
  }

  return <>{children}</>
}
