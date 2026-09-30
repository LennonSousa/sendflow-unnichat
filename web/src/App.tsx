import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  CssBaseline,
  Stack,
  Typography,
} from '@mui/material'
import { AuthenticationForm } from './components/AuthenticationForm'
import { WorkspaceDashboard } from './components/WorkspaceDashboard'
import { useAuth } from './hooks/useAuth'
import { firebaseConfigured } from './lib/firebase'

function App() {
  const { user, loading } = useAuth()

  return (
    <>
      <CssBaseline />
      <Box className="min-h-screen bg-slate-50">
        <Container maxWidth={user ? 'lg' : 'sm'} className="py-10">
          {!firebaseConfigured ? (
            <Card variant="outlined" className="rounded-2xl">
              <CardContent className="p-6 sm:p-8">
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                      SEND FLOW
                    </Typography>
                    <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                      Configure o Firebase
                    </Typography>
                  </Box>
                  <Alert severity="info">
                    Copie web/.env.example para web/.env.local e preencha as credenciais da
                    aplicação Web no console do Firebase para habilitar cadastro e login.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          ) : loading ? (
            <Stack className="items-center gap-4 py-20">
              <CircularProgress />
              <Typography color="text.secondary">Verificando sua sessão…</Typography>
            </Stack>
          ) : user ? (
            <WorkspaceDashboard userId={user.uid} email={user.email ?? ''} />
          ) : (
            <AuthenticationForm />
          )}
        </Container>
      </Box>
    </>
  )
}

export default App
