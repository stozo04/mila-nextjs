"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { myFirstYearCards } from "@/types";

export default function FirstYearPage() {
  const [visibleCards, setVisibleCards] = useState(3);
  const router = useRouter();

  const loadMore = () => {
    setVisibleCards(prev => Math.min(prev + 3, myFirstYearCards.length));
  };

  return (
    <div className="container py-5">
      <div className="row mb-4">
        <div className="col-12 text-center">
          <h1 className="display-4 mb-3">My First Year Journey</h1>
          <p className="lead">A collection of precious moments and milestones from my first year of life.</p>
        </div>
      </div>

      <div className="row g-4">
        {myFirstYearCards.slice(0, visibleCards).map((card, index) => (
          <div key={card.slug} className="col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">{card.title}</h5>
                <p className="card-text">{card.message}</p>
              </div>
              <div className="card-footer bg-transparent border-0">
                <button
                  onClick={() => router.push(`./first-year/${card.slug}`)}
                  className="btn btn-primary w-100"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visibleCards < myFirstYearCards.length && (
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