'use client';

import { useState } from 'react';

interface HowToPlayProps {
  onClose: () => void;
}

function PhoneScanVisual() {
  return (
    <div className="w-full h-80 flex items-center justify-center">
      <svg width="290" height="310" viewBox="0 0 290 310" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Phone frame */}
        <rect x="70" y="10" width="150" height="270" rx="20" ry="20" stroke="#9ca3af" strokeWidth="4" fill="#f9fafb" />
        {/* Speaker notch */}
        <rect x="115" y="22" width="60" height="8" rx="4" fill="#d1d5db" />
        {/* Home indicator */}
        <rect x="122" y="268" width="46" height="6" rx="3" fill="#d1d5db" />
        {/* QR code area */}
        <rect x="86" y="46" width="118" height="200" rx="4" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
        {/* QR corner squares */}
        <rect x="94" y="54" width="30" height="30" rx="2" fill="#111827" />
        <rect x="166" y="54" width="30" height="30" rx="2" fill="#111827" />
        <rect x="94" y="158" width="30" height="30" rx="2" fill="#111827" />
        {/* QR inner whites */}
        <rect x="98" y="58" width="22" height="22" rx="1" fill="#ffffff" />
        <rect x="102" y="62" width="14" height="14" fill="#111827" />
        <rect x="170" y="58" width="22" height="22" rx="1" fill="#ffffff" />
        <rect x="174" y="62" width="14" height="14" fill="#111827" />
        <rect x="98" y="162" width="22" height="22" rx="1" fill="#ffffff" />
        <rect x="102" y="166" width="14" height="14" fill="#111827" />
        {/* QR filler dots */}
        <rect x="134" y="62" width="8" height="8" fill="#111827" />
        <rect x="150" y="62" width="8" height="8" fill="#111827" />
        <rect x="134" y="78" width="8" height="8" fill="#111827" />
        <rect x="158" y="78" width="8" height="8" fill="#111827" />
        <rect x="128" y="94" width="8" height="8" fill="#111827" />
        <rect x="144" y="94" width="8" height="8" fill="#111827" />
        <rect x="160" y="94" width="8" height="8" fill="#111827" />
        <rect x="128" y="110" width="8" height="8" fill="#111827" />
        <rect x="152" y="110" width="8" height="8" fill="#111827" />
        <rect x="136" y="126" width="8" height="8" fill="#111827" />
        <rect x="158" y="126" width="8" height="8" fill="#111827" />
        <rect x="128" y="142" width="8" height="8" fill="#111827" />
        <rect x="144" y="142" width="8" height="8" fill="#111827" />
        <rect x="136" y="158" width="8" height="8" fill="#111827" />
        <rect x="152" y="158" width="8" height="8" fill="#111827" />
        <rect x="144" y="174" width="8" height="8" fill="#111827" />
        <rect x="160" y="174" width="8" height="8" fill="#111827" />
        {/* Scan bracket corners */}
        <g className="animate-pulse" opacity="0.9">
          <path d="M72 82 L72 52 L102 52" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M218 82 L218 52 L188 52" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M72 228 L72 258 L102 258" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M218 228 L218 258 L188 258" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}

const GRID_LETTERS = [
  ['C', 'A', 'T', 'S'],
  ['O', 'I', 'R', 'E'],
  ['G', 'L', 'O', 'N'],
  ['S', 'A', 'X', 'D'],
];

const CELL = 56;
const GAP = 6;

function gridCx(col: number) { return GAP / 2 + (CELL + GAP) * col + CELL / 2; }
function gridCy(row: number) { return GAP / 2 + (CELL + GAP) * row + CELL / 2; }
const GRID_TOTAL = 4 * CELL + 3 * GAP;

function GridCells() {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(4, ${CELL}px)`, gap: `${GAP}px` }}
    >
      {GRID_LETTERS.flat().map((letter, i) => (
        <div
          key={i}
          className="flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg text-gray-800 font-bold text-xl"
          style={{ width: CELL, height: CELL }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

function GridWordsVisual() {
  const catPoints = [[gridCx(0), gridCy(0)], [gridCx(1), gridCy(0)], [gridCx(2), gridCy(0)]];
  const dogPoints = [[gridCx(0), gridCy(3)], [gridCx(0), gridCy(2)], [gridCx(0), gridCy(1)]];
  const toPoints = (pts: number[][]) => pts.map((p) => p.join(',')).join(' ');

  return (
    <div className="w-full h-80 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <GridCells />
        <svg
          className="absolute inset-0 pointer-events-none"
          width={GRID_TOTAL + GAP}
          height={GRID_TOTAL + GAP}
          style={{ top: -GAP / 2, left: -GAP / 2 }}
        >
          <polyline points={toPoints(catPoints)} stroke="#f97316" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45" />
          <polyline points={toPoints(dogPoints)} stroke="#818cf8" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45" />
        </svg>
      </div>
      <div className="flex gap-6 text-base font-mono">
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#f97316' }} />
          <span className="text-gray-700 font-semibold">CAT</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#818cf8' }} />
          <span className="text-gray-700 font-semibold">DOG</span>
        </span>
      </div>
    </div>
  );
}

function TraceVisual() {
  const tracePoints = [
    [gridCx(1), gridCy(0)],
    [gridCx(1), gridCy(1)],
    [gridCx(1), gridCy(2)],
    [gridCx(1), gridCy(3)],
  ];
  const polylinePoints = tracePoints.map((p) => p.join(',')).join(' ');
  const perimeter = 3 * (CELL + GAP);

  return (
    <div className="w-full h-80 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <GridCells />
        <svg
          className="absolute inset-0 pointer-events-none"
          width={GRID_TOTAL + GAP}
          height={GRID_TOTAL + GAP}
          style={{ top: -GAP / 2, left: -GAP / 2 }}
        >
          <style>{`
            @keyframes draw-stroke {
              0%   { stroke-dashoffset: ${perimeter}; }
              60%  { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes finger-pulse {
              0%, 100% { opacity: 1; }
              50%      { opacity: 0.4; }
            }
          `}</style>
          <polyline
            points={polylinePoints}
            stroke="#10b981"
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.55"
            strokeDasharray={perimeter}
            strokeDashoffset={perimeter}
            style={{ animation: 'draw-stroke 1.5s ease-in-out infinite' }}
          />
          <circle
            cx={tracePoints[0][0]}
            cy={tracePoints[0][1]}
            r="13"
            fill="#374151"
            opacity="0.8"
            style={{ animation: 'finger-pulse 1.5s ease-in-out infinite' }}
          />
        </svg>
      </div>
      <p className="text-sm text-gray-500 font-mono tracking-widest">Drag through the letters</p>
    </div>
  );
}

function TimerVisual() {
  const cx = 110;
  const cy = 110;
  const r = 88;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="w-full h-80 flex items-center justify-center">
      <svg width="220" height="220" viewBox="0 0 220 220">
        <style>{`
          @keyframes ring-fill {
            0%   { stroke-dashoffset: ${circumference}; }
            70%  { stroke-dashoffset: 0; }
            85%  { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: ${circumference}; }
          }
          @keyframes finish-fade {
            0%, 65% { opacity: 0; }
            75%     { opacity: 1; }
            90%     { opacity: 1; }
            100%    { opacity: 0; }
          }
          @keyframes time-count {
            0%   { opacity: 1; }
            65%  { opacity: 1; }
            70%  { opacity: 0; }
            90%  { opacity: 0; }
            95%  { opacity: 1; }
            100% { opacity: 1; }
          }
        `}</style>
        <circle cx={cx} cy={cy} r={r} stroke="#e5e7eb" strokeWidth="16" fill="none" />
        <circle
          cx={cx} cy={cy} r={r}
          stroke="#10b981"
          strokeWidth="16"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ animation: `ring-fill 2.5s ease-in-out infinite` }}
        />
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#374151" fontSize="20" fontFamily="monospace" fontWeight="bold" style={{ animation: 'time-count 2.5s ease-in-out infinite' }}>1:29</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#10b981" fontSize="22" fontWeight="bold" opacity="0" style={{ animation: 'finish-fade 2.5s ease-in-out infinite' }}>FINISH!</text>
      </svg>
    </div>
  );
}

function PodiumVisual() {
  return (
    <div className="w-full h-80 flex items-end justify-center gap-4 pb-4">
      {/* 2nd place */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-full bg-gray-400" />
        <p className="text-sm font-mono text-gray-500">18.2s</p>
        <div className="w-24 rounded-t-lg bg-gray-300 flex items-start justify-center pt-3" style={{ height: 110 }}>
          <span className="text-gray-700 font-bold text-lg">2</span>
        </div>
      </div>
      {/* 1st place */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-yellow-500 text-3xl leading-none">♛</span>
        <div className="w-12 h-12 rounded-full bg-yellow-400" />
        <p className="text-sm font-mono text-yellow-600 font-bold">12.4s</p>
        <div className="w-24 rounded-t-lg bg-yellow-400 flex items-start justify-center pt-3" style={{ height: 160 }}>
          <span className="text-white font-bold text-lg">1</span>
        </div>
      </div>
      {/* 3rd place */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-full bg-amber-600" />
        <p className="text-sm font-mono text-gray-500">24.9s</p>
        <div className="w-24 rounded-t-lg bg-amber-600 flex items-start justify-center pt-3" style={{ height: 80 }}>
          <span className="text-white font-bold text-lg">3</span>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    visual: PhoneScanVisual,
    headline: 'Grab your phone and scan!',
    body: 'Open the camera app, point it at the QR code, and tap the link.',
  },
  {
    visual: GridWordsVisual,
    headline: 'Words are hiding in the grid.',
    body: 'When the round starts, a letter grid appears on your phone. Your job: find all the hidden words!',
  },
  {
    visual: TraceVisual,
    headline: 'Drag your finger to spell a word.',
    body: "Press and drag through the letters in order. Let go when you've traced the whole word.",
  },
  {
    visual: TimerVisual,
    headline: 'Find them ALL as fast as you can!',
    body: 'Your timer starts the moment the grid appears. Finish all the words to stop your clock.',
  },
  {
    visual: PodiumVisual,
    headline: '3 rounds. Lowest total time wins!',
    body: 'After 3 rounds, whoever took the least time across all puzzles stands on top.',
  },
];

export function HowToPlay({ onClose }: HowToPlayProps) {
  const [slide, setSlide] = useState(0);
  const TOTAL = 5;
  const SlideVisual = SLIDES[slide].visual;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/80 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col items-center relative p-8">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors text-3xl font-light leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Visual */}
        <SlideVisual />

        {/* Text */}
        <h2 className="text-4xl font-extrabold text-gray-900 text-center mt-2 max-w-lg leading-tight">
          {SLIDES[slide].headline}
        </h2>
        <p className="text-xl text-gray-600 text-center max-w-lg mt-3">
          {SLIDES[slide].body}
        </p>

        {/* Navigation */}
        <div className="flex items-center gap-6 mt-6">
          <button
            onClick={() => setSlide((s) => s - 1)}
            disabled={slide === 0}
            className="px-5 py-2 rounded-lg font-bold text-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-900"
          >
            Prev
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span
                key={i}
                className={`block w-3 h-3 rounded-full transition-colors ${i <= slide ? 'bg-gray-900' : 'bg-gray-300'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setSlide((s) => s + 1)}
            disabled={slide === TOTAL - 1}
            className="px-5 py-2 rounded-lg font-bold text-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-900"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
