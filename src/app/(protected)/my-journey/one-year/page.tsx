"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getJourneyCards } from "@/lib/supabase/journey";
import { JourneyCard } from "@/types/blog";

export default function OneYearPage() {
  const [visibleCards, setVisibleCards] = useState(3);
  const [cards, setCards] = useState<JourneyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchCards() {
      try {
        const journeyCards = await getJourneyCards('one_year');
        setCards(journeyCards);
      } catch (error) {
        console.error('Error fetching journey cards:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCards();
  }, []);

  const loadMore = () => {
    setVisibleCards(prev => Math.min(prev + 3, cards.length));
  };

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

  return (
    <div className="container py-5">
      <div className="row mb-4">
        <div className="col-12 text-center">
          <h1 className="display-4 mb-3">Life as a One Year Old</h1>
          <p className="lead">Warning: Content may contain excessive cuteness</p>
        </div>
      </div>

      <div className="row g-4">
        {cards.slice(0, visibleCards).map((card) => (
          <div key={card.slug} className="col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">{card.title}</h5>
                <p className="card-text">{card.message}</p>
              </div>
              <div className="card-footer bg-transparent border-0">
                <button
                  onClick={() => router.push(`./one-year/${card.slug}`)}
                  className="btn btn-primary w-100"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visibleCards < cards.length && (
        <div className="row mt-4">
          <div className="col-12 text-center">
            <button onClick={loadMore} className="btn btn-outline-primary rounded-pill px-4" onMouseUp={(e) => e.currentTarget.blur()}>
              Show More
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 