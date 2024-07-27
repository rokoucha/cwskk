import React from 'react'
import type {
  CandidateTemplate,
  CandidateWindowProperties,
  MenuItem,
} from '../skk/types'

export const Status: React.FC<{
  candidates: CandidateTemplate[]
  candidateWindowProperties: CandidateWindowProperties
  commit: string
  composition: string
  compositionCursor: number
  ctrlKey: boolean
  cursor: number
  keyText: string
  menuItems: MenuItem[]
  ready: boolean
  shiftKey: boolean
}> = ({
  candidates,
  candidateWindowProperties,
  commit,
  composition,
  compositionCursor,
  ctrlKey,
  cursor,
  keyText,
  menuItems,
  ready,
  shiftKey,
}) => (
  <div>
    <h2>Status</h2>
    <div>
      <label>
        is SKK ready?
        <input readOnly type="checkbox" checked={ready} />
      </label>
      <label style={{ marginLeft: '0.5rem' }}>
        ctrlKey?
        <input readOnly type="checkbox" checked={ctrlKey} />
      </label>
      <label style={{ marginLeft: '0.5rem' }}>
        shiftKey?
        <input readOnly type="checkbox" checked={shiftKey} />
      </label>
      <label style={{ marginLeft: '0.5rem' }}>
        key
        <input
          readOnly
          value={keyText === ' ' ? 'Space' : keyText}
          size={8}
          style={{ marginLeft: '0.2rem' }}
        />
      </label>
      <label style={{ marginLeft: '0.5rem' }}>
        cursor position
        <input
          readOnly
          value={cursor}
          size={2}
          style={{ marginLeft: '0.2rem' }}
        />
      </label>
      <label style={{ marginLeft: '0.5rem' }}>
        committed text
        <input readOnly value={commit} style={{ marginLeft: '0.2rem' }} />
      </label>
      <label style={{ marginLeft: '0.5rem' }}>
        composition cursor position
        <input
          readOnly
          value={compositionCursor}
          size={2}
          style={{ marginLeft: '0.2rem' }}
        />
      </label>
      <label style={{ marginLeft: '0.5rem' }}>
        composition text
        <input readOnly value={composition} style={{ marginLeft: '0.2rem' }} />
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
)
