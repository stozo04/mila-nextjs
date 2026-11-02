'use client';

import { FiMinus, FiPlus } from 'react-icons/fi';

type Props = { onZoomIn: () => void; onZoomOut: () => void; onReset: () => void };

export default function GlassZoomControls({ onZoomIn, onZoomOut, onReset }: Props) {
  return <div className="glass-zoom">
    <button type="button" className="glass-zoom-button" aria-label="Zoom in" onClick={onZoomIn}><FiPlus aria-hidden="true" /></button>
    <button type="button" className="glass-zoom-button" aria-label="Zoom out" onClick={onZoomOut}><FiMinus aria-hidden="true" /></button>
    <button type="button" className="glass-zoom-button glass-reset" onClick={onReset}>Reset view</button>
    <style jsx>{`
      .glass-zoom {
        position: absolute;
        right: 16px;
        bottom: 96px; /* clear of the chat launcher in the corner */
        z-index: 3;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .glass-zoom-button {
        min-width: 44px;
        height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.55);
        -webkit-backdrop-filter: blur(18px) saturate(160%);
        backdrop-filter: blur(18px) saturate(160%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 24px rgba(194, 24, 91, 0.16);
        color: #c2185b;
        font-size: 1.15rem;
        transition: transform 0.15s ease;
      }
      .glass-reset { padding: 0 14px; font-size: 0.85rem; font-weight: 600; color: #542537; }
      .glass-zoom-button:hover { transform: scale(1.05); }
      .glass-zoom-button:focus-visible { outline: 3px solid #c2185b; outline-offset: 2px; }
      /* On phones the search bar takes the full bottom edge. */
      @media (max-width: 575.98px) { .glass-zoom { top: 88px; bottom: auto; flex-direction: row; } } /* below the glass nav pill */
      @media (prefers-reduced-motion: reduce) {
        .glass-zoom-button { transition: none; }
        .glass-zoom-button:hover { transform: none; }
      }
    `}</style>
  </div>;
}
