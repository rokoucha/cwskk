import React, { useEffect } from 'react'
import { slice } from '../utils'

const Cursor: React.VFC = () => (
  <span
    style={{
      borderRight: '1px solid black',
    }}
  />
)

export const Textbox: React.VFC<{
  commit: string
  composition: string
  compositionCursor: number
  cursor: number
}> = ({ commit, composition, compositionCursor, cursor }) => {
  const commits: (string | true)[] = []
  const compositions: (string | true)[] = []

  commits.push(
    ...[slice(commit, 0, cursor), true as const, slice(commit, cursor)].filter(
      (t) => t !== '',
    ),
  )

  if (composition !== '') {
    compositions.push(
      ...[
        slice(composition, 0, compositionCursor),
        true as const,
        slice(composition, compositionCursor),
      ].filter((t) => t !== ''),
    )
  }

  return (
    <div
      style={{
        border: 'thin solid',
        boxSizing: 'border-box',
        cursor: 'text',
        padding: '0.1rem',
        height: '1.8rem',
        width: '100%',
      }}
    >
      <span>
        {commits.map((t) =>
          t !== true ? (
            t
          ) : compositions.length === 0 ? (
            <Cursor />
          ) : (
            <span>
              {compositions.map((c) => (c !== true ? c : <Cursor />))}
            </span>
          ),
        )}
      </span>
    </div>
  )
}
