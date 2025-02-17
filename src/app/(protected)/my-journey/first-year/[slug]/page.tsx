"use client";
import Header from "@/components/BabyShower/Header";
import Gallery from "@/components/BabyShower/Gallery";
import { useParams } from "next/navigation";
import { myFirstYearCards } from "@/types/blog";

export default function MyFirstYearPage() {
    const params = useParams();
    const currentSlug = params.slug as string;
    
    // Find the matching card data
    const cardData = myFirstYearCards.find(card => card.slug === currentSlug);

    if (!cardData) {
        return <div>Page not found</div>;
    }

    return (
        <div className="container py-5">
            <div className="row">
                <div className="col-12">
                    <Header title={cardData.message} date={cardData.date} />
                </div>
            </div>
            <div className="row mt-4">
                <div className="col-12">
                    <Gallery 
                        folder={`birthday/${currentSlug}`}
                        limit={3} 
                        key={`${currentSlug}-gallery`}
                    />
                </div>
            </div>
        </div>
    )
}