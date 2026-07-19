import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getNewsArticles, createNewsArticle, deleteNewsArticle } from '../api/client'
import { Plus, X, Trash2, Newspaper, Tag, Calendar } from 'lucide-react'
import styles from './News.module.css'

export default function News() {
  const [articles, setArticles] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    title: '',
    category: 'Blog',
    Content: '',
    uploaded_at: new Date().toISOString().split('T')[0],
  })

  const fetchArticles = () =>
    getNewsArticles().then(res => setArticles(res.data.data))

  useEffect(() => {
    fetchArticles().finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      // Strapi blocks format: wrap plain text in a simple paragraph block
      const blocksContent = [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: form.Content }],
        },
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

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this article?')) return
    setDeletingId(id)
    try {
      await deleteNewsArticle(id)
      setArticles(prev => prev.filter(a => a.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const categoryColor: Record<string, { color: string; bg: string }> = {
    Blog: { color: '#1e40af', bg: '#dbeafe' },
    Sports: { color: '#166534', bg: '#dcfce7' },
    Fashion: { color: '#6b21a8', bg: '#f3e8ff' },
  }

  const extractText = (content: any): string => {
    if (!content || !Array.isArray(content)) return ''
    return content
      .map((block: any) =>
        (block.children || []).map((c: any) => c.text || '').join('')
      )
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
        <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Article
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Write Article</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                placeholder="Article headline…"
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="Blog">Blog</option>
                  <option value="Sports">Sports</option>
                  <option value="Fashion">Fashion</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Date</label>
                <input
                  type="date"
                  value={form.uploaded_at}
                  onChange={e => setForm(f => ({ ...f, uploaded_at: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Content</label>
              <textarea
                rows={8}
                value={form.Content}
                onChange={e => setForm(f => ({ ...f, Content: e.target.value }))}
                required
                placeholder="Write your article content here…"
              />
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? 'Publishing…' : 'Publish Article'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading articles…</div>
      ) : articles.length === 0 ? (
        <div className={styles.emptyState}>
          <Newspaper size={40} strokeWidth={1.5} />
          <p>No articles yet. Write your first one.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {articles.map((a: any) => {
            const cat = a.attributes?.category || 'Blog'
            const catMeta = categoryColor[cat] || categoryColor.Blog
            const text = extractText(a.attributes?.Content)
            return (
              <div key={a.id} className={styles.articleCard}>
                <div className={styles.articleLeft}>
                  <div className={styles.articleMeta}>
                    <span className={styles.catBadge} style={{ color: catMeta.color, background: catMeta.bg }}>
                      <Tag size={11} /> {cat}
                    </span>
                    {a.attributes?.uploaded_at && (
                      <span className={styles.dateMeta}>
                        <Calendar size={11} />
                        {new Date(a.attributes.uploaded_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.articleTitle}>{a.attributes?.title}</h3>
                  {text && <p className={styles.articleExcerpt}>{text}{text.length >= 140 ? '…' : ''}</p>}
                  {a.attributes?.author?.data && (
                    <div className={styles.author}>By {a.attributes.author.data.attributes.username}</div>
                  )}
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  title="Delete article"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
