import { TRIP_DAYS } from '../data/itinerary'

export type Theme = 'light' | 'dark'
export type View = 'trip' | 'packing'

type Props = {
  theme: Theme
  onToggleTheme: () => void
  remainingDays: number
  view: View
  onChangeView: (view: View) => void
  activeDay: 1 | 2 | 3
  onChangeDay: (day: 1 | 2 | 3) => void
}

export default function TripHeader({
  theme,
  onToggleTheme,
  remainingDays,
  view,
  onChangeView,
  activeDay,
  onChangeDay,
}: Props) {
  return (
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
        {remainingDays > 0 ? <strong>出発まであと{remainingDays}日</strong> : <strong>旅行中</strong>}
        <span className="header__range">10/29（木）〜10/31（土）鳴門</span>
      </p>

      <div className="segmented" role="tablist" aria-label="表示切替">
        <button
          type="button"
          className={`segment ${view === 'trip' ? 'segment--on' : ''}`}
          onClick={() => onChangeView('trip')}
        >
          旅程
        </button>
        <button
          type="button"
          className={`segment ${view === 'packing' ? 'segment--on' : ''}`}
          onClick={() => onChangeView('packing')}
        >
          持ち物
        </button>
      </div>

      <nav className="tabs" aria-label="日程" hidden={view !== 'trip'}>
        {TRIP_DAYS.map((d) => (
          <button
            key={d.day}
            type="button"
            className={`tab ${d.day === activeDay ? 'tab--active' : ''}`}
            onClick={() => onChangeDay(d.day)}
          >
            <span className="tab__label">{d.label}</span>
            <span className="tab__date">
              {Number(d.date.slice(5, 7))}/{Number(d.date.slice(8, 10))}（{d.weekday}）
            </span>
          </button>
        ))}
      </nav>
    </header>
  )
}
