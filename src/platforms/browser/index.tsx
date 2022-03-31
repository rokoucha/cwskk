import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { DictionaryEngine } from '../../dictionary'
import { SKKJisyo } from '../../dictionary/providers/skk_jisyo'
import { UserJisyo } from '../../dictionary/providers/user'
import { SKK, SKKIMEEventHandler } from '../../skk'
import type {
  CandidateTemplate,
  CandidateWindowProperties,
  MenuItem,
} from '../../types'
import { slice } from '../../utils/string'
import { Status } from './status'
import { Textbox } from './textbox'

export const App: React.VFC = () => {
  const [ready, setReady] = useState(false)

  const [ctrlKey, setCtrlKey] = useState(false)
  const [shiftKey, setShiftKey] = useState(false)
  const [keyText, setKeyText] = useState('')

  const [commit, setCommit] = useState('')
  const [composition, setComposition] = useState('')
  const [compositionCursor, setCompositionCursor] = useState(0)
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
      setComposition('')
      setCompositionCursor(0)
    }, [])

  const commitTextHandler: SKKIMEEventHandler<'commitText'> = useCallback(
    ({ detail: { text } }) => {
      setCommit((prev) => slice(prev, 0, cursor) + text + slice(prev, cursor))
      setCursor((prev) => prev + text.length)
    },
    [cursor],
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
    useCallback(({ detail: { text, cursor } }) => {
      setComposition(text)
      setCompositionCursor(cursor)
    }, [])

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

      setCtrlKey(e.ctrlKey)
      setShiftKey(e.shiftKey)
      setKeyText(e.key)

      let handled = await skk.onKeyEvent(e)

      if (handled || e.type !== 'keydown') {
        e.preventDefault()

        return
      }

      switch (e.key) {
        case 'Backspace': {
          e.preventDefault()

          setCommit((prev) => slice(prev, 0, cursor - 1) + slice(prev, cursor))
          setCursor((prev) => (0 < prev ? prev - 1 : 0))

          break
        }

        case 'Delete': {
          e.preventDefault()

          setCommit((prev) => slice(prev, 0, cursor) + slice(prev, cursor + 1))

          break
        }

        case 'ArrowLeft': {
          e.preventDefault()

          setCursor((prev) => (prev > 0 ? prev - 1 : 0))

          break
        }

        case 'ArrowRight': {
          e.preventDefault()

          setCursor((prev) => prev + 1)

          break
        }
      }
    },
    [commit, cursor, skk],
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
        <Textbox
          commit={commit}
          composition={composition}
          compositionCursor={compositionCursor}
          cursor={cursor}
        />
      ) : (
        <p>Loading...</p>
      )}
      <hr />
      <Status
        candidates={candidates}
        candidateWindowProperties={candidateWindowProperties}
        commit={commit}
        composition={composition}
        compositionCursor={compositionCursor}
        ctrlKey={ctrlKey}
        cursor={cursor}
        keyText={keyText}
        menuItems={menuItems}
        ready={ready}
        shiftKey={shiftKey}
      />
    </>
  )
}
