import { useState } from 'react'
import { LOGINABLE } from '../data/people'
import type { PersonId } from '../types'
import { verifyCode } from '../lib/tripStore'

type Props = {
  /** 合言葉は済んでいて「あなたは誰？」だけ聞きたい場合に渡す */
  initialCode?: string | null
  onDone: (code: string, me: PersonId) => void
}

export default function Gate({ initialCode, onDone }: Props) {
  const [code, setCode] = useState(initialCode ?? '')
  const [verified, setVerified] = useState(Boolean(initialCode))
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** 確認できなかったときだけ「このまま進む」を出す */
  const [canSkip, setCanSkip] = useState(false)

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setChecking(true)
    setError(null)
    setCanSkip(false)
    const result = await verifyCode(trimmed)
    setChecking(false)
    if (result.status === 'ok') {
      setCode(trimmed)
      setVerified(true)
    } else if (result.status === 'ng') {
      setError('合言葉が違うようです。大文字・小文字もそのまま入れてください。')
    } else {
      // 合言葉が合っているのに入れない、を起こさないため進ませる
      setError(`今は確認できませんでした（${result.detail}）。そのまま進めます。`)
      setCanSkip(true)
    }
  }

  return (
    <div className="gate">
      <h1 className="gate__title">徳島いこか</h1>
      <p className="gate__lead">10/29（木）〜10/31（土）鳴門</p>

      {!verified ? (
        <form className="gate__box" onSubmit={submitCode}>
          <label className="gate__label" htmlFor="code">
            合言葉
          </label>
          <input
            id="code"
            className="gate__input"
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="LINEで送られた合言葉"
          />
          {error && <p className="gate__error">{error}</p>}
          <button className="primary-btn" type="submit" disabled={checking || !code.trim()}>
            {checking ? '確認中…' : canSkip ? 'もう一度ためす' : '次へ'}
          </button>
          {canSkip && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setCode(code.trim())
                setVerified(true)
              }}
            >
              このまま進む
            </button>
          )}
        </form>
      ) : (
        <div className="gate__box">
          <p className="gate__label">あなたは誰ですか？</p>
          <div className="gate__people">
            {LOGINABLE.map((p) => (
              <button
                key={p.id}
                type="button"
                className="person-btn"
                onClick={() => onDone(code.trim(), p.id as PersonId)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="gate__hint">あとから変更できます。</p>
        </div>
      )}
    </div>
  )
}
