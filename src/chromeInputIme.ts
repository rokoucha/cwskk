export type CandidateTemplate = chrome.input.ime.CandidateTemplate

export const clearComposition = (
  parameters: chrome.input.ime.ClearCompositionParameters,
) =>
  new Promise<boolean>((resolve) =>
    chrome.input.ime.clearComposition(parameters, (success) =>
      resolve(success),
    ),
  )

export const commitText = (parameters: chrome.input.ime.CommitTextParameters) =>
  new Promise<boolean>((resolve) =>
    chrome.input.ime.commitText(parameters, (success) => resolve(success)),
  )

export const deleteSurroundingText = (
  parameters: chrome.input.ime.DeleteSurroundingTextParameters,
) =>
  new Promise<void>((resolve) =>
    chrome.input.ime.deleteSurroundingText(parameters, () => resolve()),
  )

export const hideInputView = () => chrome.input.ime.hideInputView()

export const keyEventHandled = (requestId: string, response: boolean) =>
  chrome.input.ime.keyEventHandled(requestId, response)

export const sendKeyEvents = (
  parameters: chrome.input.ime.SendKeyEventParameters,
) =>
  new Promise<void>((resolve) =>
    chrome.input.ime.sendKeyEvents(parameters, () => resolve()),
  )

export const setAssistiveWindowButtonHighlighted = (parameters: {
  contextID: number
  buttonID: chrome.input.ime.AssistiveWindowButton
  windowType: 'undo'
  announceString?: string | undefined
  highlighted: boolean
}) =>
  new Promise<void>((resolve) =>
    chrome.input.ime.setAssistiveWindowButtonHighlighted(parameters, () =>
      resolve(),
    ),
  )

export const setAssistiveWindowProperties = (parameters: {
  contextID: number
  properties: chrome.input.ime.AssistiveWindowProperties
}) =>
  new Promise<boolean>((resolve) =>
    chrome.input.ime.setAssistiveWindowProperties(parameters, (success) =>
      resolve(success),
    ),
  )

export const setCandidates = (
  parameters: chrome.input.ime.CandidatesParameters,
) =>
  new Promise<boolean>((resolve) =>
    chrome.input.ime.setCandidates(parameters, (success) => resolve(success)),
  )

export const setCandidateWindowProperties = (
  parameters: chrome.input.ime.CandidateWindowParameter,
) =>
  new Promise<boolean>((resolve) =>
    chrome.input.ime.setCandidateWindowProperties(parameters, (success) =>
      resolve(success),
    ),
  )

export const setComposition = (
  parameters: chrome.input.ime.CompositionParameters,
) =>
  new Promise<boolean>((resolve) =>
    chrome.input.ime.setComposition(parameters, (success) => resolve(success)),
  )

export const setCursorPosition = (
  parameters: chrome.input.ime.CursorPositionParameters,
) =>
  new Promise<boolean>((resolve) =>
    chrome.input.ime.setCursorPosition(parameters, (success) =>
      resolve(success),
    ),
  )

export const setMenuItems = (parameters: chrome.input.ime.ImeParameters) =>
  new Promise<void>((resolve) =>
    chrome.input.ime.setMenuItems(parameters, () => resolve()),
  )

export const updateMenuItems = (
  parameters: chrome.input.ime.MenuItemParameters,
) =>
  new Promise<void>((resolve) =>
    chrome.input.ime.updateMenuItems(parameters, () => resolve()),
  )

export const onActive = chrome.input.ime.onActivate

export const onAssistiveWindowButtonClicked =
  chrome.input.ime.onAssistiveWindowButtonClicked

export const onBlur = chrome.input.ime.onBlur

export const onCandidateClicked = chrome.input.ime.onCandidateClicked

export const onDeactivated = chrome.input.ime.onDeactivated

export const onFocus = chrome.input.ime.onFocus

export const onInputContextUpdate = chrome.input.ime.onInputContextUpdate

export const onKeyEvent = chrome.input.ime.onKeyEvent

export const onMenuItemActivated = chrome.input.ime.onMenuItemActivated

export const onReset = chrome.input.ime.onReset

export const onSurroundingTextChanged =
  chrome.input.ime.onSurroundingTextChanged
