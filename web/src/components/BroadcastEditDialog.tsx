import { useState, type FormEvent } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { BroadcastMessage, Contact } from "../lib/workspace";

type BroadcastEditDialogProps = {
  message: BroadcastMessage;
  contacts: Contact[];
  onClose: () => void;
  onSave: (
    body: string,
    contactIds: string[],
    scheduledAt?: string,
  ) => Promise<void>;
};

export function BroadcastEditDialog({
  message,
  contacts,
  onClose,
  onSave,
}: BroadcastEditDialogProps) {
  const [body, setBody] = useState(message.body);
  const [contactIds, setContactIds] = useState(message.contactIds);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const date = message.scheduledAt?.toDate();
    if (!date) return "";
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60_000,
    );
    return localDate.toISOString().slice(0, 16);
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleContact(contactId: string) {
    setContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (message.status === "scheduled") {
      const date = new Date(scheduledAt);
      if (
        !scheduledAt ||
        Number.isNaN(date.getTime()) ||
        date.getTime() <= Date.now()
      ) {
        setError("Escolha uma data e horário futuros.");
        return;
      }
    }

    setSaving(true);
    try {
      const scheduleIso =
        message.status === "scheduled"
          ? new Date(scheduledAt).toISOString()
          : undefined;
      await onSave(body.trim(), contactIds, scheduleIso);
    } catch {
      setError("Não foi possível atualizar a mensagem. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Editar mensagem</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              O status e o horário de agendamento não serão alterados.
            </Typography>
            {error && (
              <Typography role="alert" color="error">
                {error}
              </Typography>
            )}
            <TextField
              label="Mensagem"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 4000 } }}
              multiline
              minRows={3}
              required
              fullWidth
            />
            {message.status === "scheduled" && (
              <TextField
                label="Data e horário"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Destinatários
            </Typography>
            {contacts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Não há contatos disponíveis nesta conexão.
              </Typography>
            ) : (
              <FormGroup className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid sm:grid-cols-2">
                {contacts.map((contact) => (
                  <FormControlLabel
                    key={contact.id}
                    control={
                      <Checkbox
                        checked={contactIds.includes(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                      />
                    }
                    label={`${contact.name} · ${contact.phone}`}
                  />
                ))}
              </FormGroup>
            )}
          </Stack>
        </DialogContent>
        <DialogActions className="px-6 pb-5">
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              saving ||
              !body.trim() ||
              contactIds.length === 0 ||
              (message.status === "scheduled" && !scheduledAt)
            }
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
