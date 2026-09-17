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

/** 持ち物。共有リスト1本で、各項目に担当者を付ける（Q19） */
export type PackingItem = {
  id: string
  name: string
  /** 担当者。複数人で分担できる。空配列なら未定 */
  assignees: PersonId[]
  /**
   * 旧形式（担当1人）。配布済みの端末やサーバに残っているので読み込み時に変換する。
   * 新しく保存するときは書かない。
   */
  assignee?: PersonId | null
  checked: boolean
  /** チェックを付けた人 */
  checkedBy?: PersonId
  /** 並び順 */
  order: number
}

/** お店候補をぶら下げる枠。店未定の食事予定のidをそのまま使う */
export type ShopSlotId = 'd1-lunch' | 'd1-dinner'

/**
 * お店候補（Q「店未定の枠をみんなで決める」）。
 * 参加者は追加・投票ができ、決定を付けられるのは幹事だけ。
 */
export type ShopCandidate = {
  id: string
  slot: ShopSlotId
  name: string
  /** アクセス・駐車場・予算などの一言メモ */
  note?: string
  tel?: string
  /** 公式サイトや地図のURL。http(s)のみ受け付ける */
  url?: string
  /** 「ここがいい」を押した人。空配列なら誰も押していない */
  votes: PersonId[]
  /** 幹事が決めた1件。枠の中で1件だけ true になる */
  decided?: boolean
  /** アプリ上で追加した人。最初から入っている候補には無い */
  addedBy?: PersonId
  /** 並び順 */
  order: number
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
