import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getBookings, getLocations, createBooking, updateBooking } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { canViewDetail } from '../permissions'
import Modal from '../components/Modal'
import { Plus, X, MapPin, Calendar, Pencil } from 'lucide-react'
import styles from './Bookings.module.css'

export default function Bookings() {
  const { roleName } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ Booking_Status: '', location: '', Booking_Date_Time: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const canClick = canViewDetail('bookings', roleName)

  const [form, setForm] = useState({ location: '', Booking_Date_Time: '' })

  useEffect(() => {
    Promise.all([getBookings(), getLocations()])
      .then(([b, l]) => { setBookings(b.data.data); setLocations(l.data.data) })
      .catch(() => setError('Could not connect to backend. Is Strapi running?'))
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

  const openEdit = () => {
    if (!selected) return
    setEditForm({
      Booking_Status: selected.Booking_Status || 'pending',
      location: selected.location?.id ? String(selected.location.id) : '',
      Booking_Date_Time: selected.Booking_Date_Time
        ? new Date(selected.Booking_Date_Time).toISOString().slice(0, 16)
        : '',
    })
    setEditing(true)
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSavingEdit(true)
    setError('')
    try {
      await updateBooking(selected.documentId, {
        Booking_Status: editForm.Booking_Status,
        location: editForm.location ? Number(editForm.location) : undefined,
        Booking_Date_Time: editForm.Booking_Date_Time || undefined,
      })
      const res = await getBookings()
      setBookings(res.data.data)
      setSelected(res.data.data.find((b: any) => b.id === selected.id) || null)
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update booking.')
    } finally {
      setSavingEdit(false)
    }
  }

  const closeModal = () => { setSelected(null); setEditing(false); setError('') }

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    confirmed: { label: 'Confirmed', color: '#166534', bg: '#dcfce7' },
    pending:   { label: 'Pending',   color: '#92400e', bg: '#fef3c7' },
    cancelled: { label: 'Cancelled', color: '#991b1b', bg: '#fee2e2' },
    rejected:  { label: 'Rejected',  color: '#374151', bg: '#f3f4f6' },
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

      {!showForm && error && <div className={styles.error}>{error}</div>}

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Create Booking</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label>Location</label>
              <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required>
                <option value="">Select a location…</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.Name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Date & Time</label>
              <input type="datetime-local" value={form.Booking_Date_Time} onChange={e => setForm(f => ({ ...f, Booking_Date_Time: e.target.value }))} required />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading bookings…</div>
      ) : bookings.length === 0 && !error ? (
        <div className={styles.emptyState}>
          <Calendar size={40} strokeWidth={1.5} />
          <p>No bookings yet. Create your first one.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {bookings.map((b: any) => {
            const status = b.Booking_Status || 'pending'
            const meta = statusMeta[status] || statusMeta.pending
            return (
              <div
                key={b.id}
                className={`${styles.card} ${canClick ? styles.clickable : ''}`}
                onClick={() => canClick && setSelected(b)}
              >
                <div className={styles.cardLeft}>
                  <div className={styles.locationName}><MapPin size={15} />{b.location?.Name ?? 'No location'}</div>
                  <div className={styles.cardDate}>
                    {b.Booking_Date_Time
                      ? new Date(b.Booking_Date_Time).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </div>
                  {b.Booking_id && <div className={styles.bookingId}>ID: {b.Booking_id}</div>}
                </div>
                <span className={styles.statusBadge} style={{ color: meta.color, background: meta.bg }}>
                  {meta.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {selected && (() => {
        const status = selected.Booking_Status || 'pending'
        const meta = statusMeta[status] || statusMeta.pending
        return (
          <Modal title={editing ? 'Edit Booking' : 'Booking Details'} onClose={closeModal}>
            {editing ? (
              <form onSubmit={saveEdit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.field}>
                  <label>Status</label>
                  <select value={editForm.Booking_Status} onChange={e => setEditForm(f => ({ ...f, Booking_Status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Location</label>
                  <select value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} required>
                    <option value="">Select a location…</option>
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>{loc.Name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Date & Time</label>
                  <input type="datetime-local" value={editForm.Booking_Date_Time} onChange={e => setEditForm(f => ({ ...f, Booking_Date_Time: e.target.value }))} required />
                </div>
                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className={styles.primaryBtn} disabled={savingEdit}>
                    {savingEdit ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Location</span>
                  <span>{selected.location?.Name ?? '—'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Date & Time</span>
                  <span>
                    {selected.Booking_Date_Time
                      ? new Date(selected.Booking_Date_Time).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
                      : '—'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.statusBadge} style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                </div>
                {selected.Booking_id && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Booking ID</span>
                    <span className={styles.bookingId}>{selected.Booking_id}</span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Created</span>
                  <span>{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'}</span>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.editBtn} onClick={openEdit}><Pencil size={14} /> Edit Booking</button>
                </div>
              </>
            )}
          </Modal>
        )
      })()}
    </div>
  )
}
