import {
  clearComposition,
  commitText,
  onActive,
  onBlur,
  onCandidateClicked,
  onFocus,
  onKeyEvent,
  onMenuItemActivated,
  setCandidates,
  setCandidateWindowProperties,
  setComposition,
  setMenuItems,
  updateMenuItems,
} from './chromeInputIme'
import type { SKK } from '../skk'
import type {
  CandidateTemplate,
  MenuItem,
  SKKContainer,
  SKKContainerConstructor,
} from '../types'

export const ChromeSKKContainer: SKKContainerConstructor = class ChromeSKKContainer
  implements SKKContainer
{
  skk: SKK
  engineId: string
  contextId: number

  constructor(skk: typeof SKK) {
    this.engineId = ''
    this.contextId = -1

    this.skk = new skk({
      clearComposition: async (): Promise<void> => {
        await clearComposition({ contextID: this.contextId })
      },

      commitText: async (text: string): Promise<void> => {
        await commitText({ contextID: this.contextId, text })
      },

      setCandidates: async (candidates: CandidateTemplate[]): Promise<void> => {
        await setCandidates({ contextID: this.contextId, candidates })
      },

      setCandidateWindowProperties: async (properties: {
        currentCandidateIndex?: number
        cursorVisible?: boolean
        pageSize?: number
        totalCandidates?: number
        vertical?: boolean
        visible?: boolean
      }): Promise<void> => {
        await setCandidateWindowProperties({
          engineID: this.engineId,
          properties,
        })
      },

      setComposition: async (
        text: string,
        cursor: number,
        properties?: {
          selectionStart?: number | undefined
          selectionEnd?: number | undefined
        },
      ): Promise<void> => {
        await setComposition({
          contextID: this.contextId,
          text,
          cursor,
          ...properties,
        })
      },

      setMenuItems: async (items: MenuItem[]): Promise<void> => {
        await setMenuItems({ engineID: this.engineId, items })
      },

      updateMenuItems: async (items: MenuItem[]): Promise<void> => {
        await updateMenuItems({ engineID: this.engineId, items })
      },
    })

    onActive.addListener(async (engineID) => {
      this.engineId = engineID

      await this.skk.setup()
    })

    onFocus.addListener((ctx) => {
      this.contextId = ctx.contextID
    })

    onBlur.addListener((contextID) => {
      this.contextId = contextID
    })

    onCandidateClicked.addListener(
      async (_engineID: string, candidateID: number, _button: string) => {
        await this.skk.onCandidateSelected(candidateID - 1)
      },
    )

    onKeyEvent.addListener(async (_engineID, keyData) => {
      await this.skk.onKeyEvent(keyData as KeyboardEvent)
    })

    onMenuItemActivated.addListener(async (_engineID, name) => {
      await this.skk.onMenuActivated(name)
    })
  }
}
