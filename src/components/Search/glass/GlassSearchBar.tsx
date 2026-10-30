'use client';

import { FiSearch } from 'react-icons/fi';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  showClear: boolean;
  includeLetters: boolean;
  onIncludeLettersChange: (value: boolean) => void;
  busy: boolean;
  disabled: boolean;
  status: string;
};

export default function GlassSearchBar({ query, onQueryChange, onSubmit, onClear, showClear, includeLetters, onIncludeLettersChange, busy, disabled, status }: Props) {
  return <div className="glass-search">
    {/* Always rendered so screen readers keep the live region between searches. */}
    <p role="status" aria-live="polite" className={`glass-status${status ? ' has-text' : ''}`}>{status}</p>
    <form role="search" className="glass-pill" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <FiSearch aria-hidden="true" className="glass-icon" />
      <input type="search" className="glass-input" aria-label="Search Mila’s memories" placeholder="Try “beach” or “birthday cake”"
        maxLength={200} value={query} onChange={event => onQueryChange(event.target.value)} />
      {showClear && <button type="button" className="glass-text-button" onClick={onClear}>Clear</button>}
      <div className="form-check form-switch mb-0 glass-switch">
        <input className="form-check-input" type="checkbox" role="switch" id="include-letters" checked={includeLetters}
          onChange={event => onIncludeLettersChange(event.target.checked)} />
        <label className="form-check-label" htmlFor="include-letters">Include letters</label>
      </div>
      <button type="submit" className="glass-submit" disabled={disabled || busy || !query.trim()}>
        {busy ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <FiSearch aria-hidden="true" />}
        <span className="visually-hidden">Search</span>
      </button>
    </form>
    <style jsx>{`
      .glass-search {
        position: absolute;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        width: min(640px, calc(100% - 32px));
        z-index: 3;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      }
      .glass-status, .glass-pill {
        pointer-events: auto;
        background: rgba(255, 255, 255, 0.55);
        -webkit-backdrop-filter: blur(18px) saturate(160%);
        backdrop-filter: blur(18px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.7);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 30px rgba(194, 24, 91, 0.16);
        color: #542537;
      }
      .glass-status {
        margin: 0;
        min-height: 0;
        padding: 4px 14px;
        border-radius: 999px;
        font-weight: 600;
        font-size: 0.95rem;
      }
      .glass-status:not(.has-text) {
        padding: 0;
        border-color: transparent;
        background: transparent;
        box-shadow: none;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
      }
      .glass-pill {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 8px 8px 8px 18px;
        border-radius: 999px;
      }
      .glass-pill :global(.glass-icon) { flex: none; color: #c2185b; font-size: 1.1rem; }
      /* Clear already does this; the browser's own search-field cross would be a second one. */
      .glass-input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; display: none; }
      .glass-input {
        flex: 1 1 140px;
        min-width: 0;
        border: 0;
        background: transparent;
        color: #542537;
        padding: 6px 4px;
        outline: none;
      }
      .glass-input::placeholder { color: rgba(84, 37, 55, 0.6); }
      .glass-text-button {
        border: 0;
        background: rgba(255, 255, 255, 0.6);
        color: #c2185b;
        font-weight: 600;
        border-radius: 999px;
        padding: 4px 12px;
      }
      .glass-switch { display: flex; align-items: center; gap: 6px; padding-left: 2.5em; white-space: nowrap; }
      .glass-switch :global(.form-check-input:checked) { background-color: #c2185b; border-color: #c2185b; }
      .glass-submit {
        flex: none;
        width: 40px;
        height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 50%;
        background: #c2185b;
        color: #fff;
        box-shadow: 0 4px 12px rgba(194, 24, 91, 0.35);
        transition: transform 0.15s ease, opacity 0.15s ease;
      }
      .glass-submit:hover:not(:disabled) { transform: scale(1.06); }
      .glass-submit:disabled { opacity: 0.45; }
      .glass-pill:focus-within { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 0 3px rgba(194, 24, 91, 0.35), 0 10px 30px rgba(194, 24, 91, 0.16); }
      .glass-text-button:focus-visible, .glass-submit:focus-visible, .glass-switch :global(.form-check-input:focus-visible) {
        outline: 3px solid #c2185b;
        outline-offset: 2px;
      }
      @media (max-width: 575.98px) {
        /* Full width: on phones the zoom controls move to the top-right corner. */
        .glass-search { bottom: 16px; }
        .glass-pill { border-radius: 24px; padding: 8px 8px 8px 14px; }
        .glass-switch { order: 5; }
      }
      @media (prefers-reduced-motion: reduce) {
        .glass-submit { transition: none; }
        .glass-submit:hover:not(:disabled) { transform: none; }
      }
    `}</style>
  </div>;
}
