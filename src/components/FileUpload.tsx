'use client';
import { useRef, useState, useCallback, DragEvent } from 'react';

interface Props {
  value?: string;                     // existing image data URI (optional)
  onChange: (dataUri: string | undefined) => void;
  label?: string;                     // button label
  maxSizeMB?: number;                 // default 2
  shape?: 'circle' | 'square';        // avatar = circle, logo = square
  size?: number;                      // preview size in px
}

export function FileUpload({
  value,
  onChange,
  label = 'Change photo',
  maxSizeMB = 2,
  shape = 'circle',
  size = 64,
}: Props) {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = 'image/png,image/jpeg,image/webp';

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.type.match(/^image\/(png|jpe?g|webp)$/)) {
        setError('Only PNG, JPG, or WebP allowed.');
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File must be under ${maxSizeMB} MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        setOpen(false);
      };
      reader.readAsDataURL(file);
    },
    [maxSizeMB, onChange]
  );

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function remove() {
    onChange(undefined);
  }

  const shapeCls = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Preview */}
        {value ? (
          <img
            src={value}
            alt=""
            style={{ width: size, height: size }}
            className={`${shapeCls} object-cover ring-1 ring-[rgb(var(--border))]`}
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className={`${shapeCls} flex items-center justify-center bg-[rgb(var(--surface-2))] text-[rgb(var(--fg-subtle))] ring-1 ring-[rgb(var(--border))]`}
          >
            <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-sm">
            {label}
          </button>
          {value && (
            <button type="button" onClick={remove} className="text-xs text-red-600 hover:underline text-left">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Hidden native input — used only when the modal is not desired */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onFileInput}
        className="hidden"
      />

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[rgb(var(--surface))] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Upload {shape === 'circle' ? 'photo' : 'image'}</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[rgb(var(--fg-muted))] hover:bg-[rgb(var(--surface-2))]"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={[
                'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition',
                drag
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-[rgb(var(--border))] hover:border-brand-400 hover:bg-[rgb(var(--surface-2))]',
              ].join(' ')}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[rgb(var(--fg))]">
                {drag ? 'Drop to upload' : 'Drag and drop, or click to browse'}
              </p>
              <p className="mt-1 text-xs text-[rgb(var(--fg-muted))]">
                PNG, JPG, or WebP · max {maxSizeMB} MB
              </p>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn-primary"
              >
                Choose file
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
