"use client";
import Header from "@/components/BabyShower/Header";
import Gallery from "@/components/BabyShower/Gallery";

export default function DallasPage() {
    return (
        <div className="container py-5">
        <div className="row">
            <div className="col-12">
                <Header title="Dallas" date="May 15, 2023" />
            </div>
        </div>
        <div className="row mt-4">
            <div className="col-12">
                <Gallery 
                    folder="dallas" 
                    limit={3} 
                    key="dallas-gallery"
                    />
                </div>
            </div>
        </div>
    )
}