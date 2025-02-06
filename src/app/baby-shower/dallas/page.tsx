"use client";
import Header from "@/components/BabyShower/Header";
import Gallery from "@/components/BabyShower/Gallery";

export default function DallasPage() {

    return (
        <div className="container mt-4 mb-4">
            <div className="row">
                <div className="col-12">
                    <Header title="Dallas" date="April 8, 2023" />
                </div>
            </div>
            <Gallery folder="dallas" limit={3} />
        </div>
    )
}