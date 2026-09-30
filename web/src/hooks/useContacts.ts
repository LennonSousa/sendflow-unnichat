import { useEffect, useState } from 'react'
import { listenToContacts, type Contact } from '../lib/workspace'

export function useContacts(tenantId: string, connectionId: string | null) {
  const [state, setState] = useState<{
    connectionId: string | null
    contacts: Contact[]
    loading: boolean
    error: string
  }>({ connectionId: null, contacts: [], loading: false, error: '' })

  useEffect(() => {
    if (!connectionId) return
    return listenToContacts(tenantId, connectionId, (contacts) => {
      setState({ connectionId, contacts, loading: false, error: '' })
    }, () => {
      setState({ connectionId, contacts: [], loading: false, error: 'Não foi possível carregar os contatos desta conexão.' })
    })
  }, [tenantId, connectionId])

  const matchesConnection = state.connectionId === connectionId
  return {
    contacts: matchesConnection ? state.contacts : [],
    loading: Boolean(connectionId) && (!matchesConnection || state.loading),
    error: matchesConnection ? state.error : '',
  }
}
