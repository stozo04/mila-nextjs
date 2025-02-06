"use client";
import Header from "@/components/BabyShower/Header";
import Gallery from "@/components/BabyShower/Gallery";

export default function HoustonPage() {

    return (
        <div className="container mt-4 mb-4">
            <div className="row">
                <div className="col-12">
                    <Header title="Houston" date="May 15, 2023" />
                </div>
            </div>
            <Gallery folder="houston" limit={3} />
        </div>
    )
}