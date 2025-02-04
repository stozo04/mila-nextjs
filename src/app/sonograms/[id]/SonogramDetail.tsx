import Link from "next/link";
import Image from 'next/image';
import fs from 'fs'
import path from 'path'

const sonograms = [
    {
        id: '1',
        title: 'Sonogram 1',
        date: 'November 23, 2022',
        description: 'Today is the first time my parents got to meet me!',
        age: '4 weeks'
    },
    {
        id: '2',
        title: 'Sonogram 2',
        date: 'December 27, 2022',
        description: 'I had a great Christmas. I got to meet my dad’s side of the family!',
        age: '17 weeks'
    },
    {
        id: '3',
        title: 'Sonogram 3',
        date: 'January 10, 2023',
        description: 'I got all my toes and fingers counted today!!',
        age: '19 weeks'
    },
    {
        id: '4',
        title: 'Sonogram 4',
        date: 'March 15, 2023',
        description: 'I am growing so fast! I am 2 lbs 8 oz. I got to do my first selfie!!',
        age: '28 weeks'
    },
    {
        id: '5',
        title: 'Sonogram 5',
        date: 'April 10, 2023',
        description: 'I am almost here! I am 5 lbs 10 oz.',
        age: '36 weeks'
    }
];




const SonogramDetailPage = ({ sonoId }) => {
    const sonogram = sonograms.find(s => s.id === sonoId); // 🔹 Use `.find()` instead of `[id]`

    if (!sonogram) {
        return <div className="container mt-5">Sonogram not found</div>;
    }

     // Get images from public folder
 const imageDirectory = path.join(process.cwd(), 'public', 'images', 'sonograms', `sonogram-${sonoId}`)
 const imageFilenames = fs.readdirSync(imageDirectory)
     .filter(file =>
         file.endsWith('.jpg') ||
         file.endsWith('.png') ||
         file.endsWith('.jpeg')
     )
     .sort((a, b) => a.localeCompare(b))
 const images = imageFilenames.map(filename =>
     `/images/sonograms/sonogram-${sonoId}/${filename}`
 )
    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-12">
                    <article className="portfolio">
                        <div className="row"> {/* Added a row for horizontal layout */}
                            <div className="col-md-9"> {/* Image column (75% on medium and larger screens) */}
                                <div id="imageCarousel" className="carousel slide" data-bs-ride="carousel">
                                    <div className="carousel-inner">
                                        {images.map((img, index) => (
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
                                    {/* Carousel controls remain within the image column */}
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
                            <div className="col-md-3"> {/* Content column (25% on medium and larger screens) */}
                                <header className="entry-header mt-4 mt-md-0"> {/* Adjust top margin on medium screens */}
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
                                {sonoId !== '1' && ( // Show "Previous" if not the first sonogram
                                    <Link
                                        href={`/sonograms/${parseInt(sonoId) - 1}`}
                                        className="btn btn-secondary" // Use a different style for "Previous"
                                    >
                                        Previous
                                    </Link>
                                )}
                                <div> {/* Added a container for the "Next" button */}
                                    {sonoId !== '5' && ( // Show "Next" if not the last sonogram
                                        <Link
                                            href={`/sonograms/${parseInt(sonoId) + 1}`}
                                            className="btn btn-primary"
                                        >
                                            Next
                                        </Link>
                                    )}
                                </div>
                            </div>
                
                            </div>
                        </div> {/* End of the row */}
                    </article>
                </div>
            </div>
        </div>
    );
}
export default SonogramDetailPage;