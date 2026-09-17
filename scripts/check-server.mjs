/**
 * サーバ（Firestore）に実際に何が入っているかを確認する調査用スクリプト。
 * 「自分の端末では見えるのに他の人は空」のとき、
 * キャッシュを見ているだけなのかサーバに本当にあるのかを切り分ける。
 *
 * 使い方: node scripts/check-server.mjs
 * 合言葉は 合言葉.txt（Git管理外）から読む。画面には出さない。
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { collection, doc, getDoc, getDocs, initializeFirestore } from 'firebase/firestore'

const raw = readFileSync(new URL('../合言葉.txt', import.meta.url), 'utf8')
const code = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => /^[\w.-]+$/.test(line))

if (!code) {
  console.error('合言葉.txt から合言葉を読み取れませんでした')
  process.exit(1)
}
console.log(`合言葉: ${code.length}文字（先頭 ${code.slice(0, 3)}…）`)

const app = initializeApp({
  apiKey: 'AIzaSyAqYfX5Iap9qrz0PL5610YIsujk78H7Aio',
  authDomain: 'tokushima-ikoka.firebaseapp.com',
  projectId: 'tokushima-ikoka',
  storageBucket: 'tokushima-ikoka.firebasestorage.app',
  messagingSenderId: '579114545804',
  appId: '1:579114545804:web:b05836f8f388603aad81a9',
})
// Nodeではストリーミングが不安定なのでロングポーリングを明示する
const db = initializeFirestore(app, { experimentalForceLongPolling: true })

for (const name of ['items', 'checkins', 'packing']) {
  try {
    const snapshot = await getDocs(collection(db, 'trips', code, name))
    console.log(`${name}: ${snapshot.size}件`)
  } catch (e) {
    console.log(`${name}: 失敗 (${e.code ?? e.message})`)
  }
}

try {
  const seeded = await getDoc(doc(db, 'trips', code, 'meta', 'seeded'))
  console.log(`meta/seeded: ${seeded.exists() ? JSON.stringify(seeded.data()) : '無し'}`)
} catch (e) {
  console.log(`meta/seeded: 失敗 (${e.code ?? e.message})`)
}

process.exit(0)
