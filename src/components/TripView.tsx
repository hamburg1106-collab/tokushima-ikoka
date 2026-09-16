import { useEffect, useMemo, useRef, useState } from 'react'
import ItemCard from './ItemCard'
import { TRIP_DAYS } from '../data/itinerary'
import { OWNER_ID, personName } from '../data/people'
import type { Checkin, PersonId, TimelineItem } from '../types'
import { daysUntil, toDate, toDateKey } from '../lib/time'

type Theme = 'light' | 'dark'

type Props = {
  items: TimelineItem[]
  checkins: Map<string, Checkin>
  me: PersonId
  theme: Theme
  onToggleTheme: () => void
  onChangeMe: () => void
  onReset: () => void
  onToggleCheckin: (item: TimelineItem, alreadyDone: boolean) => void
}

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
  onToggleTheme,
  onChangeMe,
  onReset,
  onToggleCheckin,
}: Props) {
  const [now, setNow] = useState(() => new Date())
  const [onlyMine, setOnlyMine] = useState(false)
  const [activeDay, setActiveDay] = useState<1 | 2 | 3>(() => todayDayNumber(new Date()) ?? 1)
  const listRef = useRef<HTMLDivElement>(null)

  // 1分ごとに現在時刻を更新（「今ここ」マーカーと自動スクロールのため）
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
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

  // 今日のタブを開いたら、直近の予定まで自動スクロール
  useEffect(() => {
    if (!nextItemId || !listRef.current) return
    const target = listRef.current.querySelector<HTMLElement>(`[data-item-id="${nextItemId}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [nextItemId, activeDay])

  const doneCount = visibleItems.filter((item) => checkins.has(item.id)).length
  const remainingDays = daysUntil(TRIP_DAYS[0].date, now)
  const activeDayInfo = TRIP_DAYS.find((d) => d.day === activeDay)!

  return (
    <div className="app">
      <header className="header">
        <div className="header__top">
          <h1 className="header__title">徳島いこか</h1>
          <button
            type="button"
            className="ghost-btn"
            onClick={onToggleTheme}
            aria-label="テーマ切り替え"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        <p className="header__countdown">
          {remainingDays > 0 ? (
            <strong>出発まであと{remainingDays}日</strong>
          ) : (
            <strong>旅行中</strong>
          )}
          <span className="header__range">10/29（木）〜10/31（土）鳴門</span>
        </p>

        <nav className="tabs" aria-label="日程">
          {TRIP_DAYS.map((d) => (
            <button
              key={d.day}
              type="button"
              className={`tab ${d.day === activeDay ? 'tab--active' : ''}`}
              onClick={() => setActiveDay(d.day)}
            >
              <span className="tab__label">{d.label}</span>
              <span className="tab__date">
                {Number(d.date.slice(5, 7))}/{Number(d.date.slice(8, 10))}（{d.weekday}）
              </span>
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        <div className="toolbar">
          <button type="button" className="ghost-btn ghost-btn--sm" onClick={onChangeMe}>
            あなた：{personName(me)}
          </button>

          <label className="switch">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
            />
            <span>自分の予定だけ</span>
          </label>
        </div>

        <p className="legend">左＝{personName(me)}の予定 ／ 右＝他の人の予定</p>

        <div className="list" ref={listRef}>
          {visibleItems.length === 0 && (
            <p className="empty">この日に{personName(me)}の予定はありません。</p>
          )}
          {visibleItems.map((item) => (
            <div key={item.id} data-item-id={item.id}>
              <ItemCard
                item={item}
                mine={item.participants.includes(me)}
                isNow={item.id === nextItemId}
                checkin={checkins.get(item.id)}
                onToggleCheckin={onToggleCheckin}
              />
            </div>
          ))}
        </div>

        <p className="footnote">
          {activeDayInfo.label}・{visibleItems.length}件（済 {doneCount}）
        </p>

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
      </main>
    </div>
  )
}
