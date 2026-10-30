'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Modal } from 'react-bootstrap';
import { photoSource, photoUrl, type JourneyCards } from '@/lib/search/collections';

export type ViewerPhoto = { key: string; width: number | null; height: number | null };

type Props = {
  photos: ViewerPhoto[];
  index: number;
  cards: JourneyCards;
  onIndex: (index: number) => void;
  onClose: () => void;
};

export default function PhotoViewer({ photos, index, cards, onIndex, onClose }: Props) {
  const photo = photos[index];
  if (!photo) return null;
  const source = photoSource(photo.key, cards);
  return <Modal show onHide={onClose} centered size="xl" aria-labelledby="photo-viewer-title"
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (event.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1);
    }}>
    <Modal.Header closeButton>
      <Modal.Title id="photo-viewer-title" className="h5">Photo viewer</Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-0 bg-dark text-center">
      <Image key={photo.key} src={photoUrl(photo.key)} alt="Mila Gates" width={photo.width ?? 1200} height={photo.height ?? 900}
        sizes="(max-width: 1200px) 100vw, 1140px"
        style={{ width: '100%', height: 'auto', maxHeight: '75vh', objectFit: 'contain' }} />
    </Modal.Body>
    <Modal.Footer className="justify-content-between">
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-outline-primary" disabled={index === 0} onClick={() => onIndex(index - 1)}>Previous</button>
        <button type="button" className="btn btn-outline-primary" disabled={index >= photos.length - 1} onClick={() => onIndex(index + 1)}>Next</button>
      </div>
      <span className="small text-body-secondary">{index + 1} of {photos.length.toLocaleString()}</span>
      {source ? <Link href={source.href} className="btn btn-primary">{source.label}</Link> : <span />}
    </Modal.Footer>
  </Modal>;
}
