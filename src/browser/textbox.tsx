import React, { useEffect } from 'react'

export const Textbox: React.VFC<{
  commit: string
  composition: string
  cursor: number
}> = ({ commit, composition, cursor }) => {
  const commits: (string | true)[] = []
  const compositons: (string | true)[] = []

  if (cursor < commit.length) {
    commits.push(commit.slice(0, cursor))
    commits.push(true)
    commits.push(commit.slice(cursor))
  } else {
    commits.push(commit)
  }

  if (cursor === commit.length && composition.length === 0) {
    commits.push(true)
  }

  if (commit.length < cursor && cursor - commit.length < composition.length) {
    compositons.push(composition.slice(0, cursor - commit.length))
    compositons.push(true)
    compositons.push(composition.slice(cursor - commit.length))
  } else {
    compositons.push(composition)
  }

  if (
    commit.length < cursor &&
    commit.length + composition.length <= cursor &&
    composition.length > 0
  ) {
    compositons.push(true)
  }

  useEffect(() => {
    console.log(cursor, commits, compositons)
  }, [cursor, commit, composition])

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
      {commits.map((t, i) =>
        t === true ? (
          <span
            key={i}
            style={{
              borderRight: '1px solid black',
              paddingRight: '1px',
            }}
          />
        ) : (
          <span key={i}>{t}</span>
        ),
      )}
      {compositons.map((t, i) =>
        t === true ? (
          <span
            key={i}
            style={{
              borderRight: '1px solid black',
              paddingRight: '1px',
            }}
          />
        ) : (
          <span key={i}>{t}</span>
        ),
      )}
    </div>
  )
}
