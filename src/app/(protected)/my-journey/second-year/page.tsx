"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getJourneyCards, JourneyType } from "@/lib/supabase/journey";
import { JourneyCard } from "@/types/blog";
import { createBrowserClient } from '@supabase/ssr';
import CreateJourneyCardModal from "@/components/Journey/CreateJourneyCardModal";

export default function SecondYearPage() {
  const [visibleCards, setVisibleCards] = useState(3);
  const [cards, setCards] = useState<JourneyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Initialize the Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchCards() {
      try {
        const journeyCards = await getJourneyCards(JourneyType.TWO_YEAR);
        setCards(journeyCards);
      } catch (error) {
        console.error('Error fetching journey cards:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCards();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const loadMore = () => {
    setVisibleCards(prev => Math.min(prev + 3, cards.length));
  };

  const handleCardCreated = (newCard: JourneyCard) => {
    setCards([...cards, newCard]);
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
          <h1 className="display-4 mb-3">My Sweet Second Year</h1>
          <p className="lead">Who says two&apos;s are terrible? Here&apos;s proof they&apos;re terrific!</p>
          {user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
            <button
              className="btn btn-success rounded-pill mt-3"
              onClick={() => setShowCreateModal(true)}
            >
              Create Journey Card
            </button>
          )}
        </div>
      </div>

      <CreateJourneyCardModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onCardCreated={handleCardCreated}
        journeyType={JourneyType.TWO_YEAR}
      />

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
                  onClick={() => router.push(`./second-year/${card.slug}`)}
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