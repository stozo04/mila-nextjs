import Image from 'next/image'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'

const sonograms = {
  '1': { 
    title: 'Sonogram 1', 
    date: 'November 23, 2022',
    description: 'Today is the first time my parents got to meet me!',
    age: '4 weeks'
  },
  // Add other sonogram details
}

export default function SonogramDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const sonogram = sonograms[params.id]
  
  if (!sonogram) {
    return <div className="container mt-5">Sonogram not found</div>
  }

  // Get images from public folder
  const imageDirectory = path.join(process.cwd(), 'public', 'images', 'sonograms', `sonogram-${params.id}`)
  const imageFilenames = fs.readdirSync(imageDirectory)
    .filter(file => 
      file.endsWith('.jpg') || 
      file.endsWith('.png') || 
      file.endsWith('.jpeg')
    )
    .sort((a, b) => a.localeCompare(b))

  const images = imageFilenames.map(filename => 
    `/images/sonograms/sonogram-${params.id}/${filename}`
  )

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-12">
          <article className="portfolio">
            <div className="entry-content">
              <div id="imageCarousel" className="carousel slide" data-bs-ride="carousel">
                <div className="carousel-inner">
                  {images.map((img, index) => (
                    <div 
                      key={index} 
                      className={`carousel-item ${index === 0 ? 'active' : ''}`}
                    >
                      <Image 
                        src={img} 
                        alt={`Sonogram ${params.id} - Image ${index + 1}`} 
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

            <header className="entry-header mt-4">
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
          </article>

          <div className="portfolio-navigation mt-4">
            <div className="d-flex justify-content-end">
              {params.id !== '5' && (
                <Link 
                  href={`/sonograms/${parseInt(params.id) + 1}`} 
                  className="btn btn-primary"
                >
                  Next Sonogram
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

    
    </div>
  )
}