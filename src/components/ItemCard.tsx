import type { Checkin, ItemKind, PersonId, TimelineItem } from '../types'
import { ALL_IDS, personName } from '../data/people'

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

const isEveryone = (participants: PersonId[]) => participants.length === ALL_IDS.length

export default function ItemCard({
  item,
  mine,
  isNow,
  checkin,
  onToggleCheckin,
  onEdit,
}: Props) {
  const done = Boolean(checkin)
  const detail: string[] = []
  if (item.move?.flightNo) detail.push(item.move.flightNo)
  if (item.move?.arriveTime) detail.push(`着 ${item.move.arriveTime}`)
  if (item.stay?.checkIn) detail.push(`IN ${item.stay.checkIn}`)
  if (item.sight?.duration) detail.push(item.sight.duration)
  if (item.meal?.shop) detail.push(item.meal.shop)

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
            {isEveryone(item.participants) ? (
              <span className="chip chip--all">全員</span>
            ) : (
              item.participants.map((id) => (
                <span key={id} className="chip">
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
          <button
            type="button"
            className="edit-btn"
            onClick={() => onEdit(item)}
            aria-label="この予定を編集"
          >
            ⋯
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
