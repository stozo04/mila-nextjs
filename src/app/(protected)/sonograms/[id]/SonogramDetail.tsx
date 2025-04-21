"use client";

import Link from "next/link";
import Image from 'next/image';

interface SonogramImage {
  id: string;
  title: string;
  date: string;
  description: string;
  age: string;
  images: string[];
}

interface SonogramDetailProps {
  sonoId: string;
}

const sonograms: SonogramImage[] = [
    {
        id: '1',
        title: 'Sonogram 1',
        date: 'November 23, 2022',
        description: 'Today is the first time my parents got to meet me!',
        age: '4 weeks',
        images: [
            '/images/sonograms/sonogram-1/1.jpg',
            '/images/sonograms/sonogram-1/2.jpg',
            '/images/sonograms/sonogram-1/3.jpg'
        ]
    },
    {
        id: '2',
        title: 'Sonogram 2',
        date: 'December 27, 2022',
        description: 'I had a great Christmas. I got to meet my dad\'s side of the family!',
        age: '17 weeks',
        images: [
            '/images/sonograms/sonogram-2/1.jpg',
            '/images/sonograms/sonogram-2/2.jpg',
            '/images/sonograms/sonogram-2/3.jpg'
        ]
    },
    {
        id: '3',
        title: 'Sonogram 3',
        date: 'January 10, 2023',
        description: 'I got all my toes and fingers counted today!!',
        age: '19 weeks',
        images: [
            '/images/sonograms/sonogram-3/1.jpg',
            '/images/sonograms/sonogram-3/2.jpg',
            '/images/sonograms/sonogram-3/3.jpg'
        ]
    },
    {
        id: '4',
        title: 'Sonogram 4',
        date: 'March 15, 2023',
        description: 'I am growing so fast! I am 2 lbs 8 oz. I got to do my first selfie!!',
        age: '28 weeks',
        images: [
            '/images/sonograms/sonogram-4/1.jpg',
            '/images/sonograms/sonogram-4/2.jpg',
            '/images/sonograms/sonogram-4/3.jpg'
        ]
    },
    {
        id: '5',
        title: 'Sonogram 5',
        date: 'April 10, 2023',
        description: 'I am almost here! I am 5 lbs 10 oz.',
        age: '36 weeks',
        images: [
            '/images/sonograms/sonogram-5/1.jpg',
            '/images/sonograms/sonogram-5/2.jpg',
            '/images/sonograms/sonogram-5/3.jpg'
        ]
    }
];

const SonogramDetailPage = ({ sonoId }: SonogramDetailProps) => {
    const sonogram = sonograms.find(s => s.id === sonoId);

    if (!sonogram) {
        return <div className="container mt-5">Sonogram not found</div>;
    }

    return (
        <div className="container mt-4 mb-4">
            <div className="row">
                <div className="col-12">
                    <article className="portfolio">
                        <div className="row">
                            <div className="col-md-9">
                                <div id="imageCarousel" className="carousel slide" data-bs-ride="carousel">
                                    <div className="carousel-inner">
                                        {sonogram.images.map((img, index) => (
                                            <div
                                                key={index}
                                                className={`carousel-item ${index === 0 ? 'active' : ''}`}
                                            >
                                                <Image
                                                    src={img}
                                                    alt={`Sonogram ${sonoId} - Image ${index + 1}`}
                                                    width={1200}
                                                    height={800}
                                                    className="d-block w-100"
                                                    style={{ objectFit: 'cover' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        className="carousel-control-prev"
                                        type="button"
                                        data-bs-target="#imageCarousel"
                                        data-bs-slide="prev"
                                    >
                                        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                                        <span className="visually-hidden">Previous</span>
                                    </button>
                                    <button
                                        className="carousel-control-next"
                                        type="button"
                                        data-bs-target="#imageCarousel"
                                        data-bs-slide="next"
                                    >
                                        <span className="carousel-control-next-icon" aria-hidden="true"></span>
                                        <span className="visually-hidden">Next</span>
                                    </button>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <header className="entry-header mt-4 mt-md-0">
                                    <h2 className="entry-title">{sonogram.title}</h2>
                                    <div className="text-muted mb-3">{sonogram.date}</div>
                                    <div className="entry-meta">
                                        <div className="meta-desc mb-3">
                                            <p>{sonogram.description}</p>
                                        </div>
                                        <div className="meta-entries">
                                            <ul className="list-unstyled">
                                                <li><strong>Age:</strong> {sonogram.age}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </header>
 
                                <div className="d-flex justify-content-between mt-4">
                                    {sonoId !== '1' && (
                                        <Link
                                            href={`/sonograms/${parseInt(sonoId) - 1}`}
                                            className="btn btn-outline-primary"
                                        >
                                            Previous
                                        </Link>
                                    )}
                                    <div>
                                        {sonoId !== '5' && (
                                            <Link
                                                href={`/sonograms/${parseInt(sonoId) + 1}`}
                                                className="btn btn-outline-primary"
                                            >
                                                Next
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    );
}

export default SonogramDetailPage;