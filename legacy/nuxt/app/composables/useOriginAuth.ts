import { computed } from 'vue'

type Tokens = { accessToken: string, idToken: string, expiresAt: number, email: string, operator: boolean }
type AuthState = { session: Tokens | null, hydrated: boolean, busy: boolean, error: string }
const COGNITO_URL = 'https://origin1auth20261023sdk.auth.ap-southeast-1.amazoncognito.com'
const CLIENT_ID = 'e7appf35fu05827fukilfqd0h'
const STORAGE_KEY = 'origin.auth.session.v1'
const STATE_KEY = 'origin.auth.pkce.v1'

function decodeJwtPayload(jwt: string): Record<string, any> {
  try {
    const payload = jwt.split('.')[1]
    if (!payload) return {}
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, any>
  } catch { return {} }
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function safeReturn(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : '/build'
}

export function useOriginAuth() {
  const state = useState<AuthState>('origin-cognito-session', () => ({ session:null, hydrated:false, busy:false, error:'' }))
  const isSignedIn = computed(() => !!state.value.session && state.value.session.expiresAt > Date.now() + 5000)
  const canStartBuild = computed(() => isSignedIn.value && state.value.session?.operator === true)

  function hydrate() {
    if (!import.meta.client || state.value.hydrated) return
    state.value.hydrated = true
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const stored = JSON.parse(raw) as Tokens
      if (typeof stored.accessToken !== 'string' || typeof stored.expiresAt !== 'number') return
      if (stored.expiresAt < Date.now() + 5000) {
        sessionStorage.removeItem(STORAGE_KEY)
        return
      }
      state.value.session = stored
    } catch { sessionStorage.removeItem(STORAGE_KEY) }
  }

  async function signIn(returnTo = '/build') {
    if (!import.meta.client) return
    const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)))
    const stateNonce = base64Url(crypto.getRandomValues(new Uint8Array(24)))
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    const challenge = base64Url(new Uint8Array(digest))
    sessionStorage.setItem(STATE_KEY, JSON.stringify({ verifier, stateNonce, created:Date.now(), returnTo:safeReturn(returnTo) }))
    const params = new URLSearchParams({
      response_type:'code',
      client_id:CLIENT_ID,
      redirect_uri:window.location.origin + '/auth/callback',
      scope:'openid email',
      state:stateNonce,
      code_challenge:challenge,
      code_challenge_method:'S256'
    })
    window.location.assign(COGNITO_URL + '/oauth2/authorize?' + params.toString())
  }

  async function completeSignIn(code: string, returnedState: string): Promise<string> {
    if (!import.meta.client) throw new Error('Sign-in can only finish inside your browser.')
    state.value.busy = true
    state.value.error = ''
    try {
      const record = JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null') as {
        verifier:string, stateNonce:string, created:number, returnTo:string
      } | null
      if (!record || !record.verifier || !record.stateNonce || record.stateNonce !== returnedState ||
          !record.created || Date.now() - record.created > 10 * 60 * 1000) {
        throw new Error('Login verification expired. Start sign-in again.')
      }
      // A code may be redeemed only once. Remove verifier regardless of network outcome.
      sessionStorage.removeItem(STATE_KEY)
      const payload = new URLSearchParams({
        grant_type:'authorization_code',
        client_id:CLIENT_ID,
        redirect_uri:window.location.origin + '/auth/callback',
        code,
        code_verifier:record.verifier
      })
      const response = await fetch(COGNITO_URL + '/oauth2/token', {
        method:'POST',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body:payload
      })
      const data = await response.json() as { access_token?:string, id_token?:string, expires_in?:number, error_description?:string }
      if (!response.ok || !data.access_token || !data.id_token) throw new Error(data.error_description || 'Sign-in token exchange failed.')
      const user = decodeJwtPayload(data.id_token)
      const scopes = decodeJwtPayload(data.access_token)
      const groups = scopes['cognito:groups']
      const operator = Array.isArray(groups) && groups.includes('origin-operators')
      const valid: Tokens = {
        accessToken:data.access_token,
        idToken:data.id_token,
        expiresAt:Date.now() + Math.max(60, Number(data.expires_in) || 900) * 1000,
        email: typeof user.email === 'string' ? user.email : 'Signed in',
        operator
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
      state.value.session = valid
      return safeReturn(record.returnTo)
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : 'Sign-in failed.'
      throw error
    } finally {
      state.value.busy = false
    }
  }

  function signOut() {
    state.value.session = null
    state.value.error = ''
    if (!import.meta.client) return
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STATE_KEY)
    const params = new URLSearchParams({ client_id:CLIENT_ID, logout_uri:window.location.origin + '/dashboard' })
    window.location.assign(COGNITO_URL + '/logout?' + params.toString())
  }

  return { state, isSignedIn, canStartBuild, hydrate, signIn, completeSignIn, signOut }
}
