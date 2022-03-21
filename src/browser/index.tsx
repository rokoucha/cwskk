import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { SKK, SKKIMEEvent, SKKIMEEventHandler, SKKIMEEvents } from '../skk'
import type {
  CandidateTemplate,
  CandidateWindowProperties,
  MenuItem,
} from '../types'
import { Status } from './status'
import { Textbox } from './textbox'

export const App: React.VFC = () => {
  const [ready, setReady] = useState(false)

  const [ctrlKey, setCtrlKey] = useState(false)
  const [shiftKey, setShiftKey] = useState(false)
  const [keyText, setKeyText] = useState('')

  const [commit, setCommit] = useState('')
  const [composition, setComposition] = useState('')
  const [cursor, setCursor] = useState(0)

  const [candidates, setCandidates] = useState<CandidateTemplate[]>([])
  const [candidateWindowProperties, setCandidateWindowProperties] =
    useState<CandidateWindowProperties>({
      visible: false,
    })

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  const skk = useMemo(() => new SKK(), [])

  const clearCompositionHandler: SKKIMEEventHandler<'clearComposition'> =
    useCallback(() => {
      console.log('clear', cursor, commit)
      setCursor((prev) =>
        commit.length <= prev ? prev - composition.length : prev,
      )
      setComposition('')
    }, [cursor, commit, composition])

  const commitTextHandler: SKKIMEEventHandler<'commitText'> = useCallback(
    ({ detail: { text } }) => {
      console.log('commit received', commit, text, cursor)
      setCommit((prev) => prev.slice(0, cursor) + text + prev.slice(cursor))
      setCursor((prev) => prev + text.length)
    },
    [commit, cursor],
  )

  const setCandidatesHandler: SKKIMEEventHandler<'setCandidates'> = useCallback(
    ({ detail: { candidates } }) => setCandidates(candidates),
    [],
  )

  const setCandidateWindowPropertiesHandler: SKKIMEEventHandler<'setCandidateWindowProperties'> =
    useCallback(
      ({ detail: properties }) =>
        setCandidateWindowProperties((prev) => ({
          currentCandidateIndex:
            properties.currentCandidateIndex ?? prev.currentCandidateIndex,
          cursorVisible: properties.cursorVisible ?? prev.cursorVisible,
          pageSize: properties.pageSize ?? prev.pageSize,
          totalCandidates: properties.totalCandidates ?? prev.totalCandidates,
          vertical: properties.vertical ?? prev.vertical,
          visible: properties.visible ?? prev.visible,
        })),
      [],
    )

  const setCompositionHandler: SKKIMEEventHandler<'setComposition'> =
    useCallback(
      ({ detail: { text, cursor } }) => {
        console.log('composition received', commit, text, cursor)
        setComposition(text)
        setCursor((prev) => (prev < cursor ? commit.length + cursor : prev))
      },
      [commit],
    )

  const setMenuItemsHandler: SKKIMEEventHandler<'setMenuItems'> = useCallback(
    ({ detail: { items } }) => {
      setMenuItems(items)
    },
    [],
  )

  const updateMenuItemsHandler: SKKIMEEventHandler<'updateMenuItems'> =
    useCallback(({ detail: { items } }) => {
      setMenuItems((prev) => {
        for (const item of items) {
          const i = prev.findIndex((p) => p.id === item.id)
          if (i === -1) continue
          prev[i] = { ...prev[i], ...item }
        }

        return prev
      })
    }, [])

  useEffect(() => {
    setTimeout(() => {
      skk.addEventListener('clearComposition', clearCompositionHandler)
      skk.addEventListener('commitText', commitTextHandler)
      skk.addEventListener('setCandidates', setCandidatesHandler)
      skk.addEventListener(
        'setCandidateWindowProperties',
        setCandidateWindowPropertiesHandler,
      )
      skk.addEventListener('setComposition', setCompositionHandler)
      skk.addEventListener('setMenuItems', setMenuItemsHandler)
      skk.addEventListener('updateMenuItems', updateMenuItemsHandler)
    })

    return () => {
      setTimeout(() => {
        skk.removeEventListener('clearComposition', clearCompositionHandler)
        skk.removeEventListener('commitText', commitTextHandler)
        skk.removeEventListener('setCandidates', setCandidatesHandler)
        skk.removeEventListener(
          'setCandidateWindowProperties',
          setCandidateWindowPropertiesHandler,
        )
        skk.removeEventListener('setComposition', setCompositionHandler)
        skk.removeEventListener('setMenuItems', setMenuItemsHandler)
        skk.removeEventListener('updateMenuItems', updateMenuItemsHandler)
      })
    }
  }, [
    skk,
    clearCompositionHandler,
    commitTextHandler,
    setCandidatesHandler,
    setCandidateWindowPropertiesHandler,
    setCompositionHandler,
    setMenuItemsHandler,
    updateMenuItemsHandler,
  ])

  useEffect(() => {
    if (!ready) {
      skk.setup().then(() => setReady(true))
    }
  }, [skk, ready])

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
        setCursor((prev) => prev - 1)
      }

      if (e.key === 'ArrowLeft') {
        setCursor((prev) => (prev > 0 ? prev - 1 : 0))
      }
      if (e.key === 'ArrowRight') {
        setCursor((prev) => prev + 1)
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
        <Textbox commit={commit} composition={composition} cursor={cursor} />
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
        ready={ready}
        shiftKey={shiftKey}
      />
    </>
  )
}
