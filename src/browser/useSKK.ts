import { useCallback, useMemo, useState } from 'react'
import { SKK, type SKKIMEMethods } from '../skk'

export function useSKK(ime: SKKIMEMethods) {
  const [state, setState] = useState<'not-ready' | 'in-preparation' | 'ready'>(
    'not-ready',
  )

  const skk = useMemo(() => new SKK(ime), [ime])

  const setup = useCallback(async () => {
    setState('in-preparation')

    await skk.setup()

    setState('ready')

    return skk
  }, [skk])

  return [state, setup] as const
}
