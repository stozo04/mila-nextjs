import Image from 'next/image'
import Link from 'next/link'

const sonograms = [
  { 
    id: '1', 
    title: 'Sonogram 1', 
    date: 'November 23, 2022', 
    image: '/images/sonograms/sonogram-1/1.jpg' 
  },
  { 
    id: '2', 
    title: 'Sonogram 2', 
    date: 'December 27, 2022', 
    image: '/images/sonograms/sonogram-2/1.jpg' 
  },
  { 
    id: '3', 
    title: 'Sonogram 3', 
    date: 'January 10, 2023', 
    image: '/images/sonograms/sonogram-3/1.jpg' 
  },
  { 
    id: '4', 
    title: 'Sonogram 4', 
    date: 'March 15, 2023', 
    image: '/images/sonograms/sonogram-4/1.jpg' 
  },
  { 
    id: '5', 
    title: 'Sonogram 5', 
    date: 'May 10, 2023', 
    image: '/images/sonograms/sonogram-5/1.jpg' 
  }
]

export default function SonogramsPage() {

  return (
    <div className="container mt-4 mb-4">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Welcome to the world, Mila!</h1>
        </div>
      </div>

      <div className="row row-cols-1 row-cols-md-3 g-4">
        {sonograms.map((sonogram) => (
          <div key={sonogram.id} className="col">
            <Link 
              href={`/sonograms/${sonogram.id}`} 
              className="text-decoration-none"
            >
              <div className="card h-100">
                <Image 
                  src={sonogram.image} 
                  alt={sonogram.title} 
                  width={400} 
                  height={300} 
                  className="card-img-top" 
                  style={{ objectFit: 'cover' }}
                />
                <div className="card-body text-center">
                  <h5 className="card-title">{sonogram.title}</h5>
                  <p className="card-text text-muted">{sonogram.date}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}