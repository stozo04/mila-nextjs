'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Modal } from 'react-bootstrap';

type MonthPreview = { title: string; slug: string; date: string; section: string; blog_title: string; tag: string };

export default function PrepareMonth() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [preview, setPreview] = useState<MonthPreview | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function open() {
    setShow(true);
    setBusy(true);
    setPreview(null);
    setError('');
    try {
      const response = await fetch('/api/journey/prepare-month', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPreview(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load the preview.');
    } finally { setBusy(false); }
  }

  async function prepare(event: React.FormEvent) {
    event.preventDefault();
    if (!preview || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/journey/prepare-month', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, expected_slug: preview.slug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setShow(false);
      setMessage('');
      router.push(`/my-journey/${data.section}/${data.slug}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to prepare the month. Reopen the preview before retrying.');
    } finally { setBusy(false); }
  }

  return <>
    <button className="btn btn-success rounded-pill" onClick={open}>Prepare Mila’s Month</button>
    <Modal show={show} onHide={() => !busy && setShow(false)}>
      <Modal.Header closeButton={!busy}><Modal.Title>Prepare Mila’s Month</Modal.Title></Modal.Header>
      <Form onSubmit={prepare}>
        <Modal.Body>
          <p>Create the most recently completed monthly milestone and a private blank letter draft. If either already exists, nothing is created or changed.</p>
          {preview && <p><strong>{preview.title}</strong><br />{preview.date}<br />{preview.blog_title} · {preview.tag}</p>}
          {preview && <p>Slug (journey card and letter): <code>{preview.slug}</code></p>}
          <Form.Group controlId="monthly-message">
            <Form.Label>Journey message (optional)</Form.Label>
            <Form.Control as="textarea" rows={3} maxLength={5000} value={message} disabled={busy} onChange={event => setMessage(event.target.value)} />
          </Form.Group>
          {error && <p className="text-danger mt-3" role="alert">{error}</p>}
        </Modal.Body>
        <Modal.Footer><Button type="submit" disabled={busy || !preview}>{busy ? 'Please wait…' : 'Create card and letter draft'}</Button></Modal.Footer>
      </Form>
    </Modal>
  </>;
}
