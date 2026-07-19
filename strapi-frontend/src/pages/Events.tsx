import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getEvents, getLocations, createEvent, getBookings } from '../api/client'
import { Plus, X, MapPin, Users, Wifi } from 'lucide-react'
import styles from './Events.module.css'

export default function Events() {
  const [events, setEvents] = useState<any[]>([])
  const [approvedBookingLocations, setApprovedBookingLocations] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    Name: '',
    Access: 'Public',
    Capacity: '',
    Is_online: false,
    Meeting_Link: '',
    Description: '',
    location: '',
  })

  useEffect(() => {
    Promise.all([getEvents(), getLocations(), getBookings()])
      .then(([e, l, b]) => {
        setEvents(e.data.data)
        // Only allow locations that have a confirmed booking
        const confirmedLocationIds = new Set(
          b.data.data
            .filter((bk: any) => bk.attributes?.Booking_Status === 'confirmed')
            .map((bk: any) => bk.attributes?.location?.data?.id)
            .filter(Boolean)
        )
        setApprovedBookingLocations(
          l.data.data.filter((loc: any) => confirmedLocationIds.has(loc.id))
        )
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createEvent({
        Name: form.Name,
        Access: form.Access as 'Public' | 'Private',
        Capacity: Number(form.Capacity),
        Is_online: form.Is_online,
        Meeting_Link: form.Is_online ? form.Meeting_Link : undefined,
        Description: form.Description || undefined,
        location: Number(form.location),
      })
      const res = await getEvents()
      setEvents(res.data.data)
      setShowForm(false)
      setForm({ Name: '', Access: 'Public', Capacity: '', Is_online: false, Meeting_Link: '', Description: '', location: '' })
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create event.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1>Events</h1>
          <p>Events linked to confirmed bookings</p>
        </div>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowForm(true)}
          disabled={approvedBookingLocations.length === 0}
          title={approvedBookingLocations.length === 0 ? 'You need a confirmed booking first' : ''}
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      {approvedBookingLocations.length === 0 && !loading && (
        <div className={styles.infoBox}>
          Events can only be created for locations with a <strong>confirmed</strong> booking. Once a booking is approved, you'll be able to create events here.
        </div>
      )}

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Create Event</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Event Name</label>
                <input
                  type="text"
                  value={form.Name}
                  onChange={e => setForm(f => ({ ...f, Name: e.target.value }))}
                  required
                  placeholder="Summer Hackathon"
                />
              </div>
              <div className={styles.field}>
                <label>Access</label>
                <select
                  value={form.Access}
                  onChange={e => setForm(f => ({ ...f, Access: e.target.value }))}
                >
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Location</label>
                <select
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  required
                >
                  <option value="">Select confirmed location…</option>
                  {approvedBookingLocations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.attributes.Name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={form.Capacity}
                  onChange={e => setForm(f => ({ ...f, Capacity: e.target.value }))}
                  required
                  placeholder="50"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Description</label>
              <textarea
                rows={3}
                value={form.Description}
                onChange={e => setForm(f => ({ ...f, Description: e.target.value }))}
                placeholder="What is this event about?"
              />
            </div>

            <div className={styles.checkRow}>
              <input
                type="checkbox"
                id="is_online"
                checked={form.Is_online}
                onChange={e => setForm(f => ({ ...f, Is_online: e.target.checked }))}
              />
              <label htmlFor="is_online">This is an online event</label>
            </div>

            {form.Is_online && (
              <div className={styles.field}>
                <label>Meeting Link</label>
                <input
                  type="url"
                  value={form.Meeting_Link}
                  onChange={e => setForm(f => ({ ...f, Meeting_Link: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading events…</div>
      ) : events.length === 0 ? (
        <div className={styles.emptyState}>
          <MapPin size={40} strokeWidth={1.5} />
          <p>No events yet. Create one from a confirmed booking.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {events.map((ev: any) => (
            <div key={ev.id} className={styles.eventCard}>
              <div className={styles.eventTop}>
                <span className={styles.accessBadge} data-access={ev.attributes?.Access?.toLowerCase()}>
                  {ev.attributes?.Access ?? 'Public'}
                </span>
                {ev.attributes?.Is_online && (
                  <span className={styles.onlineBadge}><Wifi size={12} /> Online</span>
                )}
              </div>
              <h3 className={styles.eventName}>{ev.attributes?.Name}</h3>
              {ev.attributes?.Description && (
                <p className={styles.eventDesc}>{ev.attributes.Description}</p>
              )}
              <div className={styles.eventMeta}>
                {ev.attributes?.location?.data && (
                  <span><MapPin size={13} /> {ev.attributes.location.data.attributes.Name}</span>
                )}
                {ev.attributes?.Capacity && (
                  <span><Users size={13} /> {ev.attributes.Capacity} capacity</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
