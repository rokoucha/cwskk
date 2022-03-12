import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { SKK } from '../skk'
import { CandidateTemplate, MenuItem } from '../types'

export const App: React.VFC = () => {
  const [commit, setCommit] = useState('')
  const [composition, setComposition] = useState('')
  const [ready, setReady] = useState(false)

  const skk = useMemo(
    () =>
      new SKK({
        clearComposition: async (): Promise<void> => setComposition(''),

        commitText: async (text: string): Promise<void> =>
          setCommit((prev) => prev + text),

        setCandidates: async (
          candidates: CandidateTemplate[],
        ): Promise<void> => {},

        setCandidateWindowProperties: async (properties: {
          currentCandidateIndex?: number
          cursorVisible?: boolean
          pageSize?: number
          totalCandidates?: number
          vertical?: boolean
          visible?: boolean
        }): Promise<void> => {},

        setComposition: async (
          text: string,
          cursor: number,
          properties?: {
            selectionStart?: number | undefined
            selectionEnd?: number | undefined
          },
        ): Promise<void> => setComposition(text),

        setMenuItems: async (items: MenuItem[]): Promise<void> => {},

        updateMenuItems: async (items: MenuItem[]): Promise<void> => {},
      }),
    [],
  )

  const onKeyEvent = useCallback(
    async (e: KeyboardEvent) => {
      if (!ready) return

      const handled = await skk.onKeyEvent(e)

      if (handled || e.type !== 'keydown') return

      if (e.key === 'Backspace') {
        setCommit((prev) => prev.slice(0, -1))
      }
    },
    [ready],
  )

  useEffect(() => {
    document.addEventListener('keyup', onKeyEvent)
    document.addEventListener('keydown', onKeyEvent)
  }, [onKeyEvent])

  useEffect(() => {
    skk.setup().then(() => setReady(true))
  }, [])

  return (
    <>
      <h1>chrome.input.ime testpage</h1>
      {ready ? (
        <div style={{ border: 'thin solid', height: '1.5rem', width: '100%' }}>
          {commit}
          {composition}|
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </>
  )
}
