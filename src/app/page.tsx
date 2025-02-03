"use client";
import Image from "next/image";
import { StaticImageData } from "next/image";

// Import all images at once
const images: StaticImageData[] = [
  require("@/../public/images/landing-page/1.jpg"),
  require("@/../public/images/landing-page/2.jpg"),
  require("@/../public/images/landing-page/3.jpg"),
  require("@/../public/images/landing-page/4.jpg"),
  require("@/../public/images/landing-page/5.jpg"),
  require("@/../public/images/landing-page/6.jpg"),
  require("@/../public/images/landing-page/7.jpg"),
  require("@/../public/images/landing-page/8.jpg"),
  require("@/../public/images/landing-page/9.jpg"),
  require("@/../public/images/landing-page/10.jpg"),
  require("@/../public/images/landing-page/11.jpg"),
  require("@/../public/images/landing-page/12.jpg"),
  require("@/../public/images/landing-page/13.jpg"),
  require("@/../public/images/landing-page/14.jpg")
  // Add all other image paths here
];

export default function Home() {
  return (
<div id="carouselExampleAutoplaying" className="carousel slide" data-bs-ride="carousel">
  <div className="carousel-inner">
    {images.map((image, index) => (
      <div 
        key={index} 
        className={`carousel-item  ${index === 0 ? 'active' : ''}`}
        style={{ height: "86vh" }}

      >
        <Image 
          src={image} 
          alt="Mila Gates" 
          fill 
          className="d-block object-fit-cover"
 
        />
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

  );
}

