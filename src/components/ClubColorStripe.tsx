import React from 'react';

export const CLUB_COLORS = [
  { name: 'Bleu ciel', color: '#009ee2', widthPx: 8 },
  { name: 'Blanc', color: '#ffffff', widthPx: 4 },
  { name: 'Vert', color: '#5daf32', widthPx: 4 },
];

export function ClubColorStripe({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-row shrink-0 rounded-xs overflow-hidden border border-slate-300/80 shadow-2xs select-none ${className}`}
      title="Couleurs officielles du club : Bleu ciel, Blanc, Vert"
      aria-hidden="true"
    >
      <div style={{ backgroundColor: '#009ee2', width: '8px' }} className="h-full" />
      <div style={{ backgroundColor: '#ffffff', width: '4px' }} className="h-full border-y border-slate-200" />
      <div style={{ backgroundColor: '#5daf32', width: '4px' }} className="h-full" />
    </div>
  );
}
