import { ICON_URLS } from './icon-urls'

// 将 CSS 颜色名映射到实际色值
const COLOR_MAP: Record<string, string> = {
  primary: '#7c3aed',
  'primary-foreground': '#ffffff',
  'muted-foreground': '#9ca3af',
  foreground: '#e5e7eb',
  destructive: '#ef4444',
  'yellow-500': '#eab308',
}

interface Props {
  name: string          // 接受 'i-mdi-database-cog-outline' 或纯 'database-cog-outline'
  size?: string         // 如 '24rpx', '3xl'（兼容旧 Tailwind 尺寸）
  color?: string        // 如 'primary', 'muted-foreground', '#ff4d94'
  className?: string
  spin?: boolean
}

/** 将 Tailwind text-{size} 映射为 rpx 值 */
function sizeFromTw(cls: string): string {
  const m = cls.match(/text-(\w+)/)
  if (!m) return '40rpx' // 默认 ≈ text-2xl
  const map: Record<string, string> = {
    xs: '24rpx', sm: '28rpx', base: '32rpx', lg: '36rpx',
    xl: '40rpx', '2xl': '44rpx', '3xl': '52rpx', '4xl': '60rpx',
    '5xl': '80rpx', '6xl': '100rpx',
  }
  return map[m[1]] || '40rpx'
}

export default function MdIcon({ name, size, color = 'muted-foreground', className = '', spin }: Props) {
  // 提取纯图标名（去掉 i-mdi- 前缀）
  const key = name.startsWith('i-mdi-') ? name.slice(7) : name
  const isLucide = name.startsWith('i-lucide-')

  // Lucide 图标暂时没数据，跳过
  if (isLucide) {
    return <div className={className} style={{ width: size || '40rpx', height: size || '40rpx' }} />
  }

  const url = ICON_URLS[key]
  if (!url) {
    // 图标不存在，渲染一个占位色块
    return (
      <div
        className={className}
        style={{
          width: size || sizeFromTw(className),
          height: size || sizeFromTw(className),
          borderRadius: '4rpx',
          backgroundColor: '#333',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    )
  }

  // 用 color prop 替换 SVG 中的 fill 颜色
  const hex = COLOR_MAP[color] || color
  const styledUrl = url.replace(/fill='%23[0-9A-Fa-f]{3,6}'/, `fill='${encodeURIComponent(hex)}'`)

  const finalSize = size || sizeFromTw(className)
  const spinStyle = spin ? { animation: 'spin 1s linear infinite' } : {}

  return (
    <div
      className={className}
      style={{
        width: finalSize,
        height: finalSize,
        backgroundImage: `url("${styledUrl}")`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        display: 'inline-block',
        flexShrink: 0,
        ...spinStyle,
      }}
    />
  )
}
