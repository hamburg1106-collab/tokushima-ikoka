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

  /**
   * ここでの確認は打ち間違いを早く知らせるためのおまけ。
   * 「違う」と確定したときだけ止める。確認できなかった場合は通す。
   * 通信の調子でログインできなくなる方が、はるかに困るため。
   * 合言葉が違ったままアプリに入っても、中で気づいて入れ直せる。
   */
  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setChecking(true)
    setError(null)
    const result = await verifyCode(trimmed)
    setChecking(false)
    if (result.status === 'ng') {
      setError('合言葉が違うようです。大文字・小文字もそのまま入れてください。')
      return
    }
    setCode(trimmed)
    setVerified(true)
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
            {checking ? '確認中…' : '次へ'}
          </button>
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
