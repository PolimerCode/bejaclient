import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import * as https from 'https'

// Uses Microsoft's Live Connect OAuth (the same approach used by Minecraft Java launcher)
// client_id 00000000402b5328 = Xbox App, valid for the live.com OAuth endpoint
const LIVE_CLIENT_ID = '00000000402b5328'
const LIVE_SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL'
const LIVE_REDIRECT = 'https://login.live.com/oauth20_desktop.srf'

const BEJA_API = 'http://206.217.141.184:3093'

export interface StoredAccount {
  id: string
  username: string
  uuid: string
  accessToken: string
  refreshToken: string
  tokenExpiry: number
  skinUrl: string | null
  capeUrl: string | null
  skinModel: 'default' | 'slim'
  selected: boolean
  bejaToken?: string
}

function getAccountsPath() {
  return join(app.getPath('userData'), 'accounts.json')
}

export function loadAccounts(): StoredAccount[] {
  const path = getAccountsPath()
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return []
  }
}

export function saveAccounts(accounts: StoredAccount[]): void {
  writeFileSync(getAccountsPath(), JSON.stringify(accounts, null, 2), 'utf-8')
}

function httpsRequest(
  method: string,
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function post(url: string, body: string, contentType = 'application/x-www-form-urlencoded') {
  return httpsRequest('POST', url, body, { 'Content-Type': contentType, Accept: 'application/json' })
}

function postJson(url: string, body: unknown) {
  const s = JSON.stringify(body)
  return httpsRequest('POST', url, s, {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  })
}

function get(url: string, headers: Record<string, string> = {}) {
  return new Promise<string>((resolve, reject) => {
    https.get(url, { headers }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

// Step 1: Exchange Live auth code for tokens
async function exchangeLiveCode(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: LIVE_CLIENT_ID,
    code,
    grant_type: 'authorization_code',
    redirect_uri: LIVE_REDIRECT,
    scope: LIVE_SCOPE,
  }).toString()
  const raw = await post('https://login.live.com/oauth20_token.srf', body)
  const data = JSON.parse(raw)
  if (!data.access_token) throw new Error(data.error_description ?? 'Failed to get Live token')
  return data
}

// Step 2: Refresh Live token
async function refreshLiveToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: LIVE_CLIENT_ID,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: LIVE_SCOPE,
  }).toString()
  const raw = await post('https://login.live.com/oauth20_token.srf', body)
  const data = JSON.parse(raw)
  if (!data.access_token) throw new Error(data.error_description ?? 'Failed to refresh Live token')
  return data
}

// Step 3: Xbox Live authentication (using Live token with "t=" prefix)
async function authXboxLive(liveToken: string): Promise<{ token: string; userHash: string }> {
  const raw = await postJson('https://user.auth.xboxlive.com/user/authenticate', {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `t=${liveToken}`,
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
  })
  const data = JSON.parse(raw)
  if (!data.Token) throw new Error('Xbox Live authentication failed')
  return { token: data.Token, userHash: data.DisplayClaims.xui[0].uhs }
}

// Step 4: XSTS token
async function getXSTSToken(xblToken: string): Promise<{ token: string; userHash: string }> {
  const raw = await postJson('https://xsts.auth.xboxlive.com/xsts/authorize', {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT',
  })
  const data = JSON.parse(raw)
  if (!data.Token) {
    const xErr = data.XErr
    if (xErr === 2148916233) throw new Error('This Microsoft account has no Xbox profile. Set one up at xbox.com.')
    if (xErr === 2148916235) throw new Error('Xbox Live is not available in your country.')
    throw new Error(`XSTS error: ${xErr}`)
  }
  return { token: data.Token, userHash: data.DisplayClaims.xui[0].uhs }
}

// Step 5: Minecraft token
async function getMinecraftToken(xstsToken: string, userHash: string): Promise<string> {
  const raw = await postJson(
    'https://api.minecraftservices.com/authentication/login_with_xbox',
    { identityToken: `XBL3.0 x=${userHash};${xstsToken}` },
  )
  const data = JSON.parse(raw)
  if (!data.access_token) throw new Error('Failed to get Minecraft token')
  return data.access_token
}

// Step 6: Minecraft profile
async function getMinecraftProfile(mcToken: string) {
  const raw = await get('https://api.minecraftservices.com/minecraft/profile', {
    Authorization: `Bearer ${mcToken}`,
  })
  const data = JSON.parse(raw)
  if (data.error) throw new Error('This account does not own Minecraft Java Edition.')
  return data as {
    id: string
    name: string
    skins: { url: string; state: string; variant?: 'CLASSIC' | 'SLIM' }[]
    capes: { url: string; state: string }[]
  }
}

async function finalizeLogin(liveAccessToken: string, liveRefreshToken: string, liveExpiresIn: number): Promise<StoredAccount> {
  const xbl = await authXboxLive(liveAccessToken)
  const xsts = await getXSTSToken(xbl.token)
  const mcToken = await getMinecraftToken(xsts.token, xsts.userHash)
  const profile = await getMinecraftProfile(mcToken)

  const activeSkin = profile.skins.find(s => s.state === 'ACTIVE')
  const activeCape = profile.capes.find(c => c.state === 'ACTIVE')

  let bejaToken: string | undefined
  try {
    const raw = await postJson(`${BEJA_API}/api/auth/login`, { uuid: profile.id, username: profile.name })
    const parsed = JSON.parse(raw) as { token?: string }
    bejaToken = parsed.token
  } catch { /* non-fatal */ }

  const account: StoredAccount = {
    id: profile.id,
    username: profile.name,
    uuid: profile.id,
    accessToken: mcToken,
    refreshToken: liveRefreshToken,
    tokenExpiry: Date.now() + liveExpiresIn * 1000,
    skinUrl: activeSkin?.url?.replace('http://', 'https://') ?? null,
    capeUrl: activeCape?.url?.replace('http://', 'https://') ?? null,
    skinModel: activeSkin?.variant === 'SLIM' ? 'slim' : 'default',
    selected: false,
    bejaToken,
  }

  const accounts = loadAccounts()
  const existing = accounts.findIndex(a => a.id === account.id)
  if (existing >= 0) {
    accounts[existing] = { ...accounts[existing], ...account, selected: accounts[existing].selected }
  } else {
    accounts.push(account)
  }
  saveAccounts(accounts)
  return account
}

export function loginWithMicrosoft(mainWindow: BrowserWindow | null): Promise<StoredAccount> {
  return new Promise((resolve, reject) => {
    const authUrl =
      `https://login.live.com/oauth20_authorize.srf` +
      `?client_id=${LIVE_CLIENT_ID}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(LIVE_SCOPE)}` +
      `&redirect_uri=${encodeURIComponent(LIVE_REDIRECT)}`

    const authWin = new BrowserWindow({
      width: 520,
      height: 680,
      parent: mainWindow ?? undefined,
      modal: !!mainWindow,
      show: false,
      title: 'Sign in with Microsoft',
      autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    authWin.once('ready-to-show', () => authWin.show())

    // handled flag prevents 'closed' from rejecting after redirect is captured
    let handled = false

    async function handleRedirect(url: string) {
      if (handled) return
      if (!url.startsWith(LIVE_REDIRECT)) return
      handled = true

      const parsed = new URL(url)
      const code = parsed.searchParams.get('code')
      const error = parsed.searchParams.get('error')

      // Close window safely without triggering the 'closed' rejection
      if (!authWin.isDestroyed()) authWin.hide()
      setTimeout(() => { if (!authWin.isDestroyed()) authWin.destroy() }, 100)

      if (error || !code) {
        reject(new Error(error ?? 'No auth code received'))
        return
      }
      try {
        const tokens = await exchangeLiveCode(code)
        const account = await finalizeLogin(tokens.access_token, tokens.refresh_token, tokens.expires_in)
        resolve(account)
      } catch (e) {
        reject(e)
      }
    }

    authWin.webContents.on('will-redirect', (_event, url) => { handleRedirect(url) })
    authWin.webContents.on('will-navigate', (_event, url) => { handleRedirect(url) })
    authWin.webContents.on('did-navigate', (_event, url) => { handleRedirect(url) })

    authWin.on('closed', () => {
      if (!handled) reject(new Error('Sign-in cancelled'))
    })

    authWin.loadURL(authUrl)
  })
}

export async function refreshAccount(id: string): Promise<StoredAccount | null> {
  const accounts = loadAccounts()
  const account = accounts.find(a => a.id === id)
  if (!account?.refreshToken) return null

  try {
    const tokens = await refreshLiveToken(account.refreshToken)
    const updated = await finalizeLogin(tokens.access_token, tokens.refresh_token, tokens.expires_in)
    return { ...updated, id: account.id }
  } catch {
    return null
  }
}

export function logoutAccount(id: string): void {
  saveAccounts(loadAccounts().filter(a => a.id !== id))
}

export function selectAccount(id: string): void {
  saveAccounts(loadAccounts().map(a => ({ ...a, selected: a.id === id })))
}

export function getSelectedAccount(): StoredAccount | null {
  return loadAccounts().find(a => a.selected) ?? null
}
