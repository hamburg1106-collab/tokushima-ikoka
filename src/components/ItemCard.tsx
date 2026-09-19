import type { Checkin, ItemKind, PersonId, TimelineItem } from '../types'
import { ALL_IDS, personName, personStyle } from '../data/people'

const KIND_LABEL: Record<ItemKind, string> = {
  move: '移動',
  stay: '宿',
  meal: '食事',
  sight: '観光',
  other: 'その他',
}

const KIND_ICON: Record<ItemKind, string> = {
  move: '🚗',
  stay: '🛏️',
  meal: '🍽️',
  sight: '📷',
  other: '📌',
}

type Props = {
  item: TimelineItem
  /** 自分が参加する予定か（左寄せ／右寄せの判定） */
  mine: boolean
  /** 「今ここ」マーカーを出すか */
  isNow: boolean
  /** 「済」の情報。無ければ未チェック */
  checkin?: Checkin
  onToggleCheckin: (item: TimelineItem, alreadyDone: boolean) => void
  onEdit: (item: TimelineItem) => void
}

/**
 * 参加者の表示。知りたいのは「誰が一緒か」ではなく「誰が違うか」。
 * 1日目は5人参加なので、全カードに5個並べると読みにくい。
 * 欠員が2人までなら「全員（勇なし）」の形にまとめる。
 */
const participantLabel = (participants: PersonId[]): string | null => {
  const missing = ALL_IDS.filter((id) => !participants.includes(id))
  if (missing.length === 0) return '全員'
  if (missing.length <= 2) return `全員（${missing.map(personName).join('・')}なし）`
  return null
}

export default function ItemCard({
  item,
  mine,
  isNow,
  checkin,
  onToggleCheckin,
  onEdit,
}: Props) {
  const done = Boolean(checkin)
  const label = participantLabel(item.participants)
  const detail: string[] = []
  if (item.move?.flightNo) detail.push(item.move.flightNo)
  if (item.move?.arriveTime) detail.push(`着 ${item.move.arriveTime}`)
  if (item.stay?.checkIn) detail.push(`IN ${item.stay.checkIn}`)
  if (item.sight?.duration) detail.push(item.sight.duration)
  // 店名は「場所」と同じことが多いので、違うときだけ出す（二重表示を避ける）
  if (item.meal?.shop && item.meal.shop !== item.place) detail.push(item.meal.shop)

  return (
    <div className={`row ${mine ? 'row--mine' : 'row--other'}`}>
      <div className="row__time">
        <span className="row__clock">{item.time}</span>
        {item.timeTbd && <span className="row__tbd">時刻未定</span>}
      </div>

      <article
        className={`card card--${item.kind} ${isNow ? 'card--now' : ''} ${done ? 'card--done' : ''}`}
      >
        <div className="card__head">
          <span className="card__kind">
            {KIND_ICON[item.kind]} {KIND_LABEL[item.kind]}
          </span>
          <span className="card__people">
            {label ? (
              <span className={`chip ${label === '全員' ? 'chip--all' : ''}`}>{label}</span>
            ) : (
              item.participants.map((id) => (
                <span key={id} className="chip chip--person person" style={personStyle(id)}>
                  {personName(id)}
                </span>
              ))
            )}
          </span>
        </div>

        <h3 className="card__title">{item.title}</h3>

        {item.place && <p className="card__place">{item.place}</p>}
        {detail.length > 0 && <p className="card__detail">{detail.join(' ／ ')}</p>}
        {item.note && <p className="card__note">{item.note}</p>}

        <div className="card__foot">
          <button type="button" className="edit-btn" onClick={() => onEdit(item)}>
            編集
          </button>
          {mine ? (
            <button
              type="button"
              className={`check-btn ${done ? 'check-btn--done' : ''}`}
              onClick={() => onToggleCheckin(item, done)}
            >
              {done ? `✓ 済（${personName(checkin!.by)}）` : '済にする'}
            </button>
          ) : (
            done && <span className="check-label">✓ 済（{personName(checkin!.by)}）</span>
          )}
        </div>
      </article>
    </div>
  )
}
