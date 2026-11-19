import { useEffect, useState } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

/** Query cache refreshes retain their content; only first loads and writes announce work. */
export function ActivityFeedback() {
  const fetching = useIsFetching({ predicate: query => query.state.data === undefined })
  const mutations = useIsMutating()
  const busy = fetching > 0 || mutations > 0
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!busy) { setVisible(false); return }
    const timer = window.setTimeout(() => setVisible(true), 250)
    return () => window.clearTimeout(timer)
  }, [busy])
  return <div className="ui-activity" data-visible={visible} aria-hidden={!visible}>
    {visible && <><div role="progressbar" aria-label={mutations ? 'Salvando alterações' : 'Carregando dados'} className="ui-activity-track"><span /></div>
      <span role="status" className="ui-activity-label">{mutations ? 'Salvando alterações…' : 'Carregando dados…'}</span></>}
  </div>
}
