import { useState } from 'react'
import { PEOPLE, personName } from '../data/people'
import type { PackingItem, PersonId } from '../types'
import { newItemId } from '../lib/tripStore'

type Props = {
  items: PackingItem[]
  me: PersonId
  onSave: (item: PackingItem) => void
  onDelete: (item: PackingItem) => void
}

export default function PackingList({ items, me, onSave, onDelete }: Props) {
  const [newName, setNewName] = useState('')
  const [openAssignee, setOpenAssignee] = useState<string | null>(null)

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const maxOrder = items.reduce((max, item) => Math.max(max, item.order), 0)
    onSave({ id: newItemId(), name, assignee: null, checked: false, order: maxOrder + 1 })
    setNewName('')
  }

  const toggle = (item: PackingItem) => {
    // Firestoreはundefinedの値を受け付けないので、キーごと作り直す
    const next: PackingItem = {
      id: item.id,
      name: item.name,
      assignee: item.assignee,
      order: item.order,
      checked: !item.checked,
    }
    if (next.checked) next.checkedBy = me
    onSave(next)
  }

  const setAssignee = (item: PackingItem, assignee: PersonId | null) => {
    onSave({ ...item, assignee })
    setOpenAssignee(null)
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
              className={`pack__assignee ${item.assignee ? 'pack__assignee--set' : ''}`}
              onClick={() => setOpenAssignee(openAssignee === item.id ? null : item.id)}
            >
              {item.assignee ? personName(item.assignee) : '担当'}
            </button>

            <button
              type="button"
              className="pack__delete"
              onClick={() => {
                if (window.confirm(`「${item.name}」を削除します。よろしいですか？`)) {
                  onDelete(item)
                }
              }}
              aria-label="削除"
            >
              ×
            </button>

            {openAssignee === item.id && (
              <div className="pack__picker">
                {PEOPLE.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`toggle ${item.assignee === p.id ? 'toggle--on' : ''}`}
                    onClick={() => setAssignee(item, p.id)}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="toggle toggle--ghost"
                  onClick={() => setAssignee(item, null)}
                >
                  未定
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

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
