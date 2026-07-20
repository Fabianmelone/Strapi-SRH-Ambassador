import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getAllLocations, createLocation, updateLocation,
  deleteLocation, createAddress, updateAddress, strapiMediaUrl,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { canView, canEdit, canDelete, canCreate } from '../permissions'
import Modal from '../components/Modal'
import { Plus, X, Trash2, Building2, CheckCircle2, XCircle, Pencil } from 'lucide-react'
import styles from './Locations.module.css'

export default function Locations() {
  const { roleName, capabilities } = useAuth()
  const allowEdit = canEdit(capabilities, 'locations')
  const allowDelete = canDelete(capabilities, 'locations')
  const allowCreate = canCreate(capabilities, 'locations')
  const [locations, setLocations] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const canClick = canView(capabilities, 'locations')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    Name: '', type: 'SRH Building', min_capacity: '', max_capacity: '',
    is_available: true,
    street_name: '', building_number: '', postal_code: '', City: '', Country: '',
  })

  const [form, setForm] = useState({
    Name: '', type: 'SRH Building', min_capacity: '', max_capacity: '',
    is_available: true,
    street_name: '', building_number: '', postal_code: '', City: '', Country: '',
  })

  const fetchLocations = () =>
    getAllLocations()
      .then(res => { setLocations(res.data.data); })
      .catch(() => setError('Could not connect to backend. Is Strapi running?'))

  useEffect(() => {
    fetchLocations().finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const locRes = await createLocation({
        Name: form.Name,
        type: form.type,
        min_capacity: form.min_capacity ? Number(form.min_capacity) : undefined,
        max_capacity: form.max_capacity ? Number(form.max_capacity) : undefined,
        is_available: form.is_available,
      })

      if (form.street_name && form.City && form.Country) {
        const addrRes = await createAddress({
          street_name: form.street_name,
          building_number: Number(form.building_number) || 0,
          postal_code: Number(form.postal_code) || 0,
          City: form.City,
          Country: form.Country,
        })
        await updateLocation(locRes.data.data.documentId, { address: addrRes.data.data.id })
      }

      await fetchLocations()
      setShowForm(false)
      setForm({
        Name: '', type: 'SRH Building', min_capacity: '', max_capacity: '',
        is_available: true, street_name: '', building_number: '',
        postal_code: '', City: '', Country: '',
      })
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create location.')
    } finally {
      setSubmitting(false)
    }
  }

  const imageUrl = (loc: any, small = false): string | null => {
    const img = Array.isArray(loc?.location_image) ? loc.location_image[0] : loc?.location_image
    const url = (small && img?.formats?.thumbnail?.url) || img?.url
    return url ? strapiMediaUrl(url) : null
  }

  const handleToggleAvailability = async (loc: any) => {
    setTogglingId(loc.id)
    try {
      await updateLocation(loc.documentId, { is_available: !loc.is_available })
      await fetchLocations()
    } finally {
      setTogglingId(null)
    }
  }

  const openEdit = () => {
    if (!selected) return
    const addr = selected.address
    setEditForm({
      Name: selected.Name || '',
      type: selected.type || 'SRH Building',
      min_capacity: selected.min_capacity != null ? String(selected.min_capacity) : '',
      max_capacity: selected.max_capacity != null ? String(selected.max_capacity) : '',
      is_available: !!selected.is_available,
      street_name: addr?.street_name || '',
      building_number: addr?.building_number != null ? String(addr.building_number) : '',
      postal_code: addr?.postal_code != null ? String(addr.postal_code) : '',
      City: addr?.City || '',
      Country: addr?.Country || '',
    })
    setEditing(true)
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSavingEdit(true)
    setError('')
    try {
      await updateLocation(selected.documentId, {
        Name: editForm.Name,
        type: editForm.type,
        min_capacity: editForm.min_capacity ? Number(editForm.min_capacity) : undefined,
        max_capacity: editForm.max_capacity ? Number(editForm.max_capacity) : undefined,
        is_available: editForm.is_available,
      })

      const hasAddress = editForm.street_name && editForm.City && editForm.Country
      if (hasAddress) {
        const addrPayload = {
          street_name: editForm.street_name,
          building_number: Number(editForm.building_number) || 0,
          postal_code: Number(editForm.postal_code) || 0,
          City: editForm.City,
          Country: editForm.Country,
        }
        if (selected.address?.documentId) {
          await updateAddress(selected.address.documentId, addrPayload)
        } else {
          const addrRes = await createAddress(addrPayload)
          await updateLocation(selected.documentId, { address: addrRes.data.data.id })
        }
      }

      await fetchLocations()
      const res = await getAllLocations()
      setSelected(res.data.data.find((l: any) => l.id === selected.id) || null)
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update location.')
    } finally {
      setSavingEdit(false)
    }
  }

  const closeModal = () => { setSelected(null); setEditing(false); setError('') }

  const handleDelete = async (id: number, documentId: string) => {
    if (!confirm('Delete this location?')) return
    setDeletingId(id)
    try {
      await deleteLocation(documentId)
      setLocations(prev => prev.filter(l => l.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1>Locations</h1>
          <p>Manage bookable spaces and their addresses</p>
        </div>
        {allowCreate && (
          <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Location
          </button>
        )}
      </div>

      {error && !showForm && <div className={styles.error}>{error}</div>}

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Create Location</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.sectionLabel}>Location Details</div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Name</label>
                <input
                  type="text"
                  value={form.Name}
                  onChange={e => setForm(f => ({ ...f, Name: e.target.value }))}
                  required
                  placeholder="Main Hall"
                />
              </div>
              <div className={styles.field}>
                <label>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="SRH Building">SRH Building</option>
                  <option value="other building">Other Building</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Min Capacity</label>
                <input
                  type="number" min={0} value={form.min_capacity}
                  onChange={e => setForm(f => ({ ...f, min_capacity: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <div className={styles.field}>
                <label>Max Capacity</label>
                <input
                  type="number" min={0} value={form.max_capacity}
                  onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))}
                  placeholder="200"
                />
              </div>
            </div>

            <div className={styles.checkRow}>
              <input
                type="checkbox" id="is_available" checked={form.is_available}
                onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))}
              />
              <label htmlFor="is_available">Available for booking</label>
            </div>

            <div className={styles.sectionLabel} style={{ marginTop: 8 }}>
              Address <span className={styles.optional}>(optional)</span>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Street Name</label>
                <input
                  type="text" value={form.street_name}
                  onChange={e => setForm(f => ({ ...f, street_name: e.target.value }))}
                  placeholder="Berliner Strasse"
                />
              </div>
              <div className={styles.field}>
                <label>Building Number</label>
                <input
                  type="number" min={1} value={form.building_number}
                  onChange={e => setForm(f => ({ ...f, building_number: e.target.value }))}
                  placeholder="12"
                />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Postal Code</label>
                <input
                  type="number" value={form.postal_code}
                  onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                  placeholder="10115"
                />
              </div>
              <div className={styles.field}>
                <label>City</label>
                <input
                  type="text" value={form.City}
                  onChange={e => setForm(f => ({ ...f, City: e.target.value }))}
                  placeholder="Berlin"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Country</label>
              <input
                type="text" value={form.Country}
                onChange={e => setForm(f => ({ ...f, Country: e.target.value }))}
                placeholder="Germany"
              />
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading locations…</div>
      ) : locations.length === 0 && !error ? (
        <div className={styles.emptyState}>
          <Building2 size={40} strokeWidth={1.5} />
          <p>No locations yet. Add your first one.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {locations.map((loc: any) => {
            const addr = loc.address
            const available = loc.is_available
            return (
              <div key={loc.id} className={`${styles.locationCard} ${canClick ? styles.clickable : ''}`} onClick={() => canClick && setSelected(loc)}>
                {imageUrl(loc, true) && (
                  <div className={styles.cardImage}>
                    <img src={imageUrl(loc, true)!} alt={loc.Name} />
                  </div>
                )}
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.locName}>{loc.Name}</div>
                    <div className={styles.locType}>{loc.type}</div>
                  </div>
                  {allowEdit ? (
                    <button
                      className={`${styles.availBadge} ${available ? styles.availTrue : styles.availFalse}`}
                      onClick={e => { e.stopPropagation(); handleToggleAvailability(loc) }}
                      disabled={togglingId === loc.id}
                      title="Toggle availability"
                    >
                      {available ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {available ? 'Available' : 'Unavailable'}
                    </button>
                  ) : (
                    <span className={`${styles.availBadge} ${available ? styles.availTrue : styles.availFalse}`}>
                      {available ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {available ? 'Available' : 'Unavailable'}
                    </span>
                  )}
                </div>

                {addr && (
                  <div className={styles.address}>
                    {addr.street_name} {addr.building_number}, {addr.postal_code} {addr.City}, {addr.Country}
                  </div>
                )}

                {(loc.min_capacity || loc.max_capacity) && (
                  <div className={styles.capacity}>
                    Capacity: {loc.min_capacity ?? '—'} – {loc.max_capacity ?? '—'}
                  </div>
                )}

                {allowDelete && (
                  <div className={styles.cardActions}>
                    <button
                      className={styles.deleteBtn}
                      onClick={e => { e.stopPropagation(); handleDelete(loc.id, loc.documentId) }}
                      disabled={deletingId === loc.id}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <Modal title={editing ? 'Edit Location' : selected.Name} onClose={closeModal}>
          {editing ? (
            <form onSubmit={saveEdit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.sectionLabel}>Location Details</div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Name</label>
                  <input type="text" value={editForm.Name} onChange={e => setEditForm(f => ({ ...f, Name: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label>Type</label>
                  <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="SRH Building">SRH Building</option>
                    <option value="other building">Other Building</option>
                  </select>
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Min Capacity</label>
                  <input type="number" min={0} value={editForm.min_capacity} onChange={e => setEditForm(f => ({ ...f, min_capacity: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Max Capacity</label>
                  <input type="number" min={0} value={editForm.max_capacity} onChange={e => setEditForm(f => ({ ...f, max_capacity: e.target.value }))} />
                </div>
              </div>
              <div className={styles.checkRow}>
                <input type="checkbox" id="edit_is_available" checked={editForm.is_available} onChange={e => setEditForm(f => ({ ...f, is_available: e.target.checked }))} />
                <label htmlFor="edit_is_available">Available for booking</label>
              </div>
              <div className={styles.sectionLabel} style={{ marginTop: 8 }}>
                Address <span className={styles.optional}>(optional)</span>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Street Name</label>
                  <input type="text" value={editForm.street_name} onChange={e => setEditForm(f => ({ ...f, street_name: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Building Number</label>
                  <input type="number" min={1} value={editForm.building_number} onChange={e => setEditForm(f => ({ ...f, building_number: e.target.value }))} />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Postal Code</label>
                  <input type="number" value={editForm.postal_code} onChange={e => setEditForm(f => ({ ...f, postal_code: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>City</label>
                  <input type="text" value={editForm.City} onChange={e => setEditForm(f => ({ ...f, City: e.target.value }))} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Country</label>
                <input type="text" value={editForm.Country} onChange={e => setEditForm(f => ({ ...f, Country: e.target.value }))} />
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
              {imageUrl(selected) && (
                <div className={styles.detailImage}>
                  <img src={imageUrl(selected)!} alt={selected.Name} />
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span>{selected.type}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Availability</span>
                <span className={`${selected.is_available ? styles.availTrue : styles.availFalse}`}
                  style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
                  {selected.is_available ? <CheckCircle2 size={13}/> : <XCircle size={13}/>}
                  {selected.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              {selected.address && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Address</span>
                  <span>
                    {selected.address.street_name} {selected.address.building_number},&nbsp;
                    {selected.address.postal_code} {selected.address.City}, {selected.address.Country}
                  </span>
                </div>
              )}
              {(selected.min_capacity || selected.max_capacity) && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Capacity</span>
                  <span>{selected.min_capacity ?? '—'} – {selected.max_capacity ?? '—'} people</span>
                </div>
              )}
              {allowEdit && (
                <div className={styles.modalActions}>
                  <button className={styles.editBtn} onClick={openEdit}><Pencil size={14} /> Edit Location</button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
