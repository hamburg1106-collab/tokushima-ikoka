/** 参加者ID（行程表の6人） */
export type PersonId = 'riki' | 'asa' | 'toshi' | 'ri' | 'shu' | 'isamu'

export type Person = {
  id: PersonId
  /** 行程表の略字（表示名） */
  name: string
  /** ログインして自分として使えるか（柊は2歳なのでfalse） */
  canLogin: boolean
}

/** 予定の種別（Q22で決めた5種） */
export type ItemKind = 'move' | 'stay' | 'meal' | 'sight' | 'other'

/** 種別ごとの追加項目 */
export type MoveDetail = {
  flightNo?: string
  reservationNo?: string
  from?: string
  to?: string
  /** 到着時刻 'HH:mm' */
  arriveTime?: string
}

export type StayDetail = {
  checkIn?: string
  checkOut?: string
  address?: string
  tel?: string
}

export type MealDetail = {
  shop?: string
  reserved?: boolean
  budget?: string
}

export type SightDetail = {
  hours?: string
  fee?: string
  /** 所要時間 */
  duration?: string
}

/** チェックイン（「済」）。予定本体とは別コレクションに置き、編集で消えないようにする */
export type Checkin = {
  itemId: string
  by: PersonId
  /** ISO文字列 */
  at: string
}

export type TimelineItem = {
  id: string
  /** 1日目=1, 2日目=2, 3日目=3 */
  day: 1 | 2 | 3
  /** 'YYYY-MM-DD' */
  date: string
  /** 'HH:mm' */
  time: string
  /** 時刻が未定で仮置きしている場合true */
  timeTbd?: boolean
  title: string
  kind: ItemKind
  place?: string
  note?: string
  participants: PersonId[]
  move?: MoveDetail
  stay?: StayDetail
  meal?: MealDetail
  sight?: SightDetail
}
