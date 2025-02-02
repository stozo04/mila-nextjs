"use client";

import Footer from "@/components/Shared/Footer/Footer";
import NavMenu from "@/components/Shared/TopNav/page";
import Image, { StaticImageData } from "next/image";


export default function Home() {
  return (
    <main>
      <div className="overflow-hidden">
      <NavMenu />
      <div id="carouselExampleAutoplaying" className="carousel slide" data-bs-ride="carousel">
      <div className="carousel-inner">
        <div className="carousel-item active">
          <Image src="https://picsum.photos/id/10/800/400" width={800} height={400}  alt="Random Unsplash Image" className="d-block w-100" />
        </div>
        <div className="carousel-item">
          <Image src="https://picsum.photos/id/12/800/400" width={800} height={400} alt="Random Lorem Picsum Image" className="d-block w-100" />
        </div>
        <div className="carousel-item">
          <Image src="https://picsum.photos/id/16/800/400" width={800} height={400} alt="Random Kitten Image" className="d-block w-100" />
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
      <Footer />
    </div>
    </main>
  );
}
