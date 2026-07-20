import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getMaterials, getMaterialCategories, createMaterial,
  createMaterialCategory, deleteMaterial, updateMaterial,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { canViewDetail, canEdit, canDelete, canCreate } from '../permissions'
import Modal from '../components/Modal'
import { Plus, X, Trash2, Package, Tag, Pencil } from 'lucide-react'
import styles from './Materials.module.css'

export default function Materials() {
  const { roleName, capabilities } = useAuth()
  const allowEdit = canEdit(capabilities, 'materials')
  const allowDelete = canDelete(capabilities, 'materials')
  const allowCreate = canCreate(capabilities, 'materials')
  const [materials, setMaterials] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const canClick = canViewDetail('materials', roleName)
  const [showCatForm, setShowCatForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({ Name: '', Capacity: '', material_category: '' })

  const [form, setForm] = useState({
    Name: '',
    Capacity: '',
    material_category: '',
  })

  const fetchAll = () =>
    Promise.all([getMaterials(), getMaterialCategories()]).then(([m, c]) => {
      setMaterials(m.data.data)
      setCategories(c.data.data)
    })

  useEffect(() => {
    fetchAll()
      .catch(() => setError('Could not connect to backend. Is Strapi running?'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createMaterial({
        Name: form.Name,
        Capacity: form.Capacity ? Number(form.Capacity) : undefined,
        material_category: form.material_category ? Number(form.material_category) : undefined,
      })
      await fetchAll()
      setShowForm(false)
      setForm({ Name: '', Capacity: '', material_category: '' })
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create material.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      await createMaterialCategory({ Name: newCatName.trim() })
      const res = await getMaterialCategories()
      setCategories(res.data.data)
      setNewCatName('')
      setShowCatForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create category.')
    }
  }

  const openEdit = () => {
    if (!selected) return
    setEditForm({
      Name: selected.Name || '',
      Capacity: selected.Capacity != null ? String(selected.Capacity) : '',
      material_category: selected.material_category?.id ? String(selected.material_category.id) : '',
    })
    setEditing(true)
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSavingEdit(true)
    setError('')
    try {
      await updateMaterial(selected.documentId, {
        Name: editForm.Name,
        Capacity: editForm.Capacity ? Number(editForm.Capacity) : undefined,
        material_category: editForm.material_category ? Number(editForm.material_category) : undefined,
      })
      await fetchAll()
      const res = await getMaterials()
      setSelected(res.data.data.find((m: any) => m.id === selected.id) || null)
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update material.')
    } finally {
      setSavingEdit(false)
    }
  }

  const closeModal = () => { setSelected(null); setEditing(false); setError('') }

  const handleDelete = async (id: number, documentId: string) => {
    if (!confirm('Delete this material?')) return
    setDeletingId(id)
    try {
      await deleteMaterial(documentId)
      setMaterials(prev => prev.filter(m => m.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1>Materials</h1>
          <p>Manage inventory items and categories</p>
        </div>
        {allowCreate && (
          <div className={styles.headerActions}>
            <button className={styles.secondaryBtn} onClick={() => setShowCatForm(v => !v)}>
              <Tag size={15} /> {showCatForm ? 'Cancel' : 'Add Category'}
            </button>
            <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Material
            </button>
          </div>
        )}
      </div>

      {error && !showForm && <div className={styles.error}>{error}</div>}

      {showCatForm && (
        <div className={styles.inlineForm}>
          <form onSubmit={handleAddCategory} className={styles.catForm}>
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Category name…"
              required
              autoFocus
            />
            <button type="submit" className={styles.primaryBtn}>Add</button>
          </form>
          <div className={styles.catChips}>
            {categories.map((c: any) => (
              <span key={c.id} className={styles.catChip}>{c.Name}</span>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Add Material</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Name</label>
                <input
                  type="text"
                  value={form.Name}
                  onChange={e => setForm(f => ({ ...f, Name: e.target.value }))}
                  required
                  placeholder="Projector"
                />
              </div>
              <div className={styles.field}>
                <label>Capacity / Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={form.Capacity}
                  onChange={e => setForm(f => ({ ...f, Capacity: e.target.value }))}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Category</label>
              <select
                value={form.material_category}
                onChange={e => setForm(f => ({ ...f, material_category: e.target.value }))}
              >
                <option value="">No category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.Name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? 'Saving…' : 'Add Material'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading materials…</div>
      ) : materials.length === 0 && !error ? (
        <div className={styles.emptyState}>
          <Package size={40} strokeWidth={1.5} />
          <p>No materials yet. Add your first item.</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>Category</span>
            <span>Quantity</span>
            <span></span>
          </div>
          {materials.map((m: any) => (
            <div key={m.id} className={`${styles.tableRow} ${canClick ? styles.clickable : ''}`} onClick={() => canClick && setSelected(m)}>
              <span className={styles.materialName}>{m.Name}</span>
              <span>
                {m.material_category?.Name ? (
                  <span className={styles.catBadge}>{m.material_category.Name}</span>
                ) : (
                  <span className={styles.noCategory}>—</span>
                )}
              </span>
              <span className={styles.capacity}>{m.Capacity ?? '—'}</span>
              <span className={styles.actions}>
                {allowDelete && (
                  <button
                    className={styles.deleteBtn}
                    onClick={e => { e.stopPropagation(); handleDelete(m.id, m.documentId) }}
                    disabled={deletingId === m.id}
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal title={editing ? 'Edit Material' : selected.Name} onClose={closeModal}>
          {editing ? (
            <form onSubmit={saveEdit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.field}>
                <label>Name</label>
                <input type="text" value={editForm.Name} onChange={e => setEditForm(f => ({ ...f, Name: e.target.value }))} required />
              </div>
              <div className={styles.field}>
                <label>Capacity / Quantity</label>
                <input type="number" min={1} value={editForm.Capacity} onChange={e => setEditForm(f => ({ ...f, Capacity: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Category</label>
                <select value={editForm.material_category} onChange={e => setEditForm(f => ({ ...f, material_category: e.target.value }))}>
                  <option value="">No category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.Name}</option>
                  ))}
                </select>
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
                <span className={styles.detailLabel}>Category</span>
                <span>
                  {selected.material_category?.Name
                    ? <span className={styles.catBadge}>{selected.material_category.Name}</span>
                    : '—'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Quantity / Capacity</span>
                <span>{selected.Capacity ?? '—'}</span>
              </div>
              {allowEdit && (
                <div className={styles.modalActions}>
                  <button className={styles.editBtn} onClick={openEdit}><Pencil size={14} /> Edit Material</button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
