import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

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

// オフライン永続化は⑥で入れる（ここを initializeFirestore に差し替える）
export const db = getFirestore(app)
