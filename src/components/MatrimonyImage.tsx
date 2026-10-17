'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

export interface MatrimonyImageProps { src: string; alt: string; className?: string }

const protectedPath = /^\/matrimony\/photos\/[a-f0-9]{24}$/;
type Account = ReturnType<typeof useAppStore.getState>['user'];
const accountIdentity = (user: Account) => user ? `${user.uid}:${user._id || ''}` : '';

function legacyPhoto(src: string): boolean {
  if (!src.startsWith('https://')) return false;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !Array.from(url.searchParams.keys()).some(key => /^(access_token|id_token|token|auth|authorization)$/i.test(key));
  } catch { return false; }
}

export default function MatrimonyImage(props: MatrimonyImageProps) {
  const owner = useAppStore(state => accountIdentity(state.user));
  // A new source or account gets fresh state before paint, rather than retaining an old blob until an effect runs.
  return <AccountPhoto key={JSON.stringify([owner, props.src])} {...props} owner={owner} />;
}

function AccountPhoto({ src, alt, className, owner }: MatrimonyImageProps & { owner: string }) {
  const internal = protectedPath.test(src);
  const legacy = legacyPhoto(src);
  const [blob, setBlob] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const image = useRef<HTMLImageElement>(null);
  const objectUrl = useRef<string | null>(null);

  function release() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const current = () => active && !controller.signal.aborted && accountIdentity(useAppStore.getState().user) === owner;
    const stop = () => {
      active = false;
      controller.abort();
      release();
    };
    const unsubscribe = useAppStore.subscribe(state => {
      if (accountIdentity(state.user) !== owner) {
        image.current?.removeAttribute('src');
        stop();
      }
    });
    if (internal && owner && current()) {
      void api.get<Blob>(src, { responseType: 'blob', signal: controller.signal }).then(({ data }) => {
        if (!current()) return;
        if (!(data instanceof Blob) || !data.size || !/^image\/(jpeg|jpg|png|webp)$/i.test(data.type)) {
          throw new Error('The photo response is not a supported image.');
        }
        const url = URL.createObjectURL(data);
        objectUrl.current = url;
        setBlob(url);
      }).catch(() => { if (current()) setFailed(true); });
    }
    return () => { unsubscribe(); stop(); };
  }, [src, owner, internal, attempt]);

  const allowed = legacy || (internal && !!owner);
  const photo = legacy ? src : blob;
  if (allowed && photo && !failed && accountIdentity(useAppStore.getState().user) === owner) {
    return <img key={attempt} ref={image} src={photo} alt={alt} className={className} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => {
      release(); setBlob(null); setFailed(true);
    }} />;
  }
  return <div className={'relative flex items-center justify-center overflow-hidden bg-rose-50 text-rose-300 ' + (className || '')}>
    <span role="img" aria-label={alt + (failed ? ' - photo unavailable' : ' - photo placeholder')}><i aria-hidden="true" className="fas fa-user" /></span>
    {failed && allowed && <button type="button" aria-label="Retry photo" title="Retry photo" onClick={() => { setFailed(false); setAttempt(value => value + 1); }} className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-md border border-rose-100 bg-white text-xs text-rose-600 focus-visible:outline-2 focus-visible:outline-rose-500 active:scale-95"><i aria-hidden="true" className="fas fa-rotate-right" /></button>}
  </div>;
}
