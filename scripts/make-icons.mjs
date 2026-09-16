// アプリアイコンを生成する。`node scripts/make-icons.mjs` で public/ に書き出す。
// 鳴門の渦をモチーフにした渦巻き。文字を使わないのは、環境によってフォントが無く
// レンダリングが崩れるのを避けるため。
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const BG = '#1b4a6b'
const FG = '#f6f4ef'

/** アルキメデス螺旋を折れ線で近似する */
const spiralPath = (cx, cy, turns, maxRadius, steps) => {
  const points = []
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * turns * Math.PI * 2
    const r = (i / steps) * maxRadius
    points.push(`${(cx + r * Math.cos(t)).toFixed(2)},${(cy + r * Math.sin(t)).toFixed(2)}`)
  }
  return `M${points.join(' L')}`
}

const svg = (size) => {
  const cx = size / 2
  const cy = size / 2
  const stroke = size * 0.085
  const path = spiralPath(cx, cy, 2.6, size * 0.36, 360)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${BG}"/>
  <path d="${path}" fill="none" stroke="${FG}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
}

await mkdir(publicDir, { recursive: true })

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(size))).png().toFile(resolve(publicDir, `icon-${size}.png`))
}
// iOSのホーム画面追加用（角丸はOS側で付くので、ここでは同じ絵でよい）
await sharp(Buffer.from(svg(180))).png().toFile(resolve(publicDir, 'apple-touch-icon.png'))
await writeFile(resolve(publicDir, 'favicon.svg'), svg(64), 'utf8')

console.log('アイコンを public/ に書き出しました')
