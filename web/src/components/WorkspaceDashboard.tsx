import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { BroadcastPanel } from "./BroadcastPanel";
import { ConnectionDialog } from "./ConnectionDialog";
import { ContactDialog } from "./ContactDialog";
import { useConnections } from "../hooks/useConnections";
import { useContacts } from "../hooks/useContacts";
import { logout } from "../lib/auth";
import {
  createConnection,
  createContact,
  deleteConnection,
  deleteContact,
  updateConnection,
  updateContact,
  type Connection,
  type Contact,
} from "../lib/workspace";

type WorkspaceDashboardProps = { userId: string; email: string };

export function WorkspaceDashboard({ userId, email }: WorkspaceDashboardProps) {
  const {
    connections,
    loading: connectionsLoading,
    error: connectionsError,
  } = useConnections(userId);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<"contacts" | "broadcast">(
    "contacts",
  );
  const selectedConnection =
    connections.find((item) => item.id === selectedConnectionId) ??
    connections[0] ??
    null;
  const {
    contacts,
    loading: contactsLoading,
    error: contactsError,
  } = useContacts(userId, selectedConnection?.id ?? null);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(
    null,
  );
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [actionError, setActionError] = useState("");

  async function saveConnection(name: string) {
    if (editingConnection) {
      await updateConnection(editingConnection.id, name);
    } else {
      const added = await createConnection(userId, name);
      setSelectedConnectionId(added.id);
    }
    setConnectionDialogOpen(false);
    setEditingConnection(null);
  }

  async function removeConnection(connection: Connection) {
    if (
      !window.confirm(
        `Excluir a conexão “${connection.name}” e seus contatos e mensagens?`,
      )
    )
      return;
    setActionError("");
    try {
      await deleteConnection(connection.id);
    } catch {
      setActionError("Não foi possível excluir a conexão. Tente novamente.");
    }
  }

  async function saveContact(name: string, phone: string) {
    if (!selectedConnection) return;
    if (editingContact) {
      await updateContact(editingContact.id, name, phone);
    } else {
      await createContact(userId, selectedConnection.id, name, phone);
    }
    setContactDialogOpen(false);
    setEditingContact(null);
  }

  async function removeContact(contact: Contact) {
    if (!window.confirm(`Excluir o contato “${contact.name}”?`)) return;
    setActionError("");
    try {
      await deleteContact(contact.id);
    } catch {
      setActionError("Não foi possível excluir o contato. Tente novamente.");
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      setActionError("Não foi possível sair da conta. Tente novamente.");
    }
  }

  return (
    <>
      <Stack
        component="header"
        className="mb-8 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <Box>
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 700 }}
          >
            SEND FLOW
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Broadcast
          </Typography>
        </Box>
        <Stack className="flex-row items-center gap-3">
          <Typography
            variant="body2"
            color="text.secondary"
            className="break-all"
          >
            {email}
          </Typography>
          <Button variant="outlined" onClick={() => void handleLogout()}>
            Sair
          </Button>
        </Stack>
      </Stack>

      {actionError && (
        <Alert severity="error" className="mb-4">
          {actionError}
        </Alert>
      )}
      <Tabs
        value={activeTab}
        onChange={(_, value: "contacts" | "broadcast") => setActiveTab(value)}
        className="mb-6"
        aria-label="Seções do SendFlow"
      >
        <Tab value="contacts" label="Conexões e contatos" />
        <Tab value="broadcast" label="Broadcast" />
      </Tabs>

      {activeTab === "contacts" ? (
        <Box className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
          <Card variant="outlined" className="rounded-2xl">
            <CardContent className="p-5 sm:p-6">
              <Stack className="mb-4 flex-row items-center justify-between gap-2">
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ fontWeight: 600 }}
                >
                  Conexões
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingConnection(null);
                    setConnectionDialogOpen(true);
                  }}
                >
                  Nova
                </Button>
              </Stack>
              {connectionsError && (
                <Alert severity="error">{connectionsError}</Alert>
              )}
              {connectionsLoading ? (
                <Box className="flex justify-center py-8">
                  <CircularProgress size={28} />
                </Box>
              ) : connections.length === 0 ? (
                <Typography color="text.secondary" className="py-6 text-center">
                  Ainda não há conexões. Crie uma para começar.
                </Typography>
              ) : (
                <List disablePadding>
                  {connections.map((connection) => (
                    <ListItem
                      key={connection.id}
                      disablePadding
                      secondaryAction={
                        <Stack className="flex-row">
                          <IconButton
                            aria-label={`Editar ${connection.name}`}
                            size="small"
                            onClick={() => {
                              setEditingConnection(connection);
                              setConnectionDialogOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            aria-label={`Excluir ${connection.name}`}
                            size="small"
                            onClick={() => void removeConnection(connection)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemButton
                        selected={selectedConnection?.id === connection.id}
                        onClick={() => setSelectedConnectionId(connection.id)}
                        className="rounded-lg"
                      >
                        <ListItemText
                          primary={connection.name}
                          className="mr-16"
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
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
                    {selectedConnection?.name ?? "Contatos"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedConnection
                      ? `${contacts.length} ${contacts.length === 1 ? "contato" : "contatos"}`
                      : "Selecione ou crie uma conexão."}
                  </Typography>
                </Box>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingContact(null);
                    setContactDialogOpen(true);
                  }}
                  disabled={!selectedConnection}
                >
                  Novo contato
                </Button>
              </Stack>
              {contactsError && <Alert severity="error">{contactsError}</Alert>}
              {contactsLoading ? (
                <Box className="flex justify-center py-8">
                  <CircularProgress size={28} />
                </Box>
              ) : !selectedConnection || contacts.length === 0 ? (
                <Typography color="text.secondary" className="py-6 text-center">
                  {selectedConnection
                    ? "Esta conexão ainda não tem contatos."
                    : "Crie uma conexão para cadastrar contatos."}
                </Typography>
              ) : (
                <List disablePadding>
                  {contacts.map((contact) => (
                    <ListItem
                      key={contact.id}
                      divider
                      secondaryAction={
                        <Stack className="flex-row">
                          <IconButton
                            aria-label={`Editar ${contact.name}`}
                            size="small"
                            onClick={() => {
                              setEditingContact(contact);
                              setContactDialogOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            aria-label={`Excluir ${contact.name}`}
                            size="small"
                            onClick={() => void removeContact(contact)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={contact.name}
                        secondary={contact.phone}
                        className="mr-16"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      ) : (
        <BroadcastPanel
          userId={userId}
          connections={connections}
          initialConnectionId={selectedConnection?.id ?? ""}
        />
      )}

      {connectionDialogOpen && (
        <ConnectionDialog
          key={editingConnection?.id ?? "new-connection"}
          open={connectionDialogOpen}
          initialName={editingConnection?.name ?? ""}
          onClose={() => setConnectionDialogOpen(false)}
          onSave={saveConnection}
        />
      )}
      {contactDialogOpen && selectedConnection && (
        <ContactDialog
          key={editingContact?.id ?? "new-contact"}
          open={contactDialogOpen}
          initialName={editingContact?.name ?? ""}
          initialPhone={editingContact?.phone ?? ""}
          onClose={() => setContactDialogOpen(false)}
          onSave={saveContact}
        />
      )}
    </>
  );
}
