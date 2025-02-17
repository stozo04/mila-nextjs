 "use client";
import Header from "@/components/BabyShower/Header";
import Gallery from "@/components/BabyShower/Gallery";

export default function BirthdayPage() {
  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12">
          <Header 
            title="When you were placed in my arms, I understood that love is infinite." 
            date="May 30, 2023" 
          />
        </div>
      </div>
      <div className="row mt-4">
        <div className="col-12">
          <Gallery 
            folder="birthday/delivery-day" 
            limit={3} 
            key="birthday-gallery"
          />
        </div>
      </div>
    </div>
  );
}