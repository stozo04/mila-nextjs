'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Gallery from '@/components/BabyShower/Gallery';
import type { Blog } from '@/types/blog';
import { canIndex, indexPhoto } from '@/lib/search/browserIndexer';
import { scanFaces } from '@/lib/people/browserFaces';

type LetterImages = Pick<Blog, 'featured_image' | 'detail_image'>;

export default function JourneyGallery({ slug }: { slug: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const isAdmin = !!userId && userId === adminUserId;
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [letterImages, setLetterImages] = useState<LetterImages | null>(null);
  const [imageNotice, setImageNotice] = useState('');
  const [imageError, setImageError] = useState('');
  const [savingRole, setSavingRole] = useState<keyof LetterImages | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function loadImages() {
      try {
        const { data } = await supabase.rpc('is_mila_admin');
        if (!active) return;
        setAdminUserId(data === true ? userId : null);
        setLetterImages(null);
        setImageNotice('');
        setImageError('');
        if (data !== true) return;
        const response = await fetch(`/api/blog/${encodeURIComponent(slug)}/images`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load the letter’s image selections.');
        if (active) setLetterImages(result.images);
      } catch (error) {
        if (active) setImageError(error instanceof Error ? error.message : 'Unable to load the letter’s image selections.');
      }
    }
    void loadImages();
    return () => { active = false; };
  }, [slug, userId]);

  async function selectImage(filename: string, role: keyof LetterImages) {
    if (!isAdmin || savingRef.current) return;
    savingRef.current = true;
    setSavingRole(role);
    setImageNotice('');
    setImageError('');
    try {
      const response = await fetch(`/api/blog/${encodeURIComponent(slug)}/images`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to confirm the image selection. Reload before retrying.');
      setLetterImages(result.images);
      setImageNotice(role === 'featured_image' ? 'Featured image saved.' : 'Detail image saved.');
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Unable to confirm the image selection. Reload before retrying.');
    } finally {
      setSavingRole(null);
      savingRef.current = false;
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length || uploadingRef.current || !isAdmin) return;
    const total = files.length;
    uploadingRef.current = true;
    setUploading(true);
    setNotice('');
    const paths: string[] = [];
    let summary = '';
    try {
      for (const file of Array.from(files)) {
        setNotice(`Uploading ${paths.length + 1} of ${total}`);
        if (file.type !== 'image/jpeg' || !/\.jpe?g$/i.test(file.name) || file.size === 0 || file.size > 50 * 1024 * 1024) {
          throw new Error(`${file.name}: choose a .jpg or .jpeg JPEG photo up to 50 MB.`);
        }
        const path = `birthday/${slug}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from('mila_storage_bucket').upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw new Error(`${file.name}: ${error.message}`);
        paths.push(path);
      }
      summary = `${paths.length} uploaded, 0 failed.`;
    } catch (error) {
      summary = `${paths.length} uploaded, 1 failed, ${total - paths.length - 1} not attempted. ${error instanceof Error ? error.message : 'Upload failed.'} Select only the remaining photos to retry.`;
    } finally {
      if (paths.length) setRevision(value => value + 1);
    }
    // Upload results stand on their own; indexing follows and never changes those counts.
    let indexed = 0;
    const indexable = paths.length > 0 && await canIndex();
    for (const path of indexable ? paths : []) {
      setNotice(`${summary} Indexing ${indexed + 1} of ${paths.length} for search…`);
      try {
        await indexPhoto(path, 'journey');
        await scanFaces(path);
        indexed++;
      } catch (error) {
        console.error('Search indexing failed:', error);
      }
    }
    setNotice(!paths.length ? summary : indexed === paths.length ? `${summary} ${indexed} indexed for search.`
      : `${summary} ${indexed} indexed for search, ${paths.length - indexed} not indexed. Build search index will catch them up.`);
    setUploading(false);
    uploadingRef.current = false;
  }

  return <>
    {isAdmin && <section className="photo-upload p-4 mt-4" aria-label="Upload journey photos"
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files); }}>
      <h2 className="h5 mb-2">Add photos to this month</h2>
      <label htmlFor="journey-photos" className="form-label">Drop JPEG photos here or choose files below</label>
      <input id="journey-photos" className="form-control photo-file-input" type="file" multiple accept=".jpg,.jpeg,image/jpeg" aria-describedby="journey-photo-help"
        disabled={uploading} onChange={event => { void upload(event.target.files); event.target.value = ''; }} />
      <p id="journey-photo-help" className="small mt-2 mb-2">JPEG only (.jpg or .jpeg) · up to 50 MB each · indexed for search after upload</p>
      <p className="mb-0 fw-semibold" role="status" aria-live="polite" aria-atomic="true">{notice}</p>
    </section>}
    <Gallery folder={`birthday/${slug}`} limit={3} key={`${slug}-${revision}`}
      letterImages={isAdmin ? letterImages : undefined}
      renderPhotoActions={isAdmin ? filename => <div className="w-100">
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={!letterImages || !!savingRole}
            onClick={() => void selectImage(filename, 'featured_image')}>
            {savingRole === 'featured_image' ? 'Saving…' : 'Use as featured image'}
          </button>
          <button type="button" className="btn btn-outline-primary" disabled={!letterImages || !!savingRole}
            onClick={() => void selectImage(filename, 'detail_image')}>
            {savingRole === 'detail_image' ? 'Saving…' : 'Use as detail image'}
          </button>
        </div>
        {imageError && <p role="alert" className="text-danger mt-2 mb-0">{imageError}</p>}
        <p role="status" aria-live="polite" className="mt-2 mb-0">{imageNotice}</p>
      </div> : undefined} />
    <style jsx>{`
      .photo-upload {
        background: #fff7fa;
        border: 2px dashed #d48ca8;
        border-radius: 1rem;
        color: #542537;
      }
      .photo-file-input { border-color: #d48ca8; }
      .photo-upload .photo-file-input::file-selector-button {
        background: #c2185b;
        color: white;
        font-weight: 600;
      }
      .photo-upload .photo-file-input:hover:not(:disabled)::file-selector-button { background: #a6134c; }
      .photo-file-input:focus-visible { outline: 3px solid #c2185b; outline-offset: 3px; }
    `}</style>
  </>;
}
