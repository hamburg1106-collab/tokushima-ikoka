/**
 * 日付の文字列パースは Safari で挙動が割れるため、
 * new Date(string) を使わず数値から組み立てる。
 * （利用者5人がiPhone＝Safari なのでここは自前で持つ）
 */
export const toDate = (date: string, time: string): Date => {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

/** 'YYYY-MM-DD' を返す（ローカル時刻基準） */
export const toDateKey = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 出発日まであと何日か（当日以降は0以下） */
export const daysUntil = (targetDate: string, now: Date): number => {
  const [y, m, d] = targetDate.split('-').map(Number)
  const target = new Date(y, m - 1, d).getTime()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - today) / 86_400_000)
}
