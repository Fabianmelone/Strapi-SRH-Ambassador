import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CalendarDays, MapPin, Newspaper, LogOut, LayoutDashboard, Package, Building2 } from 'lucide-react'
import styles from './Layout.module.css'

const NAV_ITEMS = [
  { to: '/bookings',  section: 'bookings',  label: 'Bookings',  Icon: CalendarDays },
  { to: '/events',    section: 'events',    label: 'Events',    Icon: MapPin },
  { to: '/news',      section: 'news',      label: 'News',      Icon: Newspaper },
  { to: '/locations', section: 'locations', label: 'Locations', Icon: Building2 },
  { to: '/materials', section: 'materials', label: 'Materials', Icon: Package },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, access, accessLoading } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = accessLoading ? [] : NAV_ITEMS.filter(item => access[item.section])

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoAccent}>SRH</span>
          <span>Ambassador</span>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          {visibleItems.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.userArea}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{user?.username}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
