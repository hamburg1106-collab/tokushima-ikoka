import { ITINERARY } from '../data/itinerary'
import { INITIAL_PACKING } from '../data/packing'
import type { Checkin, PackingItem, PersonId, TimelineItem } from '../types'
import { toDate } from './time'

/**
 * Firestore SDKは重い（gzipで約150KB）ので、静的importせず動的importで後から読む。
 * こうすると初期表示に必要なチャンクからFirestoreが外れる。
 * 読み込み結果はキャッシュするので、SDKが読まれるのは1回だけ。
 */
type FirestoreBundle = {
  db: import('firebase/firestore').Firestore
  fs: typeof import('firebase/firestore')
}

let bundlePromise: Promise<FirestoreBundle> | null = null

const getFs = (): Promise<FirestoreBundle> => {
  bundlePromise ??= (async () => {
    const [{ db }, fs] = await Promise.all([import('./firebase'), import('firebase/firestore')])
    return { db, fs }
  })()
  return bundlePromise
}

/** trips/{code}/items に予定を置く。codeが合言葉そのもの */
const itemsRef = ({ db, fs }: FirestoreBundle, code: string) =>
  fs.collection(db, 'trips', code, 'items')

/** 「済」は別コレクション。予定を編集で上書きしてもチェックインが消えないようにするため */
const checkinsRef = ({ db, fs }: FirestoreBundle, code: string) =>
  fs.collection(db, 'trips', code, 'checkins')

/** 持ち物リスト */
const packingRef = ({ db, fs }: FirestoreBundle, code: string) =>
  fs.collection(db, 'trips', code, 'packing')

/**
 * 購読の共通処理。
 * SDKの読み込みが終わる前に画面を閉じられても大丈夫なように、
 * 解除フラグを見てからonSnapshotを張る。
 */
const subscribe = (
  start: (bundle: FirestoreBundle) => () => void,
  onError: (error: Error) => void,
): (() => void) => {
  let unsubscribe: (() => void) | null = null
  let cancelled = false

  void getFs()
    .then((bundle) => {
      if (cancelled) return
      unsubscribe = start(bundle)
    })
    .catch((e: unknown) => onError(e instanceof Error ? e : new Error(String(e))))

  return () => {
    cancelled = true
    unsubscribe?.()
  }
}

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
    const bundle = await getFs()
    await bundle.fs.getDocs(itemsRef(bundle, code))
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
  subscribe(
    (bundle) =>
      bundle.fs.onSnapshot(
        itemsRef(bundle, code),
        (snapshot) => onChange(sortItems(snapshot.docs.map((d) => d.data() as TimelineItem))),
        onError,
      ),
    onError,
  )

/** 初期行程を書き込む。空のときの初回セットアップ用 */
export const seedItinerary = async (code: string): Promise<void> => {
  const bundle = await getFs()
  const batch = bundle.fs.writeBatch(bundle.db)
  for (const item of ITINERARY) {
    batch.set(bundle.fs.doc(itemsRef(bundle, code), item.id), item)
  }
  await batch.commit()
}

/**
 * 初期状態に戻す（Q39）。
 * 初期行程に無いドキュメントを消してから、初期行程を入れ直す。
 */
export const resetItinerary = async (code: string): Promise<void> => {
  const bundle = await getFs()
  const { fs, db } = bundle
  const snapshot = await fs.getDocs(itemsRef(bundle, code))
  const initialIds = new Set(ITINERARY.map((item) => item.id))
  await Promise.all(
    snapshot.docs
      .filter((d) => !initialIds.has(d.id))
      .map((d) => fs.deleteDoc(fs.doc(itemsRef(bundle, code), d.id))),
  )
  const batch = fs.writeBatch(db)
  for (const item of ITINERARY) {
    batch.set(fs.doc(itemsRef(bundle, code), item.id), item)
  }
  await batch.commit()
}

/** 「済」の購読。itemId をキーにしたMapで返す */
export const subscribeCheckins = (
  code: string,
  onChange: (checkins: Map<string, Checkin>) => void,
  onError: (error: Error) => void,
) =>
  subscribe(
    (bundle) =>
      bundle.fs.onSnapshot(
        checkinsRef(bundle, code),
        (snapshot) => {
          const map = new Map<string, Checkin>()
          for (const d of snapshot.docs) {
            const checkin = d.data() as Checkin
            map.set(checkin.itemId, checkin)
          }
          onChange(map)
        },
        onError,
      ),
    onError,
  )

/** 「済」を付ける／外す。既に付いていれば取り消し（誰でも取り消せる） */
export const toggleCheckin = async (
  code: string,
  itemId: string,
  me: PersonId,
  alreadyDone: boolean,
): Promise<void> => {
  const bundle = await getFs()
  const ref = bundle.fs.doc(checkinsRef(bundle, code), itemId)
  if (alreadyDone) {
    await bundle.fs.deleteDoc(ref)
    return
  }
  const checkin: Checkin = { itemId, by: me, at: new Date().toISOString() }
  await bundle.fs.setDoc(ref, checkin)
}

/** 1件を丸ごと上書き（編集画面で使う。衝突は後勝ち） */
export const saveItem = async (code: string, item: TimelineItem): Promise<void> => {
  const bundle = await getFs()
  await bundle.fs.setDoc(bundle.fs.doc(itemsRef(bundle, code), item.id), item)
}

/** 1件削除。ついでにその予定の「済」も消す */
export const deleteItem = async (code: string, itemId: string): Promise<void> => {
  const bundle = await getFs()
  await bundle.fs.deleteDoc(bundle.fs.doc(itemsRef(bundle, code), itemId))
  await bundle.fs.deleteDoc(bundle.fs.doc(checkinsRef(bundle, code), itemId)).catch(() => {
    /* 「済」が無ければ何もしなくていい */
  })
}

/** 持ち物の購読（並び順でソート済み） */
export const subscribePacking = (
  code: string,
  onChange: (items: PackingItem[]) => void,
  onError: (error: Error) => void,
) =>
  subscribe(
    (bundle) =>
      bundle.fs.onSnapshot(
        packingRef(bundle, code),
        (snapshot) => {
          const items = snapshot.docs.map((d) => d.data() as PackingItem)
          onChange(items.sort((a, b) => a.order - b.order))
        },
        onError,
      ),
    onError,
  )

/** 持ち物の初期リストを流し込む（空のときだけ呼ぶ） */
export const seedPacking = async (code: string): Promise<void> => {
  const bundle = await getFs()
  const batch = bundle.fs.writeBatch(bundle.db)
  for (const item of INITIAL_PACKING) {
    batch.set(bundle.fs.doc(packingRef(bundle, code), item.id), item)
  }
  await batch.commit()
}

/** 持ち物1件の保存（追加・チェック・担当変更すべてこれ） */
export const savePackingItem = async (code: string, item: PackingItem): Promise<void> => {
  const bundle = await getFs()
  await bundle.fs.setDoc(bundle.fs.doc(packingRef(bundle, code), item.id), item)
}

export const deletePackingItem = async (code: string, itemId: string): Promise<void> => {
  const bundle = await getFs()
  await bundle.fs.deleteDoc(bundle.fs.doc(packingRef(bundle, code), itemId))
}

/** 新規予定のID。Safariの古い版に備えてrandomUUIDが無い場合の代替を持つ */
export const newItemId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
