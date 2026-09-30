import { useEffect, useState } from 'react'
import { listenToConnections, type Connection } from '../lib/workspace'

export function useConnections(tenantId: string) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => listenToConnections(tenantId, (nextConnections) => {
    setConnections(nextConnections)
    setError('')
    setLoading(false)
  }, () => {
    setError('Não foi possível carregar suas conexões.')
    setLoading(false)
  }), [tenantId])

  return { connections, loading, error }
}
