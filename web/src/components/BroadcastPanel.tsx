import { useState, type FormEvent } from "react";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useContacts } from "../hooks/useContacts";
import { useMessages } from "../hooks/useMessages";
import { BroadcastEditDialog } from "./BroadcastEditDialog";
import {
  createBroadcast,
  deleteBroadcast,
  updateBroadcast,
  type BroadcastMessage,
  type Connection,
} from "../lib/workspace";

type BroadcastPanelProps = {
  userId: string;
  connections: Connection[];
  initialConnectionId: string;
};
type SendMode = "now" | "scheduled";
type MessageFilter = "all" | "sent" | "scheduled";

function formatDate(value: { toDate: () => Date } | null) {
  return value ? value.toDate().toLocaleString("pt-BR") : "—";
}

export function BroadcastPanel({
  userId,
  connections,
  initialConnectionId,
}: BroadcastPanelProps) {
  const [connectionId, setConnectionId] = useState(initialConnectionId);
  const {
    contacts,
    loading: contactsLoading,
    error: contactsError,
  } = useContacts(userId, connectionId || null);
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
  } = useMessages(userId, connectionId || null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [filter, setFilter] = useState<MessageFilter>("all");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingMessage, setEditingMessage] = useState<BroadcastMessage | null>(
    null,
  );

  const selectedAllContacts =
    contacts.length > 0 &&
    contacts.every((contact) => selectedContactIds.includes(contact.id));
  const filteredMessages =
    filter === "all"
      ? messages
      : messages.filter((message) => message.status === filter);

  function toggleContact(contactId: string) {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    if (!connectionId || selectedContactIds.length === 0 || !body.trim()) {
      setFormError(
        "Escolha uma conexão, selecione contatos e escreva a mensagem.",
      );
      return;
    }

    let scheduleIso: string | undefined;
    if (sendMode === "scheduled") {
      const scheduledDate = new Date(scheduledAt);
      if (
        !scheduledAt ||
        Number.isNaN(scheduledDate.getTime()) ||
        scheduledDate.getTime() <= Date.now()
      ) {
        setFormError(
          "Escolha uma data e horário futuros para agendar a mensagem.",
        );
        return;
      }
      scheduleIso = scheduledDate.toISOString();
    }

    setSubmitting(true);
    try {
      await createBroadcast({
        connectionId,
        contactIds: selectedContactIds,
        body: body.trim(),
        ...(scheduleIso ? { scheduledAt: scheduleIso } : {}),
      });
      setSuccessMessage(
        sendMode === "scheduled"
          ? "Mensagem agendada."
          : "Mensagem simulada e marcada como enviada.",
      );
      setSelectedContactIds([]);
      setBody("");
      setScheduledAt("");
    } catch {
      setFormError(
        "Não foi possível salvar a mensagem. Confira a conexão e tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEditedMessage(
    body: string,
    contactIds: string[],
    scheduledAt?: string,
  ) {
    if (!editingMessage) return;
    await updateBroadcast({
      messageId: editingMessage.id,
      body,
      contactIds,
      ...(scheduledAt ? { scheduledAt } : {}),
    });
    setEditingMessage(null);
  }

  async function removeMessage(message: BroadcastMessage) {
    if (!window.confirm("Excluir esta mensagem?")) return;
    setActionError("");
    try {
      await deleteBroadcast(message.id);
    } catch {
      setActionError("Não foi possível excluir a mensagem. Tente novamente.");
    }
  }

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        O envio é simulado: a aplicação registra as mensagens no Firestore, sem
        integração com SMS ou WhatsApp.
      </Alert>
      {connections.length === 0 ? (
        <Card variant="outlined" className="rounded-2xl">
          <CardContent className="p-6">
            <Typography color="text.secondary">
              Crie uma conexão e cadastre contatos para preparar um broadcast.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card variant="outlined" className="rounded-2xl">
            <CardContent className="p-5 sm:p-6">
              <Stack component="form" spacing={3} onSubmit={handleSubmit}>
                <Box>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ fontWeight: 600 }}
                  >
                    Nova mensagem
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selecione os destinatários e quando a mensagem deve ser
                    marcada como enviada.
                  </Typography>
                </Box>
                {formError && <Alert severity="error">{formError}</Alert>}
                {successMessage && (
                  <Alert severity="success">{successMessage}</Alert>
                )}
                <FormControl fullWidth>
                  <InputLabel id="broadcast-connection-label">
                    Conexão
                  </InputLabel>
                  <Select
                    labelId="broadcast-connection-label"
                    value={connectionId}
                    label="Conexão"
                    onChange={(event) => {
                      setConnectionId(event.target.value);
                      setSelectedContactIds([]);
                      setFilter("all");
                    }}
                  >
                    {connections.map((connection) => (
                      <MenuItem key={connection.id} value={connection.id}>
                        {connection.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box>
                  <Stack className="mb-2 flex-row items-center justify-between gap-2">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Destinatários ({selectedContactIds.length} selecionados)
                    </Typography>
                    <Button
                      size="small"
                      disabled={contactsLoading || contacts.length === 0}
                      onClick={() =>
                        setSelectedContactIds(
                          selectedAllContacts
                            ? []
                            : contacts.map((item) => item.id),
                        )
                      }
                    >
                      {selectedAllContacts
                        ? "Limpar seleção"
                        : "Selecionar todos"}
                    </Button>
                  </Stack>
                  {contactsError && (
                    <Alert severity="error">{contactsError}</Alert>
                  )}
                  {contactsLoading ? (
                    <Box className="flex justify-center py-6">
                      <CircularProgress size={26} />
                    </Box>
                  ) : contacts.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      className="py-3"
                    >
                      Esta conexão ainda não tem contatos.
                    </Typography>
                  ) : (
                    <FormGroup className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid sm:grid-cols-2">
                      {contacts.map((contact) => (
                        <FormControlLabel
                          key={contact.id}
                          control={
                            <Checkbox
                              checked={selectedContactIds.includes(contact.id)}
                              onChange={() => toggleContact(contact.id)}
                            />
                          }
                          label={`${contact.name} · ${contact.phone}`}
                        />
                      ))}
                    </FormGroup>
                  )}
                </Box>
                <TextField
                  label="Mensagem"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                  helperText={`${body.length}/4000 caracteres`}
                  multiline
                  minRows={4}
                  required
                  fullWidth
                />
                <FormControl>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Quando enviar?
                  </Typography>
                  <RadioGroup
                    row
                    value={sendMode}
                    onChange={(event) =>
                      setSendMode(event.target.value as SendMode)
                    }
                  >
                    <FormControlLabel
                      value="now"
                      control={<Radio />}
                      label="Agora"
                    />
                    <FormControlLabel
                      value="scheduled"
                      control={<Radio />}
                      label="Agendar"
                    />
                  </RadioGroup>
                </FormControl>
                {sendMode === "scheduled" && (
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
                <Box>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={
                      submitting ||
                      contactsLoading ||
                      selectedContactIds.length === 0
                    }
                  >
                    {submitting
                      ? "Salvando…"
                      : sendMode === "scheduled"
                        ? "Agendar mensagem"
                        : "Enviar agora"}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" className="rounded-2xl">
            <CardContent className="p-5 sm:p-6">
              <Stack className="mb-4 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Box>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ fontWeight: 600 }}
                  >
                    Mensagens da conexão
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Histórico em tempo real das mensagens desta conexão.
                  </Typography>
                </Box>
                <FormControl size="small" className="min-w-44">
                  <InputLabel id="message-filter-label">Filtrar</InputLabel>
                  <Select
                    labelId="message-filter-label"
                    value={filter}
                    label="Filtrar"
                    onChange={(event) =>
                      setFilter(event.target.value as MessageFilter)
                    }
                  >
                    <MenuItem value="all">Todas</MenuItem>
                    <MenuItem value="sent">Enviadas</MenuItem>
                    <MenuItem value="scheduled">Agendadas</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              {messagesError && <Alert severity="error">{messagesError}</Alert>}
              {actionError && (
                <Alert severity="error" className="mb-3">
                  {actionError}
                </Alert>
              )}
              {messagesLoading ? (
                <Box className="flex justify-center py-8">
                  <CircularProgress size={26} />
                </Box>
              ) : filteredMessages.length === 0 ? (
                <Typography color="text.secondary" className="py-6 text-center">
                  {filter === "all"
                    ? "Ainda não há mensagens para esta conexão."
                    : "Não há mensagens com este status."}
                </Typography>
              ) : (
                <Stack divider={<Divider flexItem />}>
                  {filteredMessages.map((message) => (
                    <Box key={message.id} className="py-4 first:pt-0 last:pb-0">
                      <Stack className="mb-2 flex-row items-start justify-between gap-3">
                        <Typography className="whitespace-pre-wrap wrap-break-word">
                          {message.body}
                        </Typography>
                        <Stack className="flex-row items-center gap-1">
                          <Chip
                            size="small"
                            label={
                              message.status === "scheduled"
                                ? "Agendada"
                                : "Enviada"
                            }
                            color={
                              message.status === "scheduled"
                                ? "info"
                                : "success"
                            }
                          />
                          <IconButton
                            aria-label="Editar mensagem"
                            size="small"
                            onClick={() => setEditingMessage(message)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            aria-label="Excluir mensagem"
                            size="small"
                            onClick={() => void removeMessage(message)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {message.contactIds.length}{" "}
                        {message.contactIds.length === 1
                          ? "destinatário"
                          : "destinatários"}{" "}
                        ·{" "}
                        {message.status === "scheduled"
                          ? `Agendada para ${formatDate(message.scheduledAt)}`
                          : `Enviada em ${formatDate(message.createdAt)}`}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {editingMessage && (
        <BroadcastEditDialog
          key={editingMessage.id}
          message={editingMessage}
          contacts={contacts}
          onClose={() => setEditingMessage(null)}
          onSave={saveEditedMessage}
        />
      )}
    </Stack>
  );
}
