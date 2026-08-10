"use client";
import Image from "next/image";
import { StaticImageData } from "next/image";

import landing1 from "@/../public/images/landing-page/1.jpg";
import landing2 from "@/../public/images/landing-page/2.jpg";
import landing3 from "@/../public/images/landing-page/3.jpg";
import landing4 from "@/../public/images/landing-page/4.jpg";
import landing5 from "@/../public/images/landing-page/5.jpg";
import landing6 from "@/../public/images/landing-page/6.jpg";
import landing7 from "@/../public/images/landing-page/7.jpg";
import landing8 from "@/../public/images/landing-page/8.jpg";
import landing9 from "@/../public/images/landing-page/9.jpg";
import landing10 from "@/../public/images/landing-page/10.jpg";
import landing11 from "@/../public/images/landing-page/11.jpg";
import landing12 from "@/../public/images/landing-page/12.jpg";
import landing13 from "@/../public/images/landing-page/13.jpg";
import landing14 from "@/../public/images/landing-page/14.jpg";

const images: StaticImageData[] = [
  landing1,
  landing2,
  landing3,
  landing4,
  landing5,
  landing6,
  landing7,
  landing8,
  landing9,
  landing10,
  landing11,
  landing12,
  landing13,
  landing14,
];

export default function Home() {
  return (
    <div className="flex-grow-1 d-flex" style={{ minHeight: 0, overflow: 'hidden' }}>
      <div id="carouselExampleAutoplaying" className="carousel slide flex-grow-1" data-bs-ride="carousel" style={{ minHeight: 0 }}>
        <div className="carousel-inner h-100">
          {images.map((image, index) => (
            <div
              key={index}
              className={`carousel-item ${index === 0 ? 'active' : ''} h-100`}
            >
              <div className="position-relative w-100 h-100">
                <Image
                  src={image}
                  alt="Mila Gates"
                  fill
                  className="d-block object-fit-cover"
                />
              </div>
            </div>
          ))}
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

  );
}

