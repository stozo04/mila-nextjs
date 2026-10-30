'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Modal } from 'react-bootstrap';
import { photoSource, photoUrl, type SourceLinks } from '@/lib/search/collections';

export type ViewerPhoto = { key: string; width: number | null; height: number | null };

type Props = {
  photos: ViewerPhoto[];
  index: number;
  links: SourceLinks;
  onIndex: (index: number) => void;
  onClose: () => void;
};

export default function PhotoViewer({ photos, index, links, onIndex, onClose }: Props) {
  const photo = photos[index];
  if (!photo) return null;
  const source = photoSource(photo.key, links);
  return <Modal show onHide={onClose} centered size="xl" aria-labelledby="photo-viewer-title"
    contentClassName="glass-viewer" backdropClassName="glass-viewer-backdrop"
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (event.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1);
    }}>
    <Modal.Header closeButton>
      <Modal.Title id="photo-viewer-title" className="h5">Photo viewer</Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-0 text-center glass-viewer-photo">
      <Image key={photo.key} src={photoUrl(photo.key)} alt="Mila Gates" width={photo.width ?? 1200} height={photo.height ?? 900}
        sizes="(max-width: 1200px) 100vw, 1140px"
        style={{ width: '100%', height: 'auto', maxHeight: '72vh', objectFit: 'contain' }} />
    </Modal.Body>
    <Modal.Footer className="justify-content-between">
      <div className="d-flex gap-2">
        <button type="button" className="btn glass-viewer-button" disabled={index === 0} onClick={() => onIndex(index - 1)}>Previous</button>
        <button type="button" className="btn glass-viewer-button" disabled={index >= photos.length - 1} onClick={() => onIndex(index + 1)}>Next</button>
      </div>
      <span className="small glass-viewer-count">{index + 1} of {photos.length.toLocaleString()}</span>
      {source ? <Link href={source.href} className="btn glass-viewer-link">{source.label}</Link> : <span />}
    </Modal.Footer>
    {/* Global: the modal renders in a portal outside this component's scope. */}
    <style jsx global>{`
      .glass-viewer-backdrop.show { opacity: 1; background: rgba(253, 236, 243, 0.55); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
      .glass-viewer {
        background: rgba(255, 255, 255, 0.6);
        -webkit-backdrop-filter: blur(18px) saturate(160%);
        backdrop-filter: blur(18px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-radius: 24px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 24px 60px rgba(194, 24, 91, 0.22);
        color: #542537;
        overflow: hidden;
      }
      .glass-viewer .modal-header, .glass-viewer .modal-footer { border-color: rgba(194, 24, 91, 0.12); }
      .glass-viewer-photo { background: rgba(84, 37, 55, 0.06); }
      .glass-viewer-photo img { display: block; margin: 0 auto; }
      .glass-viewer-count { color: rgba(84, 37, 55, 0.75); }
      .glass-viewer-button {
        border-radius: 999px;
        border: 1px solid rgba(194, 24, 91, 0.35);
        background: rgba(255, 255, 255, 0.6);
        color: #c2185b;
        font-weight: 600;
      }
      .glass-viewer-button:hover:not(:disabled) { background: rgba(255, 255, 255, 0.9); color: #a6134c; }
      .glass-viewer-button:disabled { opacity: 0.45; border-color: rgba(194, 24, 91, 0.2); color: #c2185b; }
      .glass-viewer-link { border-radius: 999px; background: #c2185b; color: #fff; font-weight: 600; border: 0; }
      .glass-viewer-link:hover { background: #a6134c; color: #fff; }
      .glass-viewer-button:focus-visible, .glass-viewer-link:focus-visible, .glass-viewer .btn-close:focus-visible {
        outline: 3px solid #c2185b;
        outline-offset: 2px;
        box-shadow: none;
      }
    `}</style>
  </Modal>;
}
