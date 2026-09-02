"use client";
import { useState, useEffect } from "react";
import Header from "@/components/BabyShower/Header";
import JourneyGallery from "@/components/Journey/JourneyGallery";
import { useParams } from "next/navigation";
import { getJourneyCards, JourneyType } from "@/lib/supabase/journey";
import type { JourneyCard } from "@/types/blog";

export default function FirstYearDetailPage() {
    const params = useParams();
    const currentSlug = params.slug as string;
    const [cardData, setCardData] = useState<JourneyCard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        async function fetchCard() {
            try {
                const cards = await getJourneyCards(JourneyType.FIRST_YEAR);
                const card = cards.find(card => card.slug === currentSlug);
                if (card) {
                    setCardData(card);
                } else {
                    setError('Card not found');
                }
            } catch (err) {
                console.error('Error fetching card:', err);
                setError('Failed to load card data');
            } finally {
                setIsLoading(false);
            }
        }

        fetchCard();
    }, [currentSlug]);

    if (isLoading) {
        return (
            <div className="container py-5">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !cardData) {
        return (
            <div className="container py-5">
                <div className="alert alert-danger" role="alert">
                    {error || 'Page not found'}
                </div>
            </div>
        );
    }

    return (
        <div className="container py-5">
            <div className="row">
                <div className="col-12">
                    <Header title={cardData.message || cardData.title} date={cardData.date} />
                </div>
            </div>
            <div className="row mt-4">
                <div className="col-12">
                    <JourneyGallery slug={currentSlug} />
                </div>
            </div>
        </div>
    );
}