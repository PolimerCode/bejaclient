import http from 'http'
import { getSelectedAccount, loadAccounts, saveAccounts } from './authService'

const API_HOST = '206.217.141.184'
const API_PORT = 3093

function fetchBejaToken(uuid: string, username: string): Promise<string | null> {
  return new Promise(resolve => {
    const body = JSON.stringify({ uuid, username })
    const req = http.request({
      hostname: API_HOST, port: API_PORT,
      path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data).token ?? null) } catch { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.write(body)
    req.end()
  })
}

export async function getBejaToken(): Promise<string | null> {
  const account = getSelectedAccount()
  if (!account) return null
  if (account.bejaToken) return account.bejaToken

  const token = await fetchBejaToken(account.uuid, account.username)
  if (token) {
    const accounts = loadAccounts()
    const idx = accounts.findIndex(a => a.id === account.id)
    if (idx >= 0) { accounts[idx].bejaToken = token; saveAccounts(accounts) }
  }
  return token
}
