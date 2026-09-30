import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase'

function getAuthInstance() {
  if (!auth) throw new Error('O Firebase não está configurado.')
  return auth
}

export function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(getAuthInstance(), email, password)
}

export function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getAuthInstance(), email, password)
}

export function logout() {
  return signOut(getAuthInstance())
}
