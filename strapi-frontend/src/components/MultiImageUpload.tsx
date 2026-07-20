import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import styles from './MultiImageUpload.module.css'

export interface ExistingImage {
  id: number
  url: string
}

interface Props {
  /** New files the user picked (to be uploaded on save). */
  files: File[]
  onFilesChange: (files: File[]) => void
  /** Already-saved images kept for this entry (used when editing). */
  existing?: ExistingImage[]
  onExistingChange?: (existing: ExistingImage[]) => void
  label?: string
}

export default function MultiImageUpload({
  files, onFilesChange, existing = [], onExistingChange, label = 'Images',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])

  // Object URLs for the freshly picked files, rebuilt when the list changes.
  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [files])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    onFilesChange([...files, ...Array.from(list)])
  }

  const removeExisting = (id: number) =>
    onExistingChange?.(existing.filter(e => e.id !== id))

  const removeFile = (idx: number) =>
    onFilesChange(files.filter((_, i) => i !== idx))

  return (
    <div className={styles.field}>
      <label>{label}</label>
      <div className={styles.grid}>
        {existing.map(img => (
          <div key={`e-${img.id}`} className={styles.tile}>
            <img src={img.url} alt="" />
            <button type="button" className={styles.remove} onClick={() => removeExisting(img.id)} title="Remove image">
              <X size={14} />
            </button>
          </div>
        ))}
        {files.map((_, idx) => (
          <div key={`f-${idx}`} className={styles.tile}>
            {previews[idx] && <img src={previews[idx]} alt="" />}
            <button type="button" className={styles.remove} onClick={() => removeFile(idx)} title="Remove image">
              <X size={14} />
            </button>
          </div>
        ))}
        <button type="button" className={styles.addTile} onClick={() => inputRef.current?.click()}>
          <ImagePlus size={22} />
          <span>Add</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => { addFiles(e.target.files); if (inputRef.current) inputRef.current.value = '' }}
      />
    </div>
  )
}
