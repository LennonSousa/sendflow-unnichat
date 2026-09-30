import { useEffect, useState } from 'react'
import { listenToMessages, type BroadcastMessage } from '../lib/workspace'

export function useMessages(tenantId: string, connectionId: string | null) {
  const [state, setState] = useState<{
    connectionId: string | null
    messages: BroadcastMessage[]
    loading: boolean
    error: string
  }>({ connectionId: null, messages: [], loading: false, error: '' })

  useEffect(() => {
    if (!connectionId) return
    return listenToMessages(tenantId, connectionId, (messages) => {
      setState({ connectionId, messages, loading: false, error: '' })
    }, () => {
      setState({ connectionId, messages: [], loading: false, error: 'Não foi possível carregar o histórico de mensagens.' })
    })
  }, [tenantId, connectionId])

  const matchesConnection = state.connectionId === connectionId
  return {
    messages: matchesConnection ? state.messages : [],
    loading: Boolean(connectionId) && (!matchesConnection || state.loading),
    error: matchesConnection ? state.error : '',
  }
}
