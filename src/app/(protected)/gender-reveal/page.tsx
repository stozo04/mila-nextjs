'use client';

import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from 'react';
import Loading from '@/app/loading';
import { supabase } from '@/lib/supabase';
import { FileObject } from '@supabase/storage-js';


const CDNURL = "https://pawkklvezvrmtpqbztwb.supabase.co/storage/v1/object/public/mila_storage_bucket/gender-reveal/";

const GenderRevealPage = () => {
  const [images, setImages] = useState<FileObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fetchedOffsetsRef = useRef<Set<number>>(new Set());
  const LIMIT = 3;

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from('mila_storage_bucket')
        .list('gender-reveal', {
          limit: LIMIT,
          offset: offset,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        throw error;
      }

      if (data) {
        setImages(prevImages => {
          const merged = [...prevImages, ...data];
          // Deduplicate by filename to avoid duplicate keys/renders
          const dedupMap = new Map<string, FileObject>();
          for (const f of merged) dedupMap.set(f.name, f);
          return Array.from(dedupMap.values());
        });
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Avoid duplicate fetches for the same offset (e.g., React Strict Mode)
    if (fetchedOffsetsRef.current.has(offset)) return;
    fetchedOffsetsRef.current.add(offset);
    fetchImages();
  }, [offset]);

  const handleViewMore = () => {
    setOffset(prevOffset => prevOffset + LIMIT);
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="container mt-5 mb-5">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4>Gender Reveal Party</h4>
              <h4 className="text-muted">January 21, 2023</h4>
            </div>
          </div>
        </div>

        {/* Video Section */}
        <div className="row mb-5">
          <div className="col-12">
            <div className="ratio ratio-16x9">
              <iframe
                src="https://www.youtube.com/embed/lCzy6_hpcwc"
                title="Gender Reveal"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>

        {/* Images Grid */}
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {images.map((image) => (
            <div key={image.name} className="col">
              <div className="card h-100" style={{ cursor: 'pointer' }}>
                <Image
                  src={CDNURL + image.name}
                  alt={`Gender Reveal - ${image.name}`}
                  width={400}
                  height={300}
                  className="card-img-top"
                  style={{ objectFit: "cover" }}
                  onClick={() => setSelectedImage(CDNURL + image.name)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        <div className="text-center mt-4">
          <button 
            className="btn btn-outline-primary rounded-pill px-4"
            onClick={handleViewMore}
            onMouseUp={(e) => e.currentTarget.blur()}
          >
            View More
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
                                    alt="Gender Reveal Preview"
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
    </Suspense>
  );
};

export default GenderRevealPage;
