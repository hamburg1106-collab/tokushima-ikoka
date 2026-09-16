import { useEffect, useState } from 'react'

/**
 * オンラインかどうか。
 * navigator.onLine は「電波があるか」までは分からないが、
 * 機内モードや圏外の判定には十分使える。
 */
export const useOnline = (): boolean => {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
