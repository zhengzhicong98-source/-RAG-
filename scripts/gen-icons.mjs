// 从 @iconify-json/mdi 生成项目需要的图标数据
// 用法：node scripts/gen-icons.mjs
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 项目中用到的所有图标名（来自 Explore Agent 扫描）
const NEEDED = [
  'account-cash-outline','account-circle-outline','account-group-outline','account-outline',
  'account-tie-outline','alert-circle','alert-circle-outline','alert-outline','arrow-left',
  'arrow-right','arrow-right-circle-outline','badge-account-outline','bank-outline',
  'bank-transfer','bell-outline','book-open-outline','bookmark','bookmark-multiple-outline',
  'bookmark-off-outline','bookmark-outline','bookmark-remove-outline','bookshelf',
  'briefcase-remove-outline','bullhorn-outline','bus-outline','calculator-variant-outline',
  'calendar-check-outline','camera-outline','car-outline','cash-multiple','chart-bar',
  'chart-line','chat-outline','check','check-circle','check-circle-outline','check-decagram',
  'chevron-down','chevron-right','chevron-up','clipboard-check-outline','clipboard-list-outline',
  'clock-check-outline','clock-outline','close-circle','cloud-upload-outline','comment-outline',
  'compare-horizontal','content-copy','crosshairs-gps','currency-cny','database-check-outline',
  'database-cog-outline','database-off-outline','database-outline','download-outline',
  'file-document-edit-outline','file-document-outline','file-plus-outline','file-search-outline',
  'file-sign','flashlight','forum-outline','gavel','handshake','heart','heart-outline',
  'help-circle-outline','history','home-alert-outline','hospital-box-outline','image-outline',
  'image-plus-outline','import','information-outline','lightbulb-on-outline','lightbulb-outline',
  'lightning-bolt','loading','logout','magnify','map-marker','map-marker-check',
  'map-marker-off-outline','map-marker-outline','map-marker-radius','map-search',
  'map-search-outline','message-question-outline','message-reply-outline','message-text-outline',
  'microphone','microphone-outline','navigation','navigation-outline','office-building-outline',
  'package-variant','phone-outline','plus','plus-circle-outline','receipt','refresh',
  'robot-outline','routes','scale-balance','school-outline','send','shield-alert-outline',
  'shield-check','shield-check-outline','shield-lock-outline','shield-off-outline',
  'shield-sword-outline','star-outline','stethoscope','store-check-outline','sword-cross',
  'text-box-outline','thumb-down-outline','thumb-up-outline','timeline-text-outline',
  'translate','trash-can-outline','trending-up','upload-outline','walk','web','wechat',
]

const iconsJson = join(__dirname, '..', 'node_modules', '@iconify-json', 'mdi', 'icons.json')
const set = JSON.parse(readFileSync(iconsJson, 'utf-8'))

function svgDataUrl(body, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body.replace(/fill="currentColor"/g, `fill="${color}"`)}</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

const entries = []
for (const name of NEEDED) {
  const icon = set.icons[name]
  if (!icon) { console.warn(`Missing: ${name}`); continue }
  // 生成默认灰色版本（实际使用时通过 CSS filter 或组件 color prop 覆盖）
  entries.push(`  '${name}': '${svgDataUrl(icon.body, '%23666')}'`)
}

const out = [
  '// 自动生成 — node scripts/gen-icons.mjs',
  `// 共 ${entries.length} 个图标`,
  '',
  'export const ICON_URLS: Record<string, string> = {',
  entries.join(',\n'),
  '}',
  '',
].join('\n')

const outPath = join(__dirname, '..', 'src', 'components', 'icon-urls.ts')
writeFileSync(outPath, out, 'utf-8')
console.log(`Generated ${outPath} with ${entries.length} icons`)
