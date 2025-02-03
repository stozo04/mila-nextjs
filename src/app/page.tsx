"use client";

import Footer from "@/components/Shared/Footer/Footer";
import NavMenu from "@/components/Shared/TopNav/page";
import Image from "next/image";

export default function Home() {
  return (
    <div className="d-flex flex-column vh-100 overflow-hidden">
      <NavMenu />
      <main className="flex-grow-1 overflow-hidden position-relative">
        <div className="h-100 overflow-hidden position-relative">
          <div id="carouselExampleAutoplaying" className="carousel slide h-100" data-bs-ride="carousel">
            <div className="carousel-inner h-100">
              <div className="carousel-item active h-100">
                <Image 
                  src="https://picsum.photos/id/10/800/400" 
                  alt="Random Unsplash Image" 
                  fill 
                  className="d-block object-fit-cover" 
                />
              </div>
              <div className="carousel-item h-100">
                <Image 
                  src="https://picsum.photos/id/12/800/400" 
                  alt="Random Lorem Picsum Image" 
                  fill 
                  className="d-block object-fit-cover" 
                />
              </div>
              <div className="carousel-item h-100">
                <Image 
                  src="https://picsum.photos/id/16/800/400" 
                  alt="Random Kitten Image" 
                  fill 
                  className="d-block object-fit-cover" 
                />
              </div>
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleAutoplaying" data-bs-slide="prev">
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleAutoplaying" data-bs-slide="next">
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Next</span>
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}