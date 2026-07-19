import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getBookings, getLocations, createBooking } from '../api/client'
import { Plus, X, MapPin, Calendar } from 'lucide-react'
import styles from './Bookings.module.css'

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    location: '',
    Booking_Date_Time: '',
  })

  useEffect(() => {
    Promise.all([getBookings(), getLocations()])
      .then(([b, l]) => {
        setBookings(b.data.data)
        setLocations(l.data.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createBooking({
        Booking_Date_Time: form.Booking_Date_Time,
        location: Number(form.location),
        Booking_Status: 'pending',
      })
      const res = await getBookings()
      setBookings(res.data.data)
      setShowForm(false)
      setForm({ location: '', Booking_Date_Time: '' })
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create booking.')
    } finally {
      setSubmitting(false)
    }
  }

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    confirmed: { label: 'Confirmed', color: '#166534', bg: '#dcfce7' },
    pending: { label: 'Pending', color: '#92400e', bg: '#fef3c7' },
    cancelled: { label: 'Cancelled', color: '#991b1b', bg: '#fee2e2' },
    rejected: { label: 'Rejected', color: '#374151', bg: '#f3f4f6' },
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1>Bookings</h1>
          <p>Manage location reservations</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Booking
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Create Booking</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label>Location</label>
              <select
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                required
              >
                <option value="">Select a location…</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.attributes.Name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Date & Time</label>
              <input
                type="datetime-local"
                value={form.Booking_Date_Time}
                onChange={e => setForm(f => ({ ...f, Booking_Date_Time: e.target.value }))}
                required
              />
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading bookings…</div>
      ) : bookings.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={40} strokeWidth={1.5} />
          <p>No bookings yet. Create your first one.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {bookings.map((b: any) => {
            const status = b.attributes?.Booking_Status || 'pending'
            const meta = statusMeta[status] || statusMeta.pending
            return (
              <div key={b.id} className={styles.card}>
                <div className={styles.cardLeft}>
                  <div className={styles.locationName}>
                    <MapPin size={15} />
                    {b.attributes?.location?.data?.attributes?.Name ?? 'No location'}
                  </div>
                  <div className={styles.cardDate}>
                    {b.attributes?.Booking_Date_Time
                      ? new Date(b.attributes.Booking_Date_Time).toLocaleString('en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </div>
                  {b.attributes?.Booking_id && (
                    <div className={styles.bookingId}>ID: {b.attributes.Booking_id}</div>
                  )}
                </div>
                <span
                  className={styles.statusBadge}
                  style={{ color: meta.color, background: meta.bg }}
                >
                  {meta.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
