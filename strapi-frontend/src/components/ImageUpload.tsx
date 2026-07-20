import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import styles from './ImageUpload.module.css'

interface Props {
  /** The file the user just picked (null if none). */
  file: File | null
  onChange: (file: File | null) => void
  /** URL of an already-saved image (used when editing). */
  existingUrl?: string | null
  /** Called when the user removes the image (clears both new file and existing). */
  onClear?: () => void
  label?: string
}

export default function ImageUpload({ file, onChange, existingUrl, onClear, label = 'Image' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Build (and clean up) an object URL for the freshly picked file.
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shown = preview || existingUrl || null

  return (
    <div className={styles.field}>
      <label>{label}</label>
      {shown ? (
        <div className={styles.previewWrap}>
          <img src={shown} alt="preview" className={styles.preview} />
          <button
            type="button"
            className={styles.remove}
            onClick={() => { onChange(null); onClear?.(); if (inputRef.current) inputRef.current.value = '' }}
            title="Remove image"
          >
            <X size={16} />
          </button>
          <button type="button" className={styles.replace} onClick={() => inputRef.current?.click()}>
            Replace
          </button>
        </div>
      ) : (
        <button type="button" className={styles.dropzone} onClick={() => inputRef.current?.click()}>
          <ImagePlus size={22} />
          <span>Click to upload an image</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
