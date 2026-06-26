import { useAuth } from '@/contexts/AuthContext'

export function useRole() {
  const { profile } = useAuth()
  const role = (profile as any)?.role || 'user'

  return {
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator' || role === 'admin',
    isUser: true,
  }
}
