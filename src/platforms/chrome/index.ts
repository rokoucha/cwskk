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
import type { SKK } from '../../skk'
import type { SKKContainer, SKKContainerConstructor } from '../../types'

export const ChromeSKKContainer: SKKContainerConstructor = class ChromeSKKContainer
  implements SKKContainer
{
  skk: SKK
  engineId: string
  contextId: number

  constructor(skk: typeof SKK) {
    this.engineId = ''
    this.contextId = -1

    this.skk = new skk()

    this.skk.addEventListener('clearComposition', async () => {
      await clearComposition({ contextID: this.contextId })
    })

    this.skk.addEventListener('commitText', async ({ detail: { text } }) => {
      await commitText({ contextID: this.contextId, text })
    })

    this.skk.addEventListener(
      'setCandidates',
      async ({ detail: { candidates } }) => {
        await setCandidates({ contextID: this.contextId, candidates })
      },
    )

    this.skk.addEventListener(
      'setCandidateWindowProperties',
      async ({ detail: properties }) => {
        await setCandidateWindowProperties({
          engineID: this.engineId,
          properties,
        })
      },
    )

    this.skk.addEventListener(
      'setComposition',
      async ({ detail: { text, cursor, properties } }) => {
        await setComposition({
          contextID: this.contextId,
          text,
          cursor,
          ...properties,
        })
      },
    )

    this.skk.addEventListener('setMenuItems', async ({ detail: { items } }) => {
      await setMenuItems({ engineID: this.engineId, items })
    })

    this.skk.addEventListener(
      'updateMenuItems',
      async ({ detail: { items } }) => {
        await updateMenuItems({ engineID: this.engineId, items })
      },
    )

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
