import { useEffect, useMemo, useState } from 'react'
import { OWNER_ID, personName } from '../data/people'
import { SHOP_SLOTS } from '../data/shops'
import type { PersonId, ShopCandidate, ShopSlotId } from '../types'
import { newItemId } from '../lib/tripStore'

type Props = {
  shops: ShopCandidate[]
  me: PersonId
  onSave: (shop: ShopCandidate) => void
  onDelete: (shop: ShopCandidate) => void
  onDecide: (shop: ShopCandidate, sameSlot: ShopCandidate[]) => void
}

/** 電話番号をタップで発信できる形に。ハイフンが入っていても tel: は受け付ける */
const telHref = (tel: string) => `tel:${tel.replace(/[^\d+]/g, '')}`

/**
 * 貼られたURLを整える。
 * 「tokushima.com」のようにスキーマ無しで貼られることがあるので https: を補う。
 * javascript: など http(s) 以外は弾く（他の人の端末で開くものなので素通ししない）。
 */
const normalizeUrl = (raw: string): string | null => {
  const text = raw.trim()
  if (!text) return null
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`
  try {
    const parsed = new URL(withScheme)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

/** 一覧に出す短い表示。URLそのままだと長すぎて折り返す */
const urlLabel = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'リンク'
  }
}

export default function ShopList({ shops, me, onSave, onDelete, onDecide }: Props) {
  const [slot, setSlot] = useState<ShopSlotId>(SHOP_SLOTS[0].id)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newUrl, setNewUrl] = useState('')
  /** URL欄を開いている候補のidと、入力中の文字列 */
  const [urlEditing, setUrlEditing] = useState<{ id: string; text: string } | null>(null)
  /** 直前に削除した1件。「元に戻す」で復活させる */
  const [deleted, setDeleted] = useState<ShopCandidate | null>(null)

  // 取り消しバーは10秒で自動的に消す（持ち物リストと同じ挙動）
  useEffect(() => {
    if (!deleted) return
    const id = window.setTimeout(() => setDeleted(null), 10_000)
    return () => window.clearTimeout(id)
  }, [deleted])

  const slotInfo = SHOP_SLOTS.find((s) => s.id === slot)!

  /** 表示は「決定＞票数の多い順＞登録順」。話し合いの結果が上に来る */
  const visible = useMemo(
    () =>
      shops
        .filter((shop) => shop.slot === slot)
        .sort((a, b) => {
          if (!!a.decided !== !!b.decided) return a.decided ? -1 : 1
          if (a.votes.length !== b.votes.length) return b.votes.length - a.votes.length
          return a.order - b.order
        }),
    [shops, slot],
  )

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const maxOrder = shops.reduce((max, shop) => Math.max(max, shop.order), 0)
    const note = newNote.trim()
    const url = normalizeUrl(newUrl)
    if (newUrl.trim() && !url) {
      window.alert('URLが正しくないようです。https:// から始まるアドレスを貼ってください。')
      return
    }
    onSave({
      id: newItemId(),
      slot,
      name,
      ...(note ? { note } : {}),
      ...(url ? { url } : {}),
      votes: [],
      addedBy: me,
      order: maxOrder + 1,
    })
    setNewName('')
    setNewNote('')
    setNewUrl('')
  }

  /**
   * 保存用に作り直す。
   * Firestoreはundefinedを受け付けず、setDocは丸ごと上書きなので、
   * ここで組み立てた形がそのままサーバのドキュメントになる。
   */
  const build = (shop: ShopCandidate, changes: Partial<ShopCandidate>): ShopCandidate => {
    const next: ShopCandidate = { ...shop, ...changes }
    if (!next.note) delete next.note
    if (!next.tel) delete next.tel
    if (!next.url) delete next.url
    if (!next.decided) delete next.decided
    if (!next.addedBy) delete next.addedBy
    return next
  }

  /** カードのURL欄を保存する。空のまま保存すればリンクを外せる */
  const saveUrl = (shop: ShopCandidate, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      onSave(build(shop, { url: undefined }))
      setUrlEditing(null)
      return
    }
    const url = normalizeUrl(trimmed)
    if (!url) {
      window.alert('URLが正しくないようです。https:// から始まるアドレスを貼ってください。')
      return
    }
    onSave(build(shop, { url }))
    setUrlEditing(null)
  }

  /** 同じ人がもう一度押すと票を取り消す */
  const toggleVote = (shop: ShopCandidate) => {
    const votes = shop.votes.includes(me)
      ? shop.votes.filter((v) => v !== me)
      : [...shop.votes, me]
    onSave(build(shop, { votes }))
  }

  const decidedShop = visible.find((shop) => shop.decided)

  return (
    <div className="shops">
      <nav className="shops__slots" aria-label="お店を決める枠">
        {SHOP_SLOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`shops__slot ${s.id === slot ? 'shops__slot--on' : ''}`}
            onClick={() => setSlot(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <p className="shops__hint">{slotInfo.hint}</p>

      <p className="shops__status">
        {decidedShop ? (
          <>
            決定：<strong>{decidedShop.name}</strong>
          </>
        ) : (
          `候補${visible.length}件・まだ決まっていません`
        )}
      </p>

      <ul className="shops__list">
        {visible.length === 0 && <li className="empty">この枠の候補はまだありません。</li>}

        {visible.map((shop) => {
          const voted = shop.votes.includes(me)
          return (
            <li key={shop.id} className={`shop ${shop.decided ? 'shop--decided' : ''}`}>
              <div className="shop__head">
                <span className="shop__name">{shop.name}</span>
                {shop.decided && <span className="shop__badge">ここにする</span>}
              </div>

              {shop.note && <p className="shop__note">{shop.note}</p>}

              {shop.addedBy && (
                <p className="shop__added">{personName(shop.addedBy)}さんが追加</p>
              )}

              <div className="shop__actions">
                <button
                  type="button"
                  className={`toggle ${voted ? 'toggle--on' : ''}`}
                  onClick={() => toggleVote(shop)}
                >
                  {voted ? '♥' : '♡'} ここがいい
                  {shop.votes.length > 0 && ` ${shop.votes.length}`}
                </button>

                {shop.tel && (
                  <a className="toggle shop__tel" href={telHref(shop.tel)}>
                    ☎ {shop.tel}
                  </a>
                )}

                {shop.url && (
                  <a
                    className="toggle shop__link"
                    href={shop.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    🔗 {urlLabel(shop.url)}
                  </a>
                )}

                <button
                  type="button"
                  className="toggle toggle--ghost"
                  onClick={() =>
                    setUrlEditing(
                      urlEditing?.id === shop.id
                        ? null
                        : { id: shop.id, text: shop.url ?? '' },
                    )
                  }
                >
                  {shop.url ? 'リンク編集' : '＋リンク'}
                </button>

                {me === OWNER_ID && (
                  <button
                    type="button"
                    className={`toggle ${shop.decided ? 'toggle--done' : 'toggle--ghost'}`}
                    onClick={() => onDecide(shop, visible)}
                  >
                    {shop.decided ? '決定を外す' : 'ここに決める'}
                  </button>
                )}

                <button
                  type="button"
                  className="shop__delete"
                  onClick={() => {
                    if (!window.confirm(`「${shop.name}」を候補から消します。よろしいですか？`)) {
                      return
                    }
                    onDelete(shop)
                    setDeleted(shop)
                  }}
                  aria-label="候補から削除"
                >
                  ×
                </button>
              </div>

              {urlEditing?.id === shop.id && (
                <div className="shop__url-edit">
                  <input
                    className="field__input"
                    type="url"
                    inputMode="url"
                    value={urlEditing.text}
                    placeholder="食べログ・公式サイト・地図のURLを貼る"
                    onChange={(e) => setUrlEditing({ id: shop.id, text: e.target.value })}
                  />
                  <div className="shop__url-actions">
                    <button
                      type="button"
                      className="toggle toggle--done"
                      onClick={() => saveUrl(shop, urlEditing.text)}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="toggle toggle--ghost"
                      onClick={() => setUrlEditing(null)}
                    >
                      やめる
                    </button>
                  </div>
                </div>
              )}

              {shop.votes.length > 0 && (
                <p className="shop__voters">
                  {shop.votes.map(personName).join('・')}が推し
                </p>
              )}
            </li>
          )
        })}
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

      <form className="shops__add" onSubmit={add}>
        <p className="shops__add-title">{slotInfo.label}に候補を足す</p>
        <input
          className="field__input"
          type="text"
          value={newName}
          placeholder="店名"
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="field__input"
          type="text"
          value={newNote}
          placeholder="メモ（駐車場・座敷・予算など／任意）"
          onChange={(e) => setNewNote(e.target.value)}
        />
        <input
          className="field__input"
          type="url"
          inputMode="url"
          value={newUrl}
          placeholder="URL（食べログ・公式サイト・地図／任意）"
          onChange={(e) => setNewUrl(e.target.value)}
        />
        <button type="submit" className="primary-btn primary-btn--sm" disabled={!newName.trim()}>
          候補に追加
        </button>
      </form>
    </div>
  )
}
