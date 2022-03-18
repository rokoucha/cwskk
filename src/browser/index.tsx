import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { SKK } from '../skk'
import type { CandidateTemplate, MenuItem } from '../types'

type CandidateWindowProperties = {
  currentCandidateIndex?: number
  cursorVisible?: boolean
  pageSize?: number
  totalCandidates?: number
  vertical?: boolean
  visible?: boolean
}

export const App: React.VFC = () => {
  const [ready, setReady] = useState(false)

  const [commit, setCommit] = useState('')
  const [composition, setComposition] = useState('')

  const [candidates, setCandidates] = useState<CandidateTemplate[]>([])
  const [candidateWindowProperties, setCandidateWindowProperties] =
    useState<CandidateWindowProperties>({
      visible: false,
    })

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  const skk = useMemo(
    () =>
      new SKK({
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
        <div
          style={{
            border: 'thin solid',
            boxSizing: 'border-box',
            padding: '0.1rem',
            height: '1.8rem',
            width: '100%',
          }}
        >
          <span
            style={{
              borderRight: '1px solid black',
              paddingRight: '1px',
            }}
          >
            {commit}
            {composition}
          </span>
        </div>
      ) : (
        <p>Loading...</p>
      )}
      <hr />
      <div>
        <h2>Status</h2>
        <div>
          <label>
            is SKK ready?
            <input readOnly type="checkbox" checked={ready} />
          </label>
          <label>
            committed text
            <input readOnly value={commit} />
          </label>
          <label>
            composition text
            <input readOnly value={composition} />
          </label>
        </div>
        <div>
          <h2>IME Menu</h2>
          <ul>
            {menuItems.map((item, index) => (
              <li key={index}>
                <pre>{JSON.stringify(item)}</pre>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Candidate window properties</h2>
          <pre>{JSON.stringify(candidateWindowProperties)}</pre>
        </div>
        <div>
          <h2>Candidates</h2>
          {candidateWindowProperties.visible ? (
            <ul>
              {candidates.map((candidate, index) => (
                <li key={index}>
                  <pre>{JSON.stringify(candidate)}</pre>
                </li>
              ))}
            </ul>
          ) : (
            <ul></ul>
          )}
        </div>
      </div>
    </>
  )
}
