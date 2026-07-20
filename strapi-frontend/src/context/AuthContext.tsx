import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { login as apiLogin, api } from '../api/client'
import { SECTION_PROBES, SECTION_ENDPOINTS, PROBE_DOC_ID, SECTION_CREATE_PROBE } from '../permissions'
import type { SectionAccess, Capabilities, SectionCaps } from '../permissions'

interface User {
  id: number
  username: string
  email: string
  role?: { name: string }
}

interface AuthContextType {
  user: User | null
  token: string | null
  roleName: string | undefined
  access: SectionAccess
  capabilities: Capabilities
  accessLoading: boolean
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchRole(jwt: string): Promise<string | undefined> {
  try {
    const res = await api.get('/users/me?populate=role', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    return res.data?.role?.name
  } catch {
    return undefined
  }
}

// A request is "allowed" unless Strapi actively forbids it (403/401). Any other
// result — success, 404 (not found), 400 (validation) — means the permission
// policy let it through. Network/500 errors are treated as allowed so a
// transient outage doesn't wipe the UI.
function allowedFrom(promise: Promise<unknown>): Promise<boolean> {
  return promise.then(() => true).catch((err: any) => {
    const status = err?.response?.status
    return status !== 403 && status !== 401
  })
}

// Probe read/update/delete permission for every section in parallel. Read hits
// the list endpoint; update/delete hit a non-existent documentId so the check
// is non-destructive (see PROBE_DOC_ID note in permissions.ts).
async function probeCapabilities(jwt: string): Promise<Capabilities> {
  const headers = { Authorization: `Bearer ${jwt}` }
  const entries = await Promise.all(
    Object.keys(SECTION_ENDPOINTS).map(async (section): Promise<[string, SectionCaps]> => {
      const ep = SECTION_ENDPOINTS[section]
      const [read, create, update, del] = await Promise.all([
        allowedFrom(api.get(SECTION_PROBES[section], { headers })),
        allowedFrom(api.post(`/${ep}`, { data: SECTION_CREATE_PROBE[section] }, { headers })),
        allowedFrom(api.put(`/${ep}/${PROBE_DOC_ID}`, { data: {} }, { headers })),
        allowedFrom(api.delete(`/${ep}/${PROBE_DOC_ID}`, { headers })),
      ])
      return [section, { read, create, update, delete: del }]
    })
  )
  return Object.fromEntries(entries)
}

function readMap(caps: Capabilities): SectionAccess {
  return Object.fromEntries(Object.entries(caps).map(([s, c]) => [s, c.read]))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [roleName, setRoleName] = useState<string | undefined>(undefined)
  const [access, setAccess] = useState<SectionAccess>({})
  const [capabilities, setCapabilities] = useState<Capabilities>({})
  const [accessLoading, setAccessLoading] = useState(true)
  const [loading, setLoading] = useState(true)

  const applyCaps = (caps: Capabilities) => {
    setCapabilities(caps)
    setAccess(readMap(caps))
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedRole = localStorage.getItem('role') || undefined
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      setRoleName(storedRole)
      // Re-fetch role in background in case it changed
      fetchRole(storedToken).then(r => {
        if (r) { setRoleName(r); localStorage.setItem('role', r) }
      })
      probeCapabilities(storedToken)
        .then(applyCaps)
        .finally(() => setAccessLoading(false))
    } else {
      setAccessLoading(false)
    }
    setLoading(false)
  }, [])

  const login = async (identifier: string, password: string) => {
    const res = await apiLogin(identifier, password)
    const { jwt, user } = res.data
    localStorage.setItem('token', jwt)
    localStorage.setItem('user', JSON.stringify(user))
    const [role, caps] = await Promise.all([fetchRole(jwt), probeCapabilities(jwt)])
    if (role) localStorage.setItem('role', role)
    setToken(jwt)
    setUser(user)
    setRoleName(role)
    applyCaps(caps)
    setAccessLoading(false)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    setToken(null)
    setUser(null)
    setRoleName(undefined)
    setAccess({})
    setCapabilities({})
    setAccessLoading(true)
  }

  return (
    <AuthContext.Provider value={{ user, token, roleName, access, capabilities, accessLoading, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
