import { useEffect, useState } from 'react'
import { PEOPLE, personName, personStyle } from '../data/people'
import type { PackingItem, PersonId } from '../types'
import { newItemId } from '../lib/tripStore'

/** 担当ボタンの表示。3人以上は幅に収まらないので畳む */
const assigneeLabel = (ids: PersonId[]): string => {
  if (ids.length === 0) return '担当'
  if (ids.length <= 2) return ids.map(personName).join('・')
  return `${personName(ids[0])} 他${ids.length - 1}人`
}

type Props = {
  items: PackingItem[]
  me: PersonId
  onSave: (item: PackingItem) => void
  onDelete: (item: PackingItem) => void
}

export default function PackingList({ items, me, onSave, onDelete }: Props) {
  const [newName, setNewName] = useState('')
  const [openAssignee, setOpenAssignee] = useState<string | null>(null)
  /** 直前に削除した1件。「元に戻す」で復活させる */
  const [deleted, setDeleted] = useState<PackingItem | null>(null)

  // 取り消しバーは10秒で自動的に消す
  useEffect(() => {
    if (!deleted) return
    const id = window.setTimeout(() => setDeleted(null), 10_000)
    return () => window.clearTimeout(id)
  }, [deleted])

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const maxOrder = items.reduce((max, item) => Math.max(max, item.order), 0)
    onSave({ id: newItemId(), name, assignees: [], checked: false, order: maxOrder + 1 })
    setNewName('')
  }

  /**
   * 保存用に作り直す。
   * Firestoreはundefinedを受け付けず、setDocは丸ごと上書きなので、
   * ここで組み立てた形がそのままサーバのドキュメントになる。
   * 旧形式の assignee は載せない（これで自然に新形式へ移行する）。
   */
  const build = (item: PackingItem, changes: Partial<PackingItem>): PackingItem => {
    const next: PackingItem = {
      id: item.id,
      name: item.name,
      assignees: item.assignees,
      order: item.order,
      checked: item.checked,
      ...changes,
    }
    if (next.checked && next.checkedBy === undefined) next.checkedBy = item.checkedBy ?? me
    if (!next.checked) delete next.checkedBy
    return next
  }

  const toggle = (item: PackingItem) => {
    onSave(build(item, { checked: !item.checked, checkedBy: !item.checked ? me : undefined }))
  }

  /** 担当者は複数人。同じ人をもう一度押すと外れる */
  const toggleAssignee = (item: PackingItem, id: PersonId) => {
    const assignees = item.assignees.includes(id)
      ? item.assignees.filter((a) => a !== id)
      : [...item.assignees, id]
    onSave(build(item, { assignees }))
  }

  const clearAssignees = (item: PackingItem) => {
    onSave(build(item, { assignees: [] }))
  }

  const doneCount = items.filter((item) => item.checked).length

  return (
    <div className="packing">
      <p className="packing__summary">
        {doneCount} / {items.length} 準備できた
      </p>

      <ul className="packing__list">
        {items.map((item) => (
          <li key={item.id} className={`pack ${item.checked ? 'pack--done' : ''}`}>
            <button
              type="button"
              className="pack__check"
              onClick={() => toggle(item)}
              aria-label={item.checked ? 'チェックを外す' : 'チェックする'}
            >
              {item.checked ? '☑' : '☐'}
            </button>

            <div className="pack__body">
              <span className="pack__name">{item.name}</span>
              {item.checked && item.checkedBy && (
                <span className="pack__by">（{personName(item.checkedBy)}）</span>
              )}
            </div>

            <button
              type="button"
              className={`pack__assignee ${item.assignees.length > 0 ? 'pack__assignee--set' : ''}`}
              onClick={() => setOpenAssignee(openAssignee === item.id ? null : item.id)}
            >
              {item.assignees.map((id) => (
                <i key={id} className="person-dot person" style={personStyle(id)} />
              ))}
              {assigneeLabel(item.assignees)}
            </button>

            <button
              type="button"
              className="pack__delete"
              onClick={() => {
                // 共有リストなので、他の人の持ち物を誤って消さないよう一度止める
                if (!window.confirm(`「${item.name}」を削除しますか？`)) return
                onDelete(item)
                setDeleted(item)
              }}
              aria-label="削除"
            >
              ×
            </button>

            {openAssignee === item.id && (
              // 複数選べるので、1人選んでも閉じない。閉じるのは「完了」か担当ボタンの再タップ
              <div className="pack__picker">
                {PEOPLE.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`toggle toggle--person person ${
                      item.assignees.includes(p.id) ? 'toggle--on' : ''
                    }`}
                    style={personStyle(p.id)}
                    onClick={() => toggleAssignee(item, p.id)}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="toggle toggle--ghost"
                  onClick={() => clearAssignees(item)}
                  disabled={item.assignees.length === 0}
                >
                  未定に戻す
                </button>
                <button
                  type="button"
                  className="toggle toggle--done"
                  onClick={() => setOpenAssignee(null)}
                >
                  完了
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {deleted && (
        <div className="undo-bar">
          <span>「{deleted.name}」を削除しました</span>
          <button
            type="button"
            className="undo-bar__btn"
            onClick={() => {
              onSave(deleted)
              setDeleted(null)
            }}
          >
            元に戻す
          </button>
        </div>
      )}

      <form className="packing__add" onSubmit={add}>
        <input
          className="field__input"
          type="text"
          value={newName}
          placeholder="持ち物を追加"
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="primary-btn primary-btn--sm" disabled={!newName.trim()}>
          追加
        </button>
      </form>
    </div>
  )
}
