import React from 'react'
import { slice } from '../../utils/string'

const Cursor: React.FC = () => (
  <span
    style={{
      borderRight: '1px solid black',
    }}
  />
)

export const Textbox: React.FC<{
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
        {commits.map((t, i) =>
          t !== true ? (
            t
          ) : compositions.length === 0 ? (
            <Cursor key="cursor" />
          ) : (
            <span key={i}>
              {compositions.map((c) =>
                c !== true ? c : <Cursor key="compositionCursor" />,
              )}
            </span>
          ),
        )}
      </span>
    </div>
  )
}
