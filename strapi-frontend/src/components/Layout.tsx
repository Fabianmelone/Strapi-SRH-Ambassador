import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CalendarDays, MapPin, Newspaper, LogOut, LayoutDashboard, Package, Building2, Menu, ChevronLeft } from 'lucide-react'
import styles from './Layout.module.css'
import srhLogo from '../assets/srh-logo-white.png'

const NAV_ITEMS = [
  { to: '/',          section: null,        label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/bookings',  section: 'bookings',  label: 'Bookings',  Icon: CalendarDays },
  { to: '/events',    section: 'events',    label: 'Events',    Icon: MapPin },
  { to: '/news',      section: 'news',      label: 'News',      Icon: Newspaper },
  { to: '/locations', section: 'locations', label: 'Locations', Icon: Building2 },
  { to: '/materials', section: 'materials', label: 'Materials', Icon: Package },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, access, accessLoading } = useAuth()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(() => localStorage.getItem('sidebar_expanded') === 'true')

  const toggle = () => {
    setExpanded(prev => {
      localStorage.setItem('sidebar_expanded', String(!prev))
      return !prev
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = NAV_ITEMS.filter(item =>
    item.section === null ? true : !accessLoading && access[item.section]
  )

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${expanded ? styles.expanded : ''}`}>
        <div className={styles.top}>
          <button className={styles.toggle} onClick={toggle} title={expanded ? 'Collapse menu' : 'Expand menu'} aria-label="Toggle menu">
            {expanded ? <ChevronLeft size={22} /> : <Menu size={22} />}
          </button>
          <div className={styles.logo}>
            <img src={srhLogo} alt="SRH Logo" />
            <span className={styles.logoText}>Events</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {visibleItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              title={expanded ? undefined : label}
            >
              <Icon size={28} className={styles.navIcon} />
              <span className={styles.navLabel}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.userArea}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{user?.username}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
