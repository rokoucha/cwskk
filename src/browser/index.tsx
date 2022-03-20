import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { SKK } from '../skk'
import type {
  CandidateTemplate,
  CandidateWindowProperties,
  MenuItem,
} from '../types'
import { Status } from './status'
import { Textbox } from './textbox'
import { useSKK } from './useSKK'

export const App: React.VFC = () => {
  const [skk, setSKK] = useState<SKK | null>(null)

  const [ctrlKey, setCtrlKey] = useState(false)
  const [shiftKey, setShiftKey] = useState(false)
  const [keyText, setKeyText] = useState('')

  const [commit, setCommit] = useState('')
  const [composition, setComposition] = useState('')

  const [candidates, setCandidates] = useState<CandidateTemplate[]>([])
  const [candidateWindowProperties, setCandidateWindowProperties] =
    useState<CandidateWindowProperties>({
      visible: false,
    })

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  const [stateSKK, setupSKK] = useSKK({
    clearComposition: async (): Promise<void> => setComposition(''),

    commitText: async (text: string): Promise<void> =>
      setCommit((prev) => prev + text),

    setCandidates: async (candidates: CandidateTemplate[]): Promise<void> =>
      setCandidates(candidates),

    setCandidateWindowProperties: async (properties: {
      currentCandidateIndex?: number
      cursorVisible?: boolean
      pageSize?: number
      totalCandidates?: number
      vertical?: boolean
      visible?: boolean
    }): Promise<void> =>
      setCandidateWindowProperties((prev) => ({
        currentCandidateIndex:
          properties.currentCandidateIndex ?? prev.currentCandidateIndex,
        cursorVisible: properties.cursorVisible ?? prev.cursorVisible,
        pageSize: properties.pageSize ?? prev.pageSize,
        totalCandidates: properties.totalCandidates ?? prev.totalCandidates,
        vertical: properties.vertical ?? prev.vertical,
        visible: properties.visible ?? prev.visible,
      })),

    setComposition: async (
      text: string,
      cursor: number,
      properties?: {
        selectionStart?: number | undefined
        selectionEnd?: number | undefined
      },
    ): Promise<void> => setComposition(text),

    setMenuItems: async (items: MenuItem[]): Promise<void> => {
      setMenuItems(items)
    },

    updateMenuItems: async (items: MenuItem[]): Promise<void> => {
      setMenuItems((prev) => {
        for (const item of items) {
          const i = prev.findIndex((p) => p.id === item.id)
          if (i === -1) continue
          prev[i] = { ...prev[i], ...item }
        }

        return prev
      })
    },
  })

  useEffect(() => {
    if (stateSKK === 'not-ready') {
      setupSKK().then((skk) => setSKK(skk))
    }
  }, [skk, setupSKK])

  const onKeyEvent = useCallback(
    async (e: KeyboardEvent) => {
      if (!skk) return

      e.preventDefault()

      setCtrlKey(e.ctrlKey)
      setShiftKey(e.shiftKey)
      setKeyText(e.key)

      const handled = await skk.onKeyEvent(e)

      if (handled || e.type !== 'keydown') return

      if (e.key === 'Backspace') {
        setCommit((prev) => prev.slice(0, -1))
      }
    },
    [skk],
  )

  useEffect(() => {
    document.addEventListener('keyup', onKeyEvent)
    document.addEventListener('keydown', onKeyEvent)

    return () => {
      document.removeEventListener('keyup', onKeyEvent)
      document.removeEventListener('keydown', onKeyEvent)
    }
  }, [onKeyEvent])

  return (
    <>
      <h1>CWSKK Testpage</h1>
      {skk ? (
        <Textbox commit={commit} composition={composition} />
      ) : (
        <p>Loading...</p>
      )}
      <hr />
      <Status
        candidates={candidates}
        candidateWindowProperties={candidateWindowProperties}
        commit={commit}
        composition={composition}
        ctrlKey={ctrlKey}
        keyText={keyText}
        menuItems={menuItems}
        ready={stateSKK === 'ready'}
        shiftKey={shiftKey}
      />
    </>
  )
}
