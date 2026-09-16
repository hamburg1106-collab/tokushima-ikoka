import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore'

// ウェブ用のconfigは公開前提の識別子（秘密鍵ではない）。
// 実際の保護はFirestoreのセキュリティルール（合言葉＝パスの一致）で行う。
const firebaseConfig = {
  apiKey: 'AIzaSyAqYfX5Iap9qrz0PL5610YIsujk78H7Aio',
  authDomain: 'tokushima-ikoka.firebaseapp.com',
  projectId: 'tokushima-ikoka',
  storageBucket: 'tokushima-ikoka.firebasestorage.app',
  messagingSenderId: '579114545804',
  appId: '1:579114545804:web:b05836f8f388603aad81a9',
}

const app = initializeApp(firebaseConfig)

// persistentLocalCache: 取得済みのデータをIndexedDBに持つ。
//   → 機内モードや圏外でも旅程が読める。書き込みは復帰時にまとめて送られる（Q12=a）。
// tabManager: 複数タブ同期（persistentMultipleTabManager）はiOS Safariでロックの取得に
//   失敗することがあり、そうなるとFirestore全体が failed-precondition で動かなくなる。
//   スマホでタブを2枚開く運用は無いので、単一タブ版にして安定を取る。
// ignoreUndefinedProperties: 値がundefinedのキーを黙って捨てる（無いと保存時に例外になる）
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
  ignoreUndefinedProperties: true,
})
