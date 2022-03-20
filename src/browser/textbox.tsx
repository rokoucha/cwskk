import React from 'react'

export const Textbox: React.VFC<{
  commit: string
  composition: string
}> = ({ commit, composition }) => (
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
)
