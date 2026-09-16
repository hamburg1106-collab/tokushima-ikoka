import type { Person, PersonId } from '../types'

/** 行程表の6列と同じ順番 */
export const PEOPLE: Person[] = [
  { id: 'riki', name: '力', canLogin: true },
  { id: 'asa', name: '麻', canLogin: true },
  { id: 'toshi', name: '敏', canLogin: true },
  { id: 'ri', name: '理', canLogin: true },
  { id: 'shu', name: '柊', canLogin: false }, // 2歳・スマホなし
  { id: 'isamu', name: '勇', canLogin: true },
]

export const ALL_IDS: PersonId[] = PEOPLE.map((p) => p.id)

/** 勇は10/30朝に合流するので、10/29は5人 */
export const WITHOUT_ISAMU: PersonId[] = ALL_IDS.filter((id) => id !== 'isamu')

export const personName = (id: PersonId): string =>
  PEOPLE.find((p) => p.id === id)?.name ?? id

export const LOGINABLE = PEOPLE.filter((p) => p.canLogin)

/** 幹事（このアプリの作者）。「初期状態に戻す」など管理操作はこの人にだけ出す */
export const OWNER_ID: PersonId = 'toshi'
