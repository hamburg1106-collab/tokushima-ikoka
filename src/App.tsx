import { useCallback, useEffect, useState } from 'react'
import './App.css'
import Gate from './components/Gate'
import TripView from './components/TripView'
import { STORAGE_KEYS } from './config'
import { readStorage, removeStorage, writeStorage } from './lib/storage'
import {
  deleteItem,
  deletePackingItem,
  resetItinerary,
  saveItem,
  savePackingItem,
  seedItinerary,
  seedPacking,
  subscribeCheckins,
  subscribeItems,
  subscribePacking,
  toggleCheckin,
} from './lib/tripStore'
import type { Checkin, PackingItem, PersonId, TimelineItem } from './types'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeStorage(STORAGE_KEYS.theme, theme)
  }, [theme])

  // Firestoreの購読。合言葉が決まってから張る
  useEffect(() => {
    if (!code) return
    const unsubscribe = subscribeItems(
      code,
      (next) => {
        setItems(next)
        // 初回だけ、空なら初期行程を流し込む
        if (next.length === 0) {
          seedItinerary(code).catch(() => setError('初期データの登録に失敗しました。'))
        }
      },
      () => setError('データを読み込めませんでした。通信状況を確認してください。'),
    )
    return unsubscribe
  }, [code])

  // 「済」の購読
  useEffect(() => {
    if (!code) return
    return subscribeCheckins(
      code,
      setCheckins,
      () => setError('チェックインを読み込めませんでした。'),
    )
  }, [code])

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
    setCode(nextCode)
    setMe(nextMe)
  }, [])

  const handleChangeMe = useCallback(() => {
    removeStorage(STORAGE_KEYS.me)
    setMe(null)
  }, [])

  // 持ち物の購読。空なら初期リストを流し込む
  useEffect(() => {
    if (!code) return
    return subscribePacking(
      code,
      (next) => {
        setPacking(next)
        if (next.length === 0) {
          seedPacking(code).catch(() => setError('持ち物リストの初期登録に失敗しました。'))
        }
      },
      () => setError('持ち物リストを読み込めませんでした。'),
    )
  }, [code])

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
        </div>
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="gate">
        <h1 className="gate__title">徳島いこか</h1>
        <p className="gate__lead">読み込み中…</p>
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
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      onChangeMe={handleChangeMe}
      onReset={handleReset}
    />
  )
}
