"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Loading from "@/app/loading";
import { supabase } from "@/lib/supabase";
import { FileObject } from "@supabase/storage-js";

type GalleryProps = {
    folder: string; // e.g., 'houston' or 'dallas'
    limit?: number;
};

const CDNURL = "https://pawkklvezvrmtpqbztwb.supabase.co/storage/v1/object/public/mila_storage_bucket/baby-shower/";

const Gallery: React.FC<GalleryProps> = ({ folder, limit = 3 }) => {
    const [images, setImages] = useState<FileObject[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [offset, setOffset] = useState<number>(0);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(true);

    const fetchImages = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .storage
                .from('mila_storage_bucket')
                .list(`baby-shower/${folder}`, {
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
                setImages(prevImages => [...prevImages, ...data]);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [offset, folder]);

    const handleViewMore = () => {
        setOffset(prevOffset => prevOffset + limit);
    };

    return (
        <div className="container mt-5 mb-5">
            {/* Images Grid */}
            <div className="row row-cols-1 row-cols-md-3 g-4">
                {images.map((image) => (
                    <div key={image.name} className="col">
                        <div className="card h-100" style={{ cursor: 'pointer' }}>
                            <Suspense fallback={
                                <div className="placeholder-glow" style={{ height: '300px' }}>
                                    <span className="placeholder col-12 h-100"></span>
                                </div>
                            }>
                                <Image
                                    src={CDNURL + folder + '/' + image.name}
                                    alt={`Baby Shower - ${image.name}`}
                                    width={400}
                                    height={300}
                                    className="card-img-top"
                                    style={{ objectFit: "cover" }}
                                    onClick={() => setSelectedImage(CDNURL + folder + '/' + image.name)}
                                />
                            </Suspense>
                        </div>
                    </div>
                ))}
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
            {selectedImage && (
                <div
                    className="modal fade show d-block"
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(5px)',
                        transition: 'all 0.3s ease-in-out'
                    }}
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="modal-dialog modal-dialog-centered modal-lg"
                        style={{
                            transform: 'scale(1)',
                            opacity: 1,
                            animation: 'modalPop 0.3s ease-out'
                        }}
                    >
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-body p-0 position-relative">
                                <button
                                    type="button"
                                    className="btn-close position-absolute top-0 end-0 m-3 p-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedImage(null);
                                    }}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        padding: '0.5rem',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                        zIndex: 1,
                                        opacity: 0.8,
                                        transition: 'opacity 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                                ></button>
                                <Image
                                    src={selectedImage}
                                    alt="Baby Shower Preview"
                                    width={800}
                                    height={600}
                                    className="img-fluid rounded"
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        objectFit: 'contain',
                                        maxHeight: '80vh'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery; 