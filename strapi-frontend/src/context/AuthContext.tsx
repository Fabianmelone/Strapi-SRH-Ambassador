import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { login as apiLogin, api } from '../api/client'
import { SECTION_PROBES } from '../permissions'
import type { SectionAccess } from '../permissions'

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

// Probe each section's read endpoint. 403/401 => the role can't read it, so we
// hide the page. Any other failure (backend down, 500) is treated as accessible
// so a transient outage doesn't wipe the whole navigation.
async function probeAccess(jwt: string): Promise<SectionAccess> {
  const entries = await Promise.all(
    Object.entries(SECTION_PROBES).map(async ([section, url]) => {
      try {
        await api.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
        return [section, true] as const
      } catch (err: any) {
        const status = err?.response?.status
        return [section, status !== 403 && status !== 401] as const
      }
    })
  )
  return Object.fromEntries(entries)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [roleName, setRoleName] = useState<string | undefined>(undefined)
  const [access, setAccess] = useState<SectionAccess>({})
  const [accessLoading, setAccessLoading] = useState(true)
  const [loading, setLoading] = useState(true)

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
      probeAccess(storedToken)
        .then(setAccess)
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
    const [role, sectionAccess] = await Promise.all([fetchRole(jwt), probeAccess(jwt)])
    if (role) localStorage.setItem('role', role)
    setToken(jwt)
    setUser(user)
    setRoleName(role)
    setAccess(sectionAccess)
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
    setAccessLoading(true)
  }

  return (
    <AuthContext.Provider value={{ user, token, roleName, access, accessLoading, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
