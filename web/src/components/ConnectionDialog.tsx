import { useState, type FormEvent } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'

type ConnectionDialogProps = {
  open: boolean
  initialName: string
  onClose: () => void
  onSave: (name: string) => Promise<void>
}

export function ConnectionDialog({ open, initialName, onClose, onSave }: ConnectionDialogProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(name.trim())
    } catch {
      setError('Não foi possível salvar a conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{initialName ? 'Editar conexão' : 'Nova conexão'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Box role="alert" className="text-sm text-red-700">{error}</Box>}
            <TextField autoFocus label="Nome da conexão" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions className="px-6 pb-5">
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim()}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
