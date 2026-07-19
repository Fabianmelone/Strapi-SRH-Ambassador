import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CalendarDays, MapPin, Newspaper, LogOut, LayoutDashboard } from 'lucide-react'
import styles from './Layout.module.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
          <NavLink to="/bookings" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <CalendarDays size={18} />
            Bookings
          </NavLink>
          <NavLink to="/events" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <MapPin size={18} />
            Events
          </NavLink>
          <NavLink to="/news" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <Newspaper size={18} />
            News
          </NavLink>
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
