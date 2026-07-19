import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBookings, getEvents, getNewsArticles } from '../api/client'
import { CalendarDays, MapPin, Newspaper, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ bookings: 0, events: 0, news: 0 })
  const [recentBookings, setRecentBookings] = useState<any[]>([])

  useEffect(() => {
    Promise.all([getBookings(), getEvents(), getNewsArticles()]).then(
      ([b, e, n]) => {
        setStats({
          bookings: b.data.data.length,
          events: e.data.data.length,
          news: n.data.data.length,
        })
        setRecentBookings(b.data.data.slice(0, 4))
      }
    ).catch(() => {})
  }, [])

  const statusColor: Record<string, string> = {
    confirmed: '#22c55e',
    pending: '#f59e0b',
    cancelled: '#ef4444',
    rejected: '#6b7280',
  }

  return (
    <div>
      <div className={styles.greeting}>
        <h1>Welcome back, {user?.username} 👋</h1>
        <p>Here's what's happening today.</p>
      </div>

      <div className={styles.statGrid}>
        <Link to="/bookings" className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fdf0ea', color: 'var(--orange)' }}>
            <CalendarDays size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.bookings}</div>
            <div className={styles.statLabel}>Total Bookings</div>
          </div>
        </Link>
        <Link to="/events" className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <MapPin size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.events}</div>
            <div className={styles.statLabel}>Events</div>
          </div>
        </Link>
        <Link to="/news" className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#22c55e' }}>
            <Newspaper size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.news}</div>
            <div className={styles.statLabel}>News Articles</div>
          </div>
        </Link>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Bookings</h2>
          <Link to="/bookings" className={styles.seeAll}>See all →</Link>
        </div>
        <div className={styles.bookingList}>
          {recentBookings.length === 0 && (
            <div className={styles.empty}>No bookings yet.</div>
          )}
          {recentBookings.map((b: any) => (
            <div key={b.id} className={styles.bookingRow}>
              <div className={styles.bookingIcon}><Clock size={16} /></div>
              <div className={styles.bookingInfo}>
                <div className={styles.bookingLocation}>
                  {b.location?.Name ?? 'Unknown location'}
                </div>
                <div className={styles.bookingDate}>
                  {b.Booking_Date_Time
                    ? new Date(b.Booking_Date_Time).toLocaleString()
                    : '—'}
                </div>
              </div>
              <span
                className={styles.badge}
                style={{ color: statusColor[b.Booking_Status] || '#555' }}
              >
                {b.Booking_Status ?? 'unknown'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
