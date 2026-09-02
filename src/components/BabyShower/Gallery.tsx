"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { FileObject } from "@supabase/storage-js";
import { Modal } from 'react-bootstrap';
import type { Blog } from '@/types/blog';

type GalleryProps = {
    folder: string; // e.g., 'houston' or 'dallas'
    limit?: number;
    letterImages?: Pick<Blog, 'featured_image' | 'detail_image'> | null;
    renderPhotoActions?: (filename: string) => React.ReactNode;
};

const Gallery: React.FC<GalleryProps> = ({ folder, limit = 3, letterImages, renderPhotoActions }) => {
    const [images, setImages] = useState<FileObject[]>([]);
    // Starts true: the effect below fetches on mount, so the first paint is a
    // loading state regardless. Setting it from inside the effect instead would
    // be a synchronous setState in an effect body — an extra render pass.
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [offset, setOffset] = useState<number>(0);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [error, setError] = useState('');
    const photoUrl = (filename: string) => supabase.storage.from('mila_storage_bucket').getPublicUrl(`${folder}/${filename}`).data.publicUrl;

    const fetchImages = async () => {
        try {
            const { data, error } = await supabase
                .storage
                .from('mila_storage_bucket')
                .list(`${folder}`, {
                    limit: limit,
                    offset: offset,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) {
                throw error;
            }

            if (data) {
                if (data.length < limit) {
                    setHasMore(false);
                }
                const photos = data.filter(image => image.id && image.name !== '.emptyFolderPlaceholder');
                setImages(prevImages => offset > 0 ? [...prevImages, ...photos] : photos);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
            setError('Unable to load photos. Please reload the page.');
        } finally {
            setIsLoading(false);
        }
    };

    // The effect that used to reset images/offset/hasMore when folder or limit
    // changed is gone. It set three states synchronously inside an effect, which
    // costs an extra render pass, and it never actually did anything: every call
    // site passes a literal folder, so the props are fixed for the lifetime of a
    // mounted Gallery, and navigating between galleries mounts a new one with
    // fresh state. If folder ever becomes dynamic, give Gallery a key={folder}
    // at the call site rather than resetting state from an effect.
    useEffect(() => {
        // fetchImages only sets state after awaiting, but the rule flags any
        // effect that can reach a setState at all. Silenced rather than
        // pretended-fixed: the real answer is to stop fetching from an effect —
        // render this server-side, or put it behind a data-fetching library.
        // That is a refactor of a working gallery, not a lint fix.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchImages();
    }, [offset, folder, limit]);

    const handleViewMore = () => {
        // Loading is flipped here rather than in fetchImages: an event handler
        // is the right place for it, and it keeps the effect free of a
        // synchronous setState.
        setIsLoading(true);
        setError('');
        setOffset(prevOffset => prevOffset + limit);
    };

    return (
        <div className="container mt-5 mb-5">
            {error && <p role="alert" className="text-danger">{error}</p>}
            {/* Images Grid */}
            <div className="row row-cols-1 row-cols-md-3 g-4">
                {images.map((image) => {
                    const url = photoUrl(image.name);
                    const roles = [letterImages?.featured_image === url && 'Featured', letterImages?.detail_image === url && 'Detail'].filter(Boolean).join(' · ');
                    return (
                        <div key={image.name} className="col">
                            <div className="card h-100" style={roles ? { boxShadow: '0 0 0 2px #d48ca8, 0 0 16px #d48ca866' } : undefined}>
                                <button type="button" className="border-0 p-0 bg-transparent rounded" aria-label={`View photo ${image.name}`} onClick={() => setSelectedImage(image.name)}>
                                    <Suspense fallback={
                                        <div className="placeholder-glow" style={{ height: '300px' }}>
                                            <span className="placeholder col-12 h-100"></span>
                                        </div>
                                    }>
                                        <Image
                                            src={url}
                                            alt={`${image.name}`}
                                            width={400}
                                            height={300}
                                            className="card-img-top"
                                            style={{ objectFit: "cover" }}
                                        />
                                    </Suspense>
                                </button>
                                {roles && <span className="small fw-semibold text-center py-1" style={{ color: '#8c1745', background: '#fff7fa' }}>{roles}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* View More Button */}
            <div className="text-center mt-4">
                <button
                    className="btn btn-outline-primary rounded-pill px-4"
                    onClick={handleViewMore}
                    disabled={isLoading || !hasMore}
                    onMouseUp={(e) => e.currentTarget.blur()}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Loading...
                        </>
                    ) : hasMore ? 'View More' : 'No More Images'}
                </button>
            </div>

            {/* Image Preview Modal */}
            {selectedImage && (renderPhotoActions ? (
                <Modal show onHide={() => setSelectedImage(null)} centered size="lg" aria-label="Photo preview">
                    <Modal.Header closeButton><Modal.Title>Photo preview</Modal.Title></Modal.Header>
                    <Modal.Body className="p-0">
                        <Image
                            src={photoUrl(selectedImage)}
                            alt="Preview"
                            width={800}
                            height={600}
                            className="img-fluid rounded"
                            style={{
                                width: '100%',
                                height: 'auto',
                                objectFit: 'contain',
                                maxHeight: '65vh'
                            }}
                        />
                    </Modal.Body>
                    <Modal.Footer>{renderPhotoActions(selectedImage)}</Modal.Footer>
                </Modal>
            ) : (
                <div
                    className="modal fade show d-block"
                    role="dialog" aria-label="Photo preview"
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(5px)',
                        transition: 'all 0.3s ease-in-out'
                    }}
                    onClick={() => setSelectedImage(null)}
                    onKeyDown={event => { if (event.key === 'Escape') setSelectedImage(null); }}
                >
                    <div
                        className="modal-dialog modal-dialog-centered modal-lg"
                        style={{ transform: 'scale(1)', opacity: 1, animation: 'modalPop 0.3s ease-out' }}
                    >
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-body p-0 position-relative">
                                <button
                                    type="button" aria-label="Close photo preview" autoFocus
                                    className="btn-close position-absolute top-0 end-0 m-3 p-2"
                                    onClick={event => { event.stopPropagation(); setSelectedImage(null); }}
                                    style={{
                                        backgroundColor: 'white', borderRadius: '50%', padding: '0.5rem',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)', zIndex: 1, opacity: 0.8,
                                        transition: 'opacity 0.2s ease'
                                    }}
                                    onMouseOver={event => event.currentTarget.style.opacity = '1'}
                                    onMouseOut={event => event.currentTarget.style.opacity = '0.8'}
                                />
                                <Image
                                    src={photoUrl(selectedImage)} alt="Preview" width={800} height={600}
                                    className="img-fluid rounded"
                                    style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: '80vh' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Gallery;
