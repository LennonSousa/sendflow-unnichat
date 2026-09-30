import { useState, type FormEvent } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'

type ContactDialogProps = {
  open: boolean
  initialName: string
  initialPhone: string
  onClose: () => void
  onSave: (name: string, phone: string) => Promise<void>
}

export function ContactDialog({ open, initialName, initialPhone, onClose, onSave }: ContactDialogProps) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(name.trim(), phone.trim())
    } catch {
      setError('Não foi possível salvar o contato. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{initialName ? 'Editar contato' : 'Novo contato'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Box role="alert" className="text-sm text-red-700">{error}</Box>}
            <TextField autoFocus label="Nome" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
            <TextField label="Telefone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} helperText="Inclua o código do país quando necessário." required fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions className="px-6 pb-5">
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim() || !phone.trim()}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
