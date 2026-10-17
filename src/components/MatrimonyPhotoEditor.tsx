'use client';

import { useEffect, useId, useRef, useState } from 'react';
import MatrimonyImage from '@/components/MatrimonyImage';
import { MAX_MATRIMONY_PHOTOS, processMatrimonyPhotos, validateMatrimonyPhotos } from '@/services/matrimonyPhotos';
import { useAppStore } from '@/store/useAppStore';

export interface MatrimonyPhotoEditorProps {
  existing: string[];
  files: File[];
  onExistingChange: (urls: string[]) => void;
  onFilesChange: (files: File[]) => void;
  onProcessingChange?: (busy: boolean) => void;
  disabled?: boolean;
}

type Account = ReturnType<typeof useAppStore.getState>['user'];
const accountIdentity = (user: Account) => user ? `${user.uid}:${user._id || ''}` : '';
const iconButton = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-600 focus-visible:outline-2 focus-visible:outline-rose-500 active:scale-95 disabled:opacity-40';

export default function MatrimonyPhotoEditor(props: MatrimonyPhotoEditorProps) {
  const owner = useAppStore(state => accountIdentity(state.user));
  return <PhotoEditor key={owner} {...props} owner={owner} />;
}

function PhotoEditor({ existing, files, onExistingChange, onFilesChange, onProcessingChange, disabled = false, owner }: MatrimonyPhotoEditorProps & { owner: string }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const operation = useRef<{ controller: AbortController; notify?: (busy: boolean) => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = existing.length + files.length;
  const locked = disabled || busy;

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = useAppStore.subscribe(state => {
      if (accountIdentity(state.user) !== owner) operation.current?.controller.abort();
    });
    return () => {
      mounted.current = false;
      unsubscribe();
      const pending = operation.current;
      operation.current = null;
      pending?.controller.abort();
      pending?.notify?.(false);
    };
  }, [owner]);

  useEffect(() => () => { operation.current?.controller.abort(); }, [existing, files, disabled]);

  async function add(selected: File[]) {
    if (!selected.length || disabled || operation.current) return;
    setError('');
    try { validateMatrimonyPhotos(selected, total); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Choose JPEG, PNG or WebP photos.'); return; }
    const pending = { controller: new AbortController(), notify: onProcessingChange };
    operation.current = pending;
    setBusy(true); pending.notify?.(true);
    const current = () => mounted.current && operation.current === pending && !pending.controller.signal.aborted && accountIdentity(useAppStore.getState().user) === owner;
    try {
      const prepared = await processMatrimonyPhotos(selected, pending.controller.signal);
      if (current()) onFilesChange([...files, ...prepared]);
    } catch (failure) {
      if (current()) setError(failure instanceof Error ? failure.message : 'Could not prepare these photos. Try smaller JPEG, PNG or WebP files.');
    } finally {
      if (operation.current === pending) {
        operation.current = null;
        if (mounted.current) setBusy(false);
        pending.notify?.(false);
      }
    }
  }

  return <div aria-busy={busy} className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={id} className="text-[11px] font-semibold text-gray-600">Profile Photos <span className="font-normal text-gray-400">(optional)</span></label>
      <span className="text-[10px] text-gray-500">{total}/{MAX_MATRIMONY_PHOTOS}</span>
    </div>
    <input ref={input} id={id} type="file" tabIndex={-1} multiple accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={locked || total >= MAX_MATRIMONY_PHOTOS} aria-describedby={error ? id + '-error' : undefined} aria-invalid={!!error} className="sr-only" onChange={event => {
      const selected = Array.from(event.currentTarget.files || []);
      event.currentTarget.value = '';
      void add(selected);
    }} />
    {total > 0 && <ul className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3 sm:grid-cols-5">
      {existing.map((url, index) => <li key={url + ':' + index} className="min-w-0">
        <MatrimonyImage src={url} alt={`Existing profile photo ${index + 1}`} className="aspect-[4/5] w-full rounded-lg object-cover text-xl" />
        <div className="mt-1 flex items-center justify-between gap-1"><span className="text-[10px] text-gray-500">Saved</span><button type="button" disabled={locked} aria-label={`Remove existing photo ${index + 1}`} title="Remove photo" className={iconButton} onClick={() => { setError(''); onExistingChange(existing.filter((_, at) => at !== index)); }}><i aria-hidden="true" className="fas fa-trash" /></button></div>
      </li>)}
      {files.map((file, index) => <li key={`${file.name}:${file.size}:${file.lastModified}:${index}`} className="min-w-0">
        <LocalPhoto file={file} alt={`New profile photo ${index + 1}`} />
        <div className="mt-1 flex items-center justify-between gap-1"><span className="text-[10px] text-gray-500">{Math.max(1, Math.ceil(file.size / 1024))} KB</span><button type="button" disabled={locked} aria-label={`Remove new photo ${index + 1}`} title="Remove photo" className={iconButton} onClick={() => { setError(''); onFilesChange(files.filter((_, at) => at !== index)); }}><i aria-hidden="true" className="fas fa-trash" /></button></div>
      </li>)}
    </ul>}
    <button type="button" disabled={locked || total >= MAX_MATRIMONY_PHOTOS} onClick={() => input.current?.click()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-semibold text-rose-600 focus-visible:outline-2 focus-visible:outline-rose-500 active:scale-95 disabled:opacity-40"><i aria-hidden="true" className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-plus')} />{busy ? 'Preparing photos...' : 'Add photos'}</button>
    {busy && <span role="status" className="sr-only">Preparing photos</span>}
    {error && <p id={id + '-error'} role="alert" className="break-words text-[11px] text-red-700">{error}</p>}
  </div>;
}

function LocalPhoto({ file, alt }: { file: File; alt: string }) {
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = image.current;
    const url = URL.createObjectURL(file);
    if (element) element.src = url;
    return () => { element?.removeAttribute('src'); URL.revokeObjectURL(url); };
  }, [file, attempt]);
  return <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-rose-50 text-rose-300">
    <img ref={image} alt={alt} hidden={failed} className="h-full w-full object-cover" onLoad={() => setFailed(false)} onError={() => setFailed(true)} />
    {failed && <div className="absolute inset-0 flex items-center justify-center"><span role="img" aria-label={alt + ' - preview unavailable'}><i aria-hidden="true" className="fas fa-user" /></span><button type="button" aria-label="Retry preview" title="Retry preview" className={iconButton + ' absolute bottom-1 right-1'} onClick={() => { setFailed(false); setAttempt(value => value + 1); }}><i aria-hidden="true" className="fas fa-rotate-right" /></button></div>}
  </div>;
}
