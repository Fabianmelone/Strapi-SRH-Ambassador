import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getNewsArticles, createNewsArticle, updateNewsArticle, deleteNewsArticle, strapiMediaUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { canView, canEdit, canDelete, canCreate } from '../permissions'
import Modal from '../components/Modal'
import { Plus, X, Trash2, Newspaper, Tag, Calendar, Pencil } from 'lucide-react'
import styles from './News.module.css'

export default function News() {
  const { roleName, capabilities } = useAuth()
  const allowEdit = canEdit(capabilities, 'news')
  const allowDelete = canDelete(capabilities, 'news')
  const allowCreate = canCreate(capabilities, 'news')
  const [articles, setArticles] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', category: 'Blog', Content: '', uploaded_at: '' })

  const canClick = canView(capabilities, 'news')

  const [form, setForm] = useState({
    title: '',
    category: 'Blog',
    Content: '',
    uploaded_at: new Date().toISOString().split('T')[0],
  })

  const fetchArticles = () =>
    getNewsArticles()
      .then(res => { setArticles(res.data.data); setFetchError('') })
      .catch(err => setFetchError(
        err?.response?.data?.error?.message || 'Could not connect to backend. Is Strapi running?'
      ))

  useEffect(() => { fetchArticles().finally(() => setLoading(false)) }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const blocksContent = [
        { type: 'paragraph', children: [{ type: 'text', text: form.Content }] },
      ]
      await createNewsArticle({
        title: form.title,
        category: form.category,
        Content: blocksContent,
        uploaded_at: form.uploaded_at,
      })
      await fetchArticles()
      setShowForm(false)
      setForm({ title: '', category: 'Blog', Content: '', uploaded_at: new Date().toISOString().split('T')[0] })
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create article.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number, documentId: string) => {
    if (!confirm('Delete this article?')) return
    setDeletingId(id)
    try {
      await deleteNewsArticle(documentId)
      setArticles(prev => prev.filter(a => a.id !== id))
      if (selected?.id === id) setSelected(null)
    } finally {
      setDeletingId(null)
    }
  }

  const fullText = (content: any): string => {
    if (!content || !Array.isArray(content)) return typeof content === 'string' ? content : ''
    return content
      .map((block: any) => (block.children || []).map((c: any) => c.text || '').join(''))
      .join('\n\n')
  }

  const openEdit = () => {
    if (!selected) return
    setEditForm({
      title: selected.title || '',
      category: selected.category || 'Blog',
      Content: fullText(selected.Content),
      uploaded_at: selected.uploaded_at || new Date().toISOString().split('T')[0],
    })
    setEditing(true)
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSavingEdit(true)
    setError('')
    try {
      const blocksContent = editForm.Content.split('\n\n').map(p => ({
        type: 'paragraph', children: [{ type: 'text', text: p }],
      }))
      await updateNewsArticle(selected.documentId, {
        title: editForm.title,
        category: editForm.category,
        Content: blocksContent,
        uploaded_at: editForm.uploaded_at,
      })
      await fetchArticles()
      const res = await getNewsArticles()
      setSelected(res.data.data.find((a: any) => a.id === selected.id) || null)
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update article.')
    } finally {
      setSavingEdit(false)
    }
  }

  const closeModal = () => { setSelected(null); setEditing(false); setError('') }

  const categoryColor: Record<string, { color: string; bg: string }> = {
    Blog:    { color: '#1e40af', bg: '#dbeafe' },
    Sports:  { color: '#166534', bg: '#dcfce7' },
    Fashion: { color: '#6b21a8', bg: '#f3e8ff' },
  }

  const thumbUrl = (a: any): string | null => {
    const url = a?.thumbnail?.formats?.thumbnail?.url || a?.thumbnail?.url
    return url ? strapiMediaUrl(url) : null
  }

  const extractText = (content: any): string => {
    if (!content || !Array.isArray(content)) return ''
    return content
      .map((block: any) => (block.children || []).map((c: any) => c.text || '').join(''))
      .join(' ')
      .slice(0, 140)
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1>News Articles</h1>
          <p>Publish and manage news content</p>
        </div>
        {allowCreate && (
          <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Article
          </button>
        )}
      </div>

      {fetchError && <div className={styles.error}>{fetchError}</div>}

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Write Article</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label>Title</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Article headline…" />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="Blog">Blog</option>
                  <option value="Sports">Sports</option>
                  <option value="Fashion">Fashion</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Date</label>
                <input type="date" value={form.uploaded_at} onChange={e => setForm(f => ({ ...f, uploaded_at: e.target.value }))} required />
              </div>
            </div>
            <div className={styles.field}>
              <label>Content</label>
              <textarea rows={8} value={form.Content} onChange={e => setForm(f => ({ ...f, Content: e.target.value }))} required placeholder="Write your article content here…" />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? 'Publishing…' : 'Publish Article'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading articles…</div>
      ) : articles.length === 0 && !fetchError ? (
        <div className={styles.emptyState}>
          <Newspaper size={40} strokeWidth={1.5} />
          <p>No articles yet. Write your first one.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {articles.map((a: any) => {
            const cat = a.category || 'Blog'
            const catMeta = categoryColor[cat] || categoryColor.Blog
            const text = extractText(a.Content)
            const thumb = thumbUrl(a)
            return (
              <div
                key={a.id}
                className={`${styles.articleCard} ${canClick ? styles.clickable : ''}`}
                onClick={() => canClick && setSelected(a)}
              >
                {thumb && (
                  <div className={styles.thumb}>
                    <img src={thumb} alt={a.title} />
                  </div>
                )}
                <div className={styles.articleLeft}>
                  <h3 className={styles.articleTitle}>{a.title}</h3>
                  {text && <p className={styles.articleExcerpt}>{text}{text.length >= 140 ? '…' : ''}</p>}
                  <div className={styles.articleMeta}>
                    <span className={styles.catBadge} style={{ color: catMeta.color, background: catMeta.bg }}>
                      <Tag size={11} /> {cat}
                    </span>
                  </div>
                </div>
                {allowDelete && (
                  <button
                    className={styles.deleteBtn}
                    onClick={e => { e.stopPropagation(); handleDelete(a.id, a.documentId) }}
                    disabled={deletingId === a.id}
                    title="Delete article"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <Modal title={editing ? 'Edit Article' : selected.title} onClose={closeModal}>
          {editing ? (
            <form onSubmit={saveEdit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.field}>
                <label>Title</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Category</label>
                  <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="Blog">Blog</option>
                    <option value="Sports">Sports</option>
                    <option value="Fashion">Fashion</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Date</label>
                  <input type="date" value={editForm.uploaded_at} onChange={e => setEditForm(f => ({ ...f, uploaded_at: e.target.value }))} required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Content</label>
                <textarea rows={8} value={editForm.Content} onChange={e => setEditForm(f => ({ ...f, Content: e.target.value }))} required />
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
              {thumbUrl(selected) && (
                <div className={styles.detailThumb}>
                  <img src={strapiMediaUrl(selected.thumbnail.url)} alt={selected.title} />
                </div>
              )}
              <div className={styles.detailMeta}>
                {(() => {
                  const catMeta = categoryColor[selected.category] || categoryColor.Blog
                  return (
                    <span className={styles.catBadge} style={{ color: catMeta.color, background: catMeta.bg }}>
                      <Tag size={11} /> {selected.category}
                    </span>
                  )
                })()}
                {selected.uploaded_at && (
                  <span className={styles.dateMeta}>
                    <Calendar size={11} />
                    {new Date(selected.uploaded_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                  </span>
                )}
              </div>
              {selected.author?.username && (
                <div className={styles.detailAuthor}>By {selected.author.username}</div>
              )}
              <div className={styles.detailContent}>
                {Array.isArray(selected.Content)
                  ? selected.Content.map((block: any, i: number) => (
                      <p key={i}>
                        {(block.children || []).map((c: any) => c.text || '').join('')}
                      </p>
                    ))
                  : <p>{selected.Content}</p>
                }
              </div>
              {allowEdit && (
                <div className={styles.modalActions}>
                  <button className={styles.editBtn} onClick={openEdit}><Pencil size={14} /> Edit Article</button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
