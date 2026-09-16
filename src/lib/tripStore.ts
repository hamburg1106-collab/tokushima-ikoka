import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { ITINERARY } from '../data/itinerary'
import { INITIAL_PACKING } from '../data/packing'
import type { Checkin, PackingItem, PersonId, TimelineItem } from '../types'
import { toDate } from './time'

/** trips/{code}/items に予定を置く。codeが合言葉そのもの */
const itemsRef = (code: string) => collection(db, 'trips', code, 'items')

/** 「済」は別コレクション。予定を編集で上書きしてもチェックインが消えないようにするため */
const checkinsRef = (code: string) => collection(db, 'trips', code, 'checkins')

/** 持ち物リスト */
const packingRef = (code: string) => collection(db, 'trips', code, 'packing')

export const sortItems = (items: TimelineItem[]): TimelineItem[] =>
  items
    .slice()
    .sort((a, b) => toDate(a.date, a.time).getTime() - toDate(b.date, b.time).getTime())

/**
 * 合言葉が正しいか確認する。
 * ルールで tripId が一致しない読み取りは permission-denied になるので、
 * 「読めたかどうか」がそのまま合言葉の検証になる。
 */
export const verifyCode = async (code: string): Promise<boolean> => {
  try {
    await getDocs(itemsRef(code))
    return true
  } catch {
    return false
  }
}

/** 予定の購読。変更があるたびcallbackが呼ばれる */
export const subscribeItems = (
  code: string,
  onChange: (items: TimelineItem[]) => void,
  onError: (error: Error) => void,
) =>
  onSnapshot(
    itemsRef(code),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as TimelineItem)
      onChange(sortItems(items))
    },
    onError,
  )

/** 初期行程を書き込む。空のときの初回セットアップ用 */
export const seedItinerary = async (code: string): Promise<void> => {
  const batch = writeBatch(db)
  for (const item of ITINERARY) {
    batch.set(doc(itemsRef(code), item.id), item)
  }
  await batch.commit()
}

/**
 * 初期状態に戻す（Q39）。
 * 現在のドキュメントを全部消してから初期行程を入れ直す。
 */
export const resetItinerary = async (code: string): Promise<void> => {
  const snapshot = await getDocs(itemsRef(code))
  const initialIds = new Set(ITINERARY.map((item) => item.id))
  await Promise.all(
    snapshot.docs
      .filter((d) => !initialIds.has(d.id))
      .map((d) => deleteDoc(doc(itemsRef(code), d.id))),
  )
  const batch = writeBatch(db)
  for (const item of ITINERARY) {
    batch.set(doc(itemsRef(code), item.id), item)
  }
  await batch.commit()
}

/** 「済」の購読。itemId をキーにしたMapで返す */
export const subscribeCheckins = (
  code: string,
  onChange: (checkins: Map<string, Checkin>) => void,
  onError: (error: Error) => void,
) =>
  onSnapshot(
    checkinsRef(code),
    (snapshot) => {
      const map = new Map<string, Checkin>()
      for (const d of snapshot.docs) {
        const checkin = d.data() as Checkin
        map.set(checkin.itemId, checkin)
      }
      onChange(map)
    },
    onError,
  )

/** 「済」を付ける／外す。既に付いていれば取り消し（誰でも取り消せる） */
export const toggleCheckin = async (
  code: string,
  itemId: string,
  me: PersonId,
  alreadyDone: boolean,
): Promise<void> => {
  const ref = doc(checkinsRef(code), itemId)
  if (alreadyDone) {
    await deleteDoc(ref)
    return
  }
  const checkin: Checkin = { itemId, by: me, at: new Date().toISOString() }
  await setDoc(ref, checkin)
}

/** 1件を丸ごと上書き（編集画面で使う。衝突は後勝ち） */
export const saveItem = async (code: string, item: TimelineItem): Promise<void> => {
  await setDoc(doc(itemsRef(code), item.id), item)
}

/** 1件削除。ついでにその予定の「済」も消す */
export const deleteItem = async (code: string, itemId: string): Promise<void> => {
  await deleteDoc(doc(itemsRef(code), itemId))
  await deleteDoc(doc(checkinsRef(code), itemId)).catch(() => {
    /* 「済」が無ければ何もしなくていい */
  })
}

/** 持ち物の購読（並び順でソート済み） */
export const subscribePacking = (
  code: string,
  onChange: (items: PackingItem[]) => void,
  onError: (error: Error) => void,
) =>
  onSnapshot(
    packingRef(code),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as PackingItem)
      onChange(items.sort((a, b) => a.order - b.order))
    },
    onError,
  )

/** 持ち物の初期リストを流し込む（空のときだけ呼ぶ） */
export const seedPacking = async (code: string): Promise<void> => {
  const batch = writeBatch(db)
  for (const item of INITIAL_PACKING) {
    batch.set(doc(packingRef(code), item.id), item)
  }
  await batch.commit()
}

/** 持ち物1件の保存（追加・チェック・担当変更すべてこれ） */
export const savePackingItem = async (code: string, item: PackingItem): Promise<void> => {
  await setDoc(doc(packingRef(code), item.id), item)
}

export const deletePackingItem = async (code: string, itemId: string): Promise<void> => {
  await deleteDoc(doc(packingRef(code), itemId))
}

/** 新規予定のID。Safariの古い版に備えてrandomUUIDが無い場合の代替を持つ */
export const newItemId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
