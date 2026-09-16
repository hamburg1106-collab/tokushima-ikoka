import { useEffect, useMemo, useRef, useState } from 'react'
import ItemCard from './ItemCard'
import ItemEditor from './ItemEditor'
import PackingList from './PackingList'
import TripHeader from './TripHeader'
import type { Theme, View } from './TripHeader'
import { TRIP_DAYS } from '../data/itinerary'
import { ALL_IDS, OWNER_ID, personName } from '../data/people'
import type { Checkin, PackingItem, PersonId, TimelineItem } from '../types'
import { daysUntil, toDate, toDateKey } from '../lib/time'
import { newItemId } from '../lib/tripStore'
import { useOnline } from '../lib/useOnline'

type Props = {
  items: TimelineItem[]
  checkins: Map<string, Checkin>
  me: PersonId
  theme: Theme
  error: string | null
  onDismissError: () => void
  onToggleTheme: () => void
  onChangeMe: () => void
  onChangeCode: () => void
  onReset: () => void
  onToggleCheckin: (item: TimelineItem, alreadyDone: boolean) => void
  onSaveItem: (item: TimelineItem) => void
  onDeleteItem: (item: TimelineItem) => void
  packing: PackingItem[]
  onSavePacking: (item: PackingItem) => void
  onDeletePacking: (item: PackingItem) => void
}

/** 「＋予定を追加」で開く空の下書き */
const emptyDraft = (day: 1 | 2 | 3): TimelineItem => ({
  id: newItemId(),
  day,
  date: TRIP_DAYS.find((d) => d.day === day)!.date,
  time: '12:00',
  title: '',
  kind: 'other',
  participants: [...ALL_IDS],
})

/** 今日が旅行何日目か。旅行期間外なら null */
const todayDayNumber = (now: Date): 1 | 2 | 3 | null => {
  const key = toDateKey(now)
  return TRIP_DAYS.find((d) => d.date === key)?.day ?? null
}

export default function TripView({
  items,
  checkins,
  me,
  theme,
  error,
  onDismissError,
  onToggleTheme,
  onChangeMe,
  onChangeCode,
  onReset,
  onToggleCheckin,
  onSaveItem,
  onDeleteItem,
  packing,
  onSavePacking,
  onDeletePacking,
}: Props) {
  const [now, setNow] = useState(() => new Date())
  const [onlyMine, setOnlyMine] = useState(false)
  const [activeDay, setActiveDay] = useState<1 | 2 | 3>(() => todayDayNumber(new Date()) ?? 1)
  const [editing, setEditing] = useState<{ item: TimelineItem; isNew: boolean } | null>(null)
  const [view, setView] = useState<View>('trip')
  const online = useOnline()
  const listRef = useRef<HTMLDivElement>(null)
  /** 自動スクロールは日を切り替えたときの1回だけ。見ている最中に引き戻さないため */
  const autoScrolledRef = useRef(false)
  /** 手動でタブを選んだか。選んでいれば日付が変わっても勝手に動かさない */
  const dayPickedByUserRef = useRef(false)

  // 1分ごとに現在時刻を更新（「今ここ」マーカーのため）
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // iPhoneはアプリを閉じずに放置されるため、復帰時に時計を合わせ直す。
  // これが無いと、日付をまたいでも前日のタブを見続けることになる。
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'visible') return
      const current = new Date()
      setNow(current)
      const today = todayDayNumber(current)
      if (today && !dayPickedByUserRef.current) setActiveDay(today)
    }
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  const visibleItems = useMemo(
    () =>
      items
        .filter((item) => item.day === activeDay)
        .filter((item) => (onlyMine ? item.participants.includes(me) : true)),
    [items, activeDay, onlyMine, me],
  )

  /** 「今ここ」＝まだ始まっていない最初の予定 */
  const nextItemId = useMemo(() => {
    if (todayDayNumber(now) !== activeDay) return null
    const next = visibleItems.find(
      (item) => toDate(item.date, item.time).getTime() >= now.getTime(),
    )
    return next?.id ?? null
  }, [visibleItems, now, activeDay])

  // 日付が変わったら、手動でタブを触っていない限り今日に合わせる
  useEffect(() => {
    const today = todayDayNumber(now)
    if (today && !dayPickedByUserRef.current && today !== activeDay) setActiveDay(today)
  }, [now, activeDay])

  // 日を切り替えたとき・持ち物から旅程に戻ったときに、自動スクロールを1回だけ許可する
  useEffect(() => {
    autoScrolledRef.current = false
  }, [activeDay, view])

  useEffect(() => {
    if (autoScrolledRef.current || !nextItemId || !listRef.current) return
    autoScrolledRef.current = true
    const target = listRef.current.querySelector<HTMLElement>(`[data-item-id="${nextItemId}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [nextItemId, activeDay, view])

  const doneCount = visibleItems.filter((item) => checkins.has(item.id)).length
  const remainingDays = daysUntil(TRIP_DAYS[0].date, now)
  const activeDayInfo = TRIP_DAYS.find((d) => d.day === activeDay)!

  return (
    <div className="app">
      <TripHeader
        theme={theme}
        onToggleTheme={onToggleTheme}
        remainingDays={remainingDays}
        view={view}
        onChangeView={setView}
        activeDay={activeDay}
        onChangeDay={(day) => {
          dayPickedByUserRef.current = true
          setActiveDay(day)
        }}
      />

      {!online && (
        <p className="notice notice--offline">
          オフラインです。表示は保存済みの内容で、変更は電波が戻ってから送られます。
        </p>
      )}

      {error && (
        <div className="notice notice--error">
          <span>{error}</span>
          <button type="button" className="notice__close" onClick={onDismissError}>
            閉じる
          </button>
        </div>
      )}

      <main className="main">
        <div className="toolbar">
          <button type="button" className="ghost-btn ghost-btn--sm" onClick={onChangeMe}>
            あなた：{personName(me)} ▸ 切替
          </button>

          {view === 'trip' && (
            <label className="switch">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
              />
              <span>自分の予定だけ</span>
            </label>
          )}
        </div>

        {view === 'packing' ? (
          <PackingList items={packing} me={me} onSave={onSavePacking} onDelete={onDeletePacking} />
        ) : (
          <>
            <p className="legend">左＝{personName(me)}の予定 ／ 右＝他の人の予定</p>

            <div className="list" ref={listRef}>
              {visibleItems.length === 0 && (
                <p className="empty">
                  {onlyMine
                    ? `この日に${personName(me)}の予定はありません。`
                    : 'この日の予定はまだありません。'}
                </p>
              )}
              {visibleItems.map((item) => (
                <div key={item.id} data-item-id={item.id}>
                  <ItemCard
                    item={item}
                    mine={item.participants.includes(me)}
                    isNow={item.id === nextItemId}
                    checkin={checkins.get(item.id)}
                    onToggleCheckin={onToggleCheckin}
                    onEdit={(target) => setEditing({ item: target, isNew: false })}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="add-btn"
              onClick={() => setEditing({ item: emptyDraft(activeDay), isNew: true })}
            >
              ＋ 予定を追加
            </button>

            <p className="footnote">
              {activeDayInfo.label}・{visibleItems.length}件（済 {doneCount}）
            </p>
          </>
        )}

        {me === OWNER_ID && (
          <div className="owner-area">
            <button type="button" className="danger-btn" onClick={onReset}>
              初期状態に戻す
            </button>
            <p className="owner-area__note">
              行程を全員分まとめて、最初に登録した内容へ戻します（幹事のみ表示）。
            </p>
          </div>
        )}

        <div className="settings">
          <button type="button" className="link-btn" onClick={onChangeCode}>
            合言葉を入れ直す
          </button>
        </div>
      </main>

      {editing && (
        <ItemEditor
          initial={editing.item}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={(item) => {
            onSaveItem(item)
            setEditing(null)
          }}
          onDelete={(item) => {
            if (!window.confirm(`「${item.title}」を削除します。よろしいですか？`)) return
            onDeleteItem(item)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
