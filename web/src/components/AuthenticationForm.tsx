import { useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { FirebaseError } from 'firebase/app'
import { loginWithEmail, registerWithEmail } from '../lib/auth'

type AuthMode = 'login' | 'register'

function getErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com esse e-mail.'
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.'
    case 'auth/invalid-email':
      return 'Informe um endereço de e-mail válido.'
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.'
    case 'auth/network-request-failed':
      return 'Falha de conexão. Verifique sua internet e tente novamente.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}

export function AuthenticationForm() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isRegistering = mode === 'register'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (isRegistering && password !== confirmPassword) {
      setErrorMessage('As senhas não correspondem.')
      return
    }

    setSubmitting(true)

    try {
      if (isRegistering) {
        await registerWithEmail(email.trim(), password)
      } else {
        await loginWithEmail(email.trim(), password)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setErrorMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <Box className="mx-auto w-full max-w-md">
      <Card variant="outlined" className="rounded-2xl">
        <CardContent className="p-6 sm:p-8">
          <Stack component="form" spacing={3} onSubmit={handleSubmit}>
            <Box>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                SEND FLOW
              </Typography>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                {isRegistering ? 'Crie sua conta' : 'Acesse sua conta'}
              </Typography>
              <Typography color="text.secondary" className="mt-1">
                {isRegistering
                  ? 'Sua conta será o espaço privado do seu cliente.'
                  : 'Entre para gerenciar suas conexões e mensagens.'}
              </Typography>
            </Box>

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              slotProps={{ htmlInput: { minLength: 6 } }}
              required
              fullWidth
            />
            {isRegistering && (
              <TextField
                label="Confirme a senha"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                slotProps={{ htmlInput: { minLength: 6 } }}
                required
                fullWidth
              />
            )}
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? 'Aguarde…' : isRegistering ? 'Criar conta' : 'Entrar'}
            </Button>
            <Typography variant="body2" align="center" color="text.secondary">
              {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
              <Button
                type="button"
                size="small"
                onClick={() => changeMode(isRegistering ? 'login' : 'register')}
              >
                {isRegistering ? 'Entrar' : 'Cadastre-se'}
              </Button>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
