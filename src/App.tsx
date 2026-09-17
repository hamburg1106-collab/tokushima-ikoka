import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import Gate from './components/Gate'
import TripView from './components/TripView'
import { STORAGE_KEYS } from './config'
import { readStorage, removeStorage, writeStorage } from './lib/storage'
import {
  decideShop,
  deleteItem,
  deletePackingItem,
  deleteShop,
  resetItinerary,
  saveItem,
  savePackingItem,
  saveShop,
  seedItinerary,
  seedPacking,
  seedShops,
  subscribeCheckins,
  subscribeItems,
  subscribePacking,
  subscribeShops,
  toggleCheckin,
} from './lib/tripStore'
import type { Checkin, PackingItem, PersonId, ShopCandidate, TimelineItem } from './types'

type Theme = 'light' | 'dark'

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () => (readStorage(STORAGE_KEYS.theme) as Theme | null) ?? 'light',
  )
  const [code, setCode] = useState<string | null>(() => readStorage(STORAGE_KEYS.code))
  const [me, setMe] = useState<PersonId | null>(
    () => readStorage(STORAGE_KEYS.me) as PersonId | null,
  )
  const [items, setItems] = useState<TimelineItem[] | null>(null)
  const [checkins, setCheckins] = useState<Map<string, Checkin>>(() => new Map())
  const [packing, setPacking] = useState<PackingItem[]>([])
  const [shops, setShops] = useState<ShopCandidate[]>([])
  const [error, setError] = useState<string | null>(null)
  /** 合言葉が違うと確定した状態。Firestoreがpermission-deniedを返したときだけ立つ */
  const [denied, setDenied] = useState(false)
  const [seeding, setSeeding] = useState(false)
  /** 初期データの流し込みは1回だけ。何度も走らせない */
  const seededRef = useRef({ items: false, packing: false, shops: false })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeStorage(STORAGE_KEYS.theme, theme)
  }, [theme])

  /**
   * 読み込み失敗の共通処理。
   * ログイン画面では合言葉を判定しきれないので、実際に読めたかどうかはここで分かる。
   * permission-denied は「合言葉が違う」と断定してよい唯一の合図。
   * それ以外は原因コードを添えて出す（何が起きているか分からないと直せないため）。
   */
  const handleLoadError = useCallback((what: string, e: Error) => {
    const codeName = (e as { code?: string }).code
    if (codeName === 'permission-denied') {
      setDenied(true)
      return
    }
    setError(`${what}を読み込めませんでした（${codeName ?? e.message}）`)
  }, [])

  // Firestoreの購読。合言葉が決まってから張る
  useEffect(() => {
    if (!code) return
    const unsubscribe = subscribeItems(
      code,
      (next, fromCache) => {
        setItems(next)
        // 初期行程を流し込むのは「サーバが本当に空」かつ「まだ流していない」ときだけ。
        // キャッシュ由来の空で書き込むと、電波復帰時にサーバの最新データを上書きしてしまう。
        if (next.length > 0 || fromCache || seededRef.current.items) return
        seededRef.current.items = true
        setSeeding(true)
        seedItinerary(code)
          .catch(() => setError('初期データの登録に失敗しました。'))
          .finally(() => setSeeding(false))
      },
      (e) => handleLoadError('旅程', e),
    )
    return unsubscribe
  }, [code, handleLoadError])

  // 「済」の購読
  useEffect(() => {
    if (!code) return
    return subscribeCheckins(code, setCheckins, (e) => handleLoadError('チェックイン', e))
  }, [code, handleLoadError])

  const handleToggleCheckin = useCallback(
    (item: TimelineItem, alreadyDone: boolean) => {
      if (!code || !me) return
      toggleCheckin(code, item.id, me, alreadyDone).catch(() =>
        setError('チェックインを保存できませんでした。'),
      )
    },
    [code, me],
  )

  const handleGateDone = useCallback((nextCode: string, nextMe: PersonId) => {
    writeStorage(STORAGE_KEYS.code, nextCode)
    writeStorage(STORAGE_KEYS.me, nextMe)
    setError(null)
    setDenied(false)
    setCode(nextCode)
    setMe(nextMe)
  }, [])

  const handleChangeMe = useCallback(() => {
    if (!window.confirm('別の人に切り替えますか？')) return
    removeStorage(STORAGE_KEYS.me)
    setMe(null)
  }, [])

  /** 合言葉から入れ直す。間違った合言葉が保存されたときの復旧手段 */
  const restartFromCode = useCallback(() => {
    removeStorage(STORAGE_KEYS.code)
    removeStorage(STORAGE_KEYS.me)
    seededRef.current = { items: false, packing: false, shops: false }
    setItems(null)
    setError(null)
    setDenied(false)
    setCode(null)
    setMe(null)
  }, [])

  const handleChangeCode = useCallback(() => {
    if (!window.confirm('合言葉を入れ直しますか？')) return
    restartFromCode()
  }, [restartFromCode])

  // 持ち物の購読。空なら初期リストを流し込む
  useEffect(() => {
    if (!code) return
    return subscribePacking(
      code,
      (next, fromCache) => {
        setPacking(next)
        if (next.length > 0 || fromCache || seededRef.current.packing) return
        seededRef.current.packing = true
        seedPacking(code).catch(() => setError('持ち物リストの初期登録に失敗しました。'))
      },
      (e) => handleLoadError('持ち物リスト', e),
    )
  }, [code, handleLoadError])

  const handleSavePacking = useCallback(
    (item: PackingItem) => {
      if (!code) return
      savePackingItem(code, item).catch(() => setError('持ち物を保存できませんでした。'))
    },
    [code],
  )

  const handleDeletePacking = useCallback(
    (item: PackingItem) => {
      if (!code) return
      deletePackingItem(code, item.id).catch(() => setError('持ち物を削除できませんでした。'))
    },
    [code],
  )

  // お店候補の購読。空なら調べておいた候補を流し込む
  useEffect(() => {
    if (!code) return
    return subscribeShops(
      code,
      (next, fromCache) => {
        setShops(next)
        if (next.length > 0 || fromCache || seededRef.current.shops) return
        seededRef.current.shops = true
        seedShops(code).catch(() => setError('お店候補の初期登録に失敗しました。'))
      },
      (e) => handleLoadError('お店候補', e),
    )
  }, [code, handleLoadError])

  const handleSaveShop = useCallback(
    (shop: ShopCandidate) => {
      if (!code) return
      saveShop(code, shop).catch(() => setError('お店候補を保存できませんでした。'))
    },
    [code],
  )

  const handleDeleteShop = useCallback(
    (shop: ShopCandidate) => {
      if (!code) return
      deleteShop(code, shop.id).catch(() => setError('お店候補を削除できませんでした。'))
    },
    [code],
  )

  const handleDecideShop = useCallback(
    (shop: ShopCandidate, sameSlot: ShopCandidate[]) => {
      if (!code) return
      decideShop(code, shop, sameSlot).catch(() => setError('決定を保存できませんでした。'))
    },
    [code],
  )

  const handleSaveItem = useCallback(
    (item: TimelineItem) => {
      if (!code) return
      saveItem(code, item).catch(() => setError('予定を保存できませんでした。'))
    },
    [code],
  )

  const handleDeleteItem = useCallback(
    (item: TimelineItem) => {
      if (!code) return
      deleteItem(code, item.id).catch(() => setError('予定を削除できませんでした。'))
    },
    [code],
  )

  const handleReset = useCallback(() => {
    if (!code) return
    if (!window.confirm('行程を初期状態に戻します。よろしいですか？')) return
    resetItinerary(code).catch(() => setError('初期状態に戻せませんでした。'))
  }, [code])

  if (!code || !me) {
    return <Gate initialCode={code} onDone={handleGateDone} />
  }

  // 合言葉が違うと確定した場合。入れ直す以外に出口が無いので、それだけ出す
  if (denied) {
    return (
      <div className="gate">
        <h1 className="gate__title">徳島いこか</h1>
        <div className="gate__box">
          <p className="gate__error">
            合言葉が違うようです。大文字・小文字もそのまま入れてください。
          </p>
          <button className="primary-btn" type="button" onClick={restartFromCode}>
            合言葉を入れ直す
          </button>
        </div>
      </div>
    )
  }

  // まだ一度もデータを受け取れていない場合だけ、全画面のエラーにする。
  // 一度でも表示できていれば旅程は出したまま、エラーは画面上部のバーで知らせる。
  if (error && items === null) {
    return (
      <div className="gate">
        <h1 className="gate__title">徳島いこか</h1>
        <div className="gate__box">
          <p className="gate__error">{error}</p>
          <button className="primary-btn" type="button" onClick={() => window.location.reload()}>
            再読み込み
          </button>
          <button className="link-btn" type="button" onClick={restartFromCode}>
            合言葉を入れ直す
          </button>
        </div>
      </div>
    )
  }

  // 初期データを流し込んでいる最中に空の画面を見せない
  if (items === null || (seeding && items.length === 0)) {
    return (
      <div className="gate">
        <h1 className="gate__title">徳島いこか</h1>
        <p className="gate__lead">{seeding ? '旅程を準備しています…' : '読み込み中…'}</p>
      </div>
    )
  }

  return (
    <TripView
      items={items}
      checkins={checkins}
      me={me}
      error={error}
      onDismissError={() => setError(null)}
      onToggleCheckin={handleToggleCheckin}
      onSaveItem={handleSaveItem}
      onDeleteItem={handleDeleteItem}
      packing={packing}
      onSavePacking={handleSavePacking}
      onDeletePacking={handleDeletePacking}
      shops={shops}
      onSaveShop={handleSaveShop}
      onDeleteShop={handleDeleteShop}
      onDecideShop={handleDecideShop}
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      onChangeMe={handleChangeMe}
      onChangeCode={handleChangeCode}
      onReset={handleReset}
    />
  )
}
