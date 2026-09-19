import { useState } from 'react'
import type { ItemKind, PersonId, TimelineItem } from '../types'
import { ALL_IDS, PEOPLE, personStyle } from '../data/people'
import { TRIP_DAYS } from '../data/itinerary'

const KINDS: { id: ItemKind; label: string; icon: string }[] = [
  { id: 'move', label: '移動', icon: '🚗' },
  { id: 'stay', label: '宿', icon: '🛏️' },
  { id: 'meal', label: '食事', icon: '🍽️' },
  { id: 'sight', label: '観光', icon: '📷' },
  { id: 'other', label: 'その他', icon: '📌' },
]

type Props = {
  /** 既存の予定を編集する場合はそのitem、新規なら空の下書き */
  initial: TimelineItem
  isNew: boolean
  onSave: (item: TimelineItem) => void
  onDelete: (item: TimelineItem) => void
  onClose: () => void
}

/** ラベル付きの1行入力 */
function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export default function ItemEditor({ initial, isNew, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<TimelineItem>(initial)

  const patch = (changes: Partial<TimelineItem>) => setDraft({ ...draft, ...changes })

  const toggleParticipant = (id: PersonId) => {
    const next = draft.participants.includes(id)
      ? draft.participants.filter((p) => p !== id)
      : [...draft.participants, id]
    // 行程表と同じ並び順を保つ
    patch({ participants: ALL_IDS.filter((p) => next.includes(p)) })
  }

  const changeDay = (day: 1 | 2 | 3) => {
    const info = TRIP_DAYS.find((d) => d.day === day)!
    patch({ day, date: info.date })
  }

  const canSave = draft.title.trim() !== '' && draft.participants.length > 0

  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <div className="sheet__bar">
        <button type="button" className="ghost-btn ghost-btn--sm" onClick={onClose}>
          キャンセル
        </button>
        <span className="sheet__title">{isNew ? '予定を追加' : '予定を編集'}</span>
        <button
          type="button"
          className="primary-btn primary-btn--sm"
          disabled={!canSave}
          onClick={() => onSave({ ...draft, title: draft.title.trim() })}
        >
          保存
        </button>
      </div>

      <div className="sheet__body">
        <div className="field">
          <span className="field__label">種別</span>
          <div className="chips">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`toggle ${draft.kind === k.id ? 'toggle--on' : ''}`}
                onClick={() => patch({ kind: k.id })}
              >
                {k.icon} {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">日</span>
          <div className="chips">
            {TRIP_DAYS.map((d) => (
              <button
                key={d.day}
                type="button"
                className={`toggle ${draft.day === d.day ? 'toggle--on' : ''}`}
                onClick={() => changeDay(d.day)}
              >
                {d.label}（{Number(d.date.slice(5, 7))}/{Number(d.date.slice(8, 10))}）
              </button>
            ))}
          </div>
        </div>

        <Field label="時刻" type="time" value={draft.time} onChange={(v) => patch({ time: v })} />

        <label className="switch switch--block">
          <input
            type="checkbox"
            checked={Boolean(draft.timeTbd)}
            onChange={(e) => patch({ timeTbd: e.target.checked })}
          />
          <span>時刻は未定（仮置き）</span>
        </label>

        <Field
          label="タイトル"
          value={draft.title}
          placeholder="例：大塚国際美術館"
          onChange={(v) => patch({ title: v })}
        />
        <Field
          label="場所"
          value={draft.place ?? ''}
          onChange={(v) => patch({ place: v })}
          placeholder="店名・施設名・住所など"
        />
        <Field
          label="メモ"
          value={draft.note ?? ''}
          onChange={(v) => patch({ note: v })}
          placeholder="補足があれば"
        />

        <div className="field">
          <span className="field__label">参加者</span>
          <div className="chips">
            {PEOPLE.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`toggle toggle--person person ${
                  draft.participants.includes(p.id) ? 'toggle--on' : ''
                }`}
                style={personStyle(p.id)}
                onClick={() => toggleParticipant(p.id)}
              >
                {p.name}
              </button>
            ))}
            <button
              type="button"
              className="toggle toggle--ghost"
              onClick={() => patch({ participants: [...ALL_IDS] })}
            >
              全員
            </button>
          </div>
        </div>

        {/* ここから種別ごとの追加項目 */}
        {draft.kind === 'move' && (
          <div className="field-group">
            <Field
              label="便名"
              value={draft.move?.flightNo ?? ''}
              onChange={(v) => patch({ move: { ...draft.move, flightNo: v } })}
              placeholder="JAL455 など"
            />
            <Field
              label="予約番号"
              value={draft.move?.reservationNo ?? ''}
              onChange={(v) => patch({ move: { ...draft.move, reservationNo: v } })}
            />
            <Field
              label="出発地"
              value={draft.move?.from ?? ''}
              onChange={(v) => patch({ move: { ...draft.move, from: v } })}
            />
            <Field
              label="到着地"
              value={draft.move?.to ?? ''}
              onChange={(v) => patch({ move: { ...draft.move, to: v } })}
            />
            <Field
              label="到着時刻"
              type="time"
              value={draft.move?.arriveTime ?? ''}
              onChange={(v) => patch({ move: { ...draft.move, arriveTime: v } })}
            />
          </div>
        )}

        {draft.kind === 'stay' && (
          <div className="field-group">
            <Field
              label="チェックイン"
              value={draft.stay?.checkIn ?? ''}
              onChange={(v) => patch({ stay: { ...draft.stay, checkIn: v } })}
              placeholder="15:00〜 など"
            />
            <Field
              label="チェックアウト"
              value={draft.stay?.checkOut ?? ''}
              onChange={(v) => patch({ stay: { ...draft.stay, checkOut: v } })}
            />
            <Field
              label="住所"
              value={draft.stay?.address ?? ''}
              onChange={(v) => patch({ stay: { ...draft.stay, address: v } })}
            />
            <Field
              label="電話"
              type="tel"
              value={draft.stay?.tel ?? ''}
              onChange={(v) => patch({ stay: { ...draft.stay, tel: v } })}
            />
          </div>
        )}

        {draft.kind === 'meal' && (
          <div className="field-group">
            <Field
              label="店名"
              value={draft.meal?.shop ?? ''}
              onChange={(v) => patch({ meal: { ...draft.meal, shop: v } })}
            />
            <Field
              label="予算"
              value={draft.meal?.budget ?? ''}
              onChange={(v) => patch({ meal: { ...draft.meal, budget: v } })}
              placeholder="1人2000円 など"
            />
            <label className="switch switch--block">
              <input
                type="checkbox"
                checked={Boolean(draft.meal?.reserved)}
                onChange={(e) => patch({ meal: { ...draft.meal, reserved: e.target.checked } })}
              />
              <span>予約済み</span>
            </label>
          </div>
        )}

        {draft.kind === 'sight' && (
          <div className="field-group">
            <Field
              label="営業時間"
              value={draft.sight?.hours ?? ''}
              onChange={(v) => patch({ sight: { ...draft.sight, hours: v } })}
              placeholder="9:00〜17:00 など"
            />
            <Field
              label="料金"
              value={draft.sight?.fee ?? ''}
              onChange={(v) => patch({ sight: { ...draft.sight, fee: v } })}
            />
            <Field
              label="所要時間"
              value={draft.sight?.duration ?? ''}
              onChange={(v) => patch({ sight: { ...draft.sight, duration: v } })}
              placeholder="見学40分 など"
            />
          </div>
        )}

        {!isNew && (
          <div className="sheet__danger">
            <button type="button" className="danger-btn" onClick={() => onDelete(draft)}>
              この予定を削除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
