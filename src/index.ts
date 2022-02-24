import {
  onActive,
  onBlur,
  onCandidateClicked,
  onFocus,
  onKeyEvent,
  onMenuItemActivated,
  setMenuItems,
} from './chromeInputIme'
import { SKK } from './skk'

let skk: SKK

onActive.addListener(async (engineID) => {
  skk = new SKK(engineID)

  const items = skk.getMenuItems()

  await setMenuItems({ engineID, items })
})

onFocus.addListener((ctx) => {
  skk.setContextID(ctx.contextID)
})

onBlur.addListener((contextID) => {
  skk.setContextID(contextID)
})

onCandidateClicked.addListener(
  async (_engineID: string, candidateID: number, _button: string) => {
    return await skk.onCandidateClicked(candidateID)
  },
)

onKeyEvent.addListener(async (_engineID, e) => {
  return await skk.onKeyEvent(e)
})

onMenuItemActivated.addListener((_engineID, name) => {
  return skk.onMenuActivated(name)
})
