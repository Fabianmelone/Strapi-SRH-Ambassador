import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getEvents, createEvent, updateEvent, deleteEvent, getBookings, getMaterials, strapiMediaUrl, uploadMedia } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { canView, canEdit, canDelete, canCreate } from '../permissions'
import Modal from '../components/Modal'
import ImageUpload from '../components/ImageUpload'
import { Plus, X, MapPin, Users, Wifi, Package, Pencil, CalendarCheck, Trash2 } from 'lucide-react'
import styles from './Events.module.css'

export default function Events() {
  const { capabilities } = useAuth()
  const allowEdit = canEdit(capabilities, 'events')
  const allowDelete = canDelete(capabilities, 'events')
  const allowCreate = canCreate(capabilities, 'events')
  const [events, setEvents] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [confirmedBookings, setConfirmedBookings] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImageCleared, setEditImageCleared] = useState(false)

  const canClick = canView(capabilities, 'events')

  const emptyForm = {
    Name: '', Access: 'Public', Capacity: '', Is_online: false,
    Meeting_Link: '', Description: '', booking: '', location: '', materials: [] as number[],
    start: '', end: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)

  const load = async () => {
    // Events are the primary data — a failure here is a real error.
    const e = await getEvents()
    setEvents(e.data.data)
    // Bookings and materials are only needed to create/edit events. A role that
    // can read events but not these should still see the list, so we fetch them
    // best-effort and ignore permission failures.
    const [b, m] = await Promise.all([
      getBookings().catch(() => null),
      getMaterials().catch(() => null),
    ])
    if (b) setConfirmedBookings(b.data.data.filter((bk: any) => bk.Booking_Status === 'confirmed'))
    if (m) setMaterials(m.data.data)
  }

  useEffect(() => {
    load()
      .catch(() => setError('Could not connect to backend. Is Strapi running?'))
      .finally(() => setLoading(false))
  }, [])

  // Bookings already tied to an event — each confirmed booking backs at most one event.
  const usedBookingIds = new Set(events.map((ev: any) => ev.booking?.id).filter(Boolean))
  const availableBookings = confirmedBookings.filter((bk: any) => !usedBookingIds.has(bk.id))

  const eventImage = (ev: any, small = false): string | null => {
    const img = Array.isArray(ev?.Thumbnail) ? ev.Thumbnail[0] : ev?.Thumbnail
    const url = (small && img?.formats?.thumbnail?.url) || img?.url
    return url ? strapiMediaUrl(url) : null
  }

  const bookingLabel = (bk: any) => {
    const loc = bk?.location?.Name ?? 'No location'
    const when = bk?.Booking_Date_Time
      ? new Date(bk.Booking_Date_Time).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : 'no date'
    return `${loc} — ${when}`
  }

  const toggleMaterial = (
    setter: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    id: number,
  ) => setter(f => ({
    ...f,
    materials: f.materials.includes(id) ? f.materials.filter(x => x !== id) : [...f.materials, id],
  }))

  // Selecting a booking drives the event's location.
  const pickBooking = (
    setter: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    bookings: any[],
    bookingId: string,
  ) => {
    const bk = bookings.find((b: any) => String(b.id) === bookingId)
    setter(f => ({ ...f, booking: bookingId, location: bk?.location?.id ? String(bk.location.id) : '' }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const bk = availableBookings.find((b: any) => String(b.id) === form.booking)
    if (!bk) {
      setError('Please select a confirmed booking to create this event for.')
      return
    }
    setSubmitting(true)
    try {
      const thumbnail = imageFile ? await uploadMedia(imageFile) : undefined
      await createEvent({
        Name: form.Name, Access: form.Access as 'Public' | 'Private',
        Capacity: Number(form.Capacity), Is_online: form.Is_online,
        Meeting_Link: form.Is_online ? form.Meeting_Link : undefined,
        Description: form.Description || undefined,
        booking: bk.id,
        location: bk.location?.id,
        materials: form.materials,
        Thumbnail: thumbnail,
        duration: { start_datetime: form.start || null, end_datetime: form.end || null },
      })
      await load()
      setShowForm(false)
      setForm(emptyForm)
      setImageFile(null)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create event.')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = () => {
    if (!selected) return
    setEditForm({
      Name: selected.Name || '',
      Access: selected.Access || 'Public',
      Capacity: selected.Capacity ? String(selected.Capacity) : '',
      Is_online: !!selected.Is_online,
      Meeting_Link: selected.Meeting_Link || '',
      Description: selected.Description || '',
      booking: selected.booking?.id ? String(selected.booking.id) : '',
      location: selected.location?.id ? String(selected.location.id) : '',
      materials: Array.isArray(selected.materials) ? selected.materials.map((m: any) => m.id) : [],
      start: selected.duration?.start_datetime ? new Date(selected.duration.start_datetime).toISOString().slice(0, 16) : '',
      end: selected.duration?.end_datetime ? new Date(selected.duration.end_datetime).toISOString().slice(0, 16) : '',
    })
    setEditImageFile(null)
    setEditImageCleared(false)
    setEditing(true)
  }

  // Booking options while editing: still-free confirmed bookings, plus this event's own booking.
  const editBookingOptions = () => {
    const opts = [...availableBookings]
    if (selected?.booking && !opts.some(b => b.id === selected.booking.id)) opts.push(selected.booking)
    return opts
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSavingEdit(true)
    setError('')
    try {
      const bk = editBookingOptions().find((b: any) => String(b.id) === editForm.booking)
      const thumbnail = editImageFile ? await uploadMedia(editImageFile) : undefined
      const thumbnailField = thumbnail != null
        ? { Thumbnail: thumbnail }
        : editImageCleared ? { Thumbnail: null as unknown as number } : {}
      await updateEvent(selected.documentId, {
        Name: editForm.Name, Access: editForm.Access,
        Capacity: Number(editForm.Capacity), Is_online: editForm.Is_online,
        Meeting_Link: editForm.Is_online ? editForm.Meeting_Link : undefined,
        Description: editForm.Description || undefined,
        booking: bk ? bk.id : undefined,
        location: bk?.location?.id ?? (editForm.location ? Number(editForm.location) : undefined),
        materials: editForm.materials,
        duration: { start_datetime: editForm.start || null, end_datetime: editForm.end || null },
        ...thumbnailField,
      })
      const res = await getEvents()
      setEvents(res.data.data)
      setSelected(res.data.data.find((ev: any) => ev.id === selected.id) || null)
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update event.')
    } finally {
      setSavingEdit(false)
    }
  }

  const closeModal = () => { setSelected(null); setEditing(false); setError('') }

  const handleDelete = async () => {
    if (!selected || !confirm('Delete this event?')) return
    try {
      await deleteEvent(selected.documentId)
      setEvents(prev => prev.filter(ev => ev.id !== selected.id))
      closeModal()
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to delete event.')
    }
  }

  const noBookingsAvailable = availableBookings.length === 0

  return (
    <div>
      <div className={styles.pageHeader}>
        <div><h1>Events</h1><p>Each event is tied to one confirmed booking</p></div>
        {allowCreate && (
          <button className={styles.primaryBtn} onClick={() => { setForm(emptyForm); setShowForm(true) }}
            disabled={noBookingsAvailable}
            title={noBookingsAvailable ? 'You need an unused confirmed booking first' : ''}>
            <Plus size={16} /> New Event
          </button>
        )}
      </div>

      {error && !showForm && !selected && <div className={styles.error}>{error}</div>}

      {allowCreate && noBookingsAvailable && !loading && !error && (
        <div className={styles.infoBox}>
          Events can only be created from a <strong>confirmed</strong> booking that isn't already used by another event.
        </div>
      )}

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Create Event</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label>Confirmed Booking</label>
              <select value={form.booking} onChange={e => pickBooking(setForm, availableBookings, e.target.value)} required>
                <option value="">Select a confirmed booking…</option>
                {availableBookings.map((bk: any) => (
                  <option key={bk.id} value={bk.id}>{bookingLabel(bk)}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Event Name</label>
                <input type="text" value={form.Name} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} required placeholder="Summer Hackathon" />
              </div>
              <div className={styles.field}>
                <label>Access</label>
                <select value={form.Access} onChange={e => setForm(f => ({ ...f, Access: e.target.value }))}>
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label>Capacity</label>
              <input type="number" min={1} value={form.Capacity} onChange={e => setForm(f => ({ ...f, Capacity: e.target.value }))} required placeholder="50" />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Start</label>
                <input type="datetime-local" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>End</label>
                <input type="datetime-local" value={form.end} min={form.start || undefined} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div className={styles.field}>
              <label>Description</label>
              <textarea rows={3} value={form.Description} onChange={e => setForm(f => ({ ...f, Description: e.target.value }))} placeholder="What is this event about?" />
            </div>
            <ImageUpload label="Event image" file={imageFile} onChange={setImageFile} />
            <div className={styles.field}>
              <label>Materials</label>
              {materials.length === 0 ? (
                <span className={styles.hint}>No materials available. Add some on the Materials page.</span>
              ) : (
                <div className={styles.materialPicker}>
                  {materials.map((m: any) => (
                    <label key={m.id} className={`${styles.materialChip} ${form.materials.includes(m.id) ? styles.materialChipOn : ''}`}>
                      <input type="checkbox" checked={form.materials.includes(m.id)} onChange={() => toggleMaterial(setForm, m.id)} />
                      {m.Name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.checkRow}>
              <input type="checkbox" id="is_online" checked={form.Is_online} onChange={e => setForm(f => ({ ...f, Is_online: e.target.checked }))} />
              <label htmlFor="is_online">This is an online event</label>
            </div>
            {form.Is_online && (
              <div className={styles.field}>
                <label>Meeting Link</label>
                <input type="url" value={form.Meeting_Link} onChange={e => setForm(f => ({ ...f, Meeting_Link: e.target.value }))} placeholder="https://meet.google.com/..." />
              </div>
            )}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading events…</div>
      ) : events.length === 0 && !error ? (
        <div className={styles.emptyState}><MapPin size={40} strokeWidth={1.5} /><p>No events yet.</p></div>
      ) : (
        <div className={styles.grid}>
          {events.map((ev: any) => (
            <div
              key={ev.id}
              className={`${styles.eventCard} ${canClick ? styles.clickable : ''}`}
              onClick={() => canClick && setSelected(ev)}
            >
              {eventImage(ev, true) && (
                <div className={styles.cardImage}>
                  <img src={eventImage(ev, true)!} alt={ev.Name} />
                </div>
              )}
              <div className={styles.eventTop}>
                <span className={styles.accessBadge} data-access={ev.Access?.toLowerCase()}>{ev.Access ?? 'Public'}</span>
                {ev.Is_online && <span className={styles.onlineBadge}><Wifi size={12} /> Online</span>}
              </div>
              <h3 className={styles.eventName}>{ev.Name}</h3>
              {ev.Description && <p className={styles.eventDesc}>{ev.Description}</p>}
              <div className={styles.eventMeta}>
                {ev.location?.Name && <span><MapPin size={13} /> {ev.location.Name}</span>}
                {ev.Capacity && <span><Users size={13} /> {ev.Capacity} capacity</span>}
                {Array.isArray(ev.materials) && ev.materials.length > 0 && (
                  <span><Package size={13} /> {ev.materials.length} material{ev.materials.length > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal title={editing ? 'Edit Event' : selected.Name} onClose={closeModal}>
          {editing ? (
            <form onSubmit={saveEdit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.field}>
                <label>Confirmed Booking</label>
                <select value={editForm.booking} onChange={e => pickBooking(setEditForm, editBookingOptions(), e.target.value)} required>
                  <option value="">Select a confirmed booking…</option>
                  {editBookingOptions().map((bk: any) => (
                    <option key={bk.id} value={bk.id}>{bookingLabel(bk)}</option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Event Name</label>
                  <input type="text" value={editForm.Name} onChange={e => setEditForm(f => ({ ...f, Name: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label>Access</label>
                  <select value={editForm.Access} onChange={e => setEditForm(f => ({ ...f, Access: e.target.value }))}>
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label>Capacity</label>
                <input type="number" min={1} value={editForm.Capacity} onChange={e => setEditForm(f => ({ ...f, Capacity: e.target.value }))} required />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Start</label>
                  <input type="datetime-local" value={editForm.start} onChange={e => setEditForm(f => ({ ...f, start: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>End</label>
                  <input type="datetime-local" value={editForm.end} min={editForm.start || undefined} onChange={e => setEditForm(f => ({ ...f, end: e.target.value }))} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea rows={3} value={editForm.Description} onChange={e => setEditForm(f => ({ ...f, Description: e.target.value }))} />
              </div>
              <ImageUpload
                label="Event image"
                file={editImageFile}
                onChange={f => { setEditImageFile(f); if (f) setEditImageCleared(false) }}
                existingUrl={editImageCleared ? null : eventImage(selected)}
                onClear={() => setEditImageCleared(true)}
              />
              <div className={styles.field}>
                <label>Materials</label>
                {materials.length === 0 ? (
                  <span className={styles.hint}>No materials available.</span>
                ) : (
                  <div className={styles.materialPicker}>
                    {materials.map((m: any) => (
                      <label key={m.id} className={`${styles.materialChip} ${editForm.materials.includes(m.id) ? styles.materialChipOn : ''}`}>
                        <input type="checkbox" checked={editForm.materials.includes(m.id)} onChange={() => toggleMaterial(setEditForm, m.id)} />
                        {m.Name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.checkRow}>
                <input type="checkbox" id="edit_is_online" checked={editForm.Is_online} onChange={e => setEditForm(f => ({ ...f, Is_online: e.target.checked }))} />
                <label htmlFor="edit_is_online">This is an online event</label>
              </div>
              {editForm.Is_online && (
                <div className={styles.field}>
                  <label>Meeting Link</label>
                  <input type="url" value={editForm.Meeting_Link} onChange={e => setEditForm(f => ({ ...f, Meeting_Link: e.target.value }))} placeholder="https://meet.google.com/..." />
                </div>
              )}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className={styles.primaryBtn} disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {eventImage(selected) && (
                <div className={styles.detailImage}>
                  <img src={eventImage(selected)!} alt={selected.Name} />
                </div>
              )}
              <div className={styles.detailBadges}>
                <span className={styles.accessBadge} data-access={selected.Access?.toLowerCase()}>{selected.Access}</span>
                {selected.Is_online && <span className={styles.onlineBadge}><Wifi size={12} /> Online</span>}
              </div>
              {selected.Description && <p className={styles.detailDesc}>{selected.Description}</p>}
              <div className={styles.detailGrid}>
                {selected.location?.Name && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Location</span>
                    <span>{selected.location.Name}</span>
                  </div>
                )}
                {selected.booking && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Booking</span>
                    <span className={styles.bookingTag}><CalendarCheck size={13} /> {bookingLabel(selected.booking)}</span>
                  </div>
                )}
                {selected.Capacity && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Capacity</span>
                    <span>{selected.Capacity} people</span>
                  </div>
                )}
                {(selected.duration?.start_datetime || selected.duration?.end_datetime) && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Duration</span>
                    <span>
                      {(() => {
                        const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                        const s = selected.duration?.start_datetime
                        const en = selected.duration?.end_datetime
                        if (s && en) return `${fmt(s)} → ${fmt(en)}`
                        return fmt(s || en)
                      })()}
                    </span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Materials</span>
                  {Array.isArray(selected.materials) && selected.materials.length > 0 ? (
                    <div className={styles.materialTags}>
                      {selected.materials.map((m: any) => (
                        <span key={m.id} className={styles.materialTag}><Package size={11} /> {m.Name}</span>
                      ))}
                    </div>
                  ) : <span>—</span>}
                </div>
                {selected.Is_online && selected.Meeting_Link && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Meeting link</span>
                    <a href={selected.Meeting_Link} target="_blank" rel="noreferrer" className={styles.link}>
                      {selected.Meeting_Link}
                    </a>
                  </div>
                )}
              </div>
              {(allowEdit || allowDelete) && (
                <div className={styles.modalActions}>
                  {allowDelete && (
                    <button className={styles.deleteActionBtn} onClick={handleDelete}><Trash2 size={14} /> Delete</button>
                  )}
                  {allowEdit && (
                    <button className={styles.editBtn} onClick={openEdit}><Pencil size={14} /> Edit Event</button>
                  )}
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
