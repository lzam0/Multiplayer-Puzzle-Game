'use client';

import { useState } from 'react';

interface HowToPlayProps {
  onClose: () => void;
}

function PhoneScanVisual() {
  return (
    <div className="w-80 h-60 flex items-center justify-center">
      <svg width="200" height="220" viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Phone frame */}
        <rect x="50" y="10" width="100" height="180" rx="14" ry="14" stroke="#9ca3af" strokeWidth="3" fill="#1f2937" />
        {/* Speaker notch */}
        <rect x="80" y="18" width="40" height="6" rx="3" fill="#4b5563" />
        {/* Home indicator */}
        <rect x="85" y="180" width="30" height="4" rx="2" fill="#4b5563" />
        {/* QR code area */}
        <rect x="62" y="35" width="76" height="130" rx="4" fill="#f9fafb" />
        {/* QR pattern — corner squares */}
        <rect x="67" y="40" width="20" height="20" rx="2" fill="#111827" />
        <rect x="90" y="40" width="5" height="5" fill="#111827" />
        <rect x="100" y="40" width="5" height="5" fill="#111827" />
        <rect x="113" y="40" width="20" height="20" rx="2" fill="#111827" />
        <rect x="67" y="105" width="20" height="20" rx="2" fill="#111827" />
        {/* QR inner dots */}
        <rect x="70" y="43" width="14" height="14" rx="1" fill="#f9fafb" />
        <rect x="73" y="46" width="8" height="8" fill="#111827" />
        <rect x="116" y="43" width="14" height="14" rx="1" fill="#f9fafb" />
        <rect x="119" y="46" width="8" height="8" fill="#111827" />
        <rect x="70" y="108" width="14" height="14" rx="1" fill="#f9fafb" />
        <rect x="73" y="111" width="8" height="8" fill="#111827" />
        {/* QR filler dots */}
        <rect x="95" y="48" width="5" height="5" fill="#111827" />
        <rect x="105" y="48" width="5" height="5" fill="#111827" />
        <rect x="95" y="58" width="5" height="5" fill="#111827" />
        <rect x="110" y="58" width="5" height="5" fill="#111827" />
        <rect x="90" y="68" width="5" height="5" fill="#111827" />
        <rect x="100" y="68" width="5" height="5" fill="#111827" />
        <rect x="110" y="68" width="5" height="5" fill="#111827" />
        <rect x="90" y="78" width="5" height="5" fill="#111827" />
        <rect x="105" y="78" width="5" height="5" fill="#111827" />
        <rect x="95" y="88" width="5" height="5" fill="#111827" />
        <rect x="110" y="88" width="5" height="5" fill="#111827" />
        <rect x="90" y="98" width="5" height="5" fill="#111827" />
        <rect x="100" y="98" width="5" height="5" fill="#111827" />
        <rect x="95" y="108" width="5" height="5" fill="#111827" />
        <rect x="105" y="108" width="5" height="5" fill="#111827" />
        <rect x="100" y="118" width="5" height="5" fill="#111827" />
        <rect x="110" y="118" width="5" height="5" fill="#111827" />
        {/* Scan bracket corners — animated */}
        <g className="animate-pulse" opacity="0.9">
          <path d="M55 55 L55 40 L70 40" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M145 55 L145 40 L130 40" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M55 145 L55 160 L70 160" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M145 145 L145 160 L130 160" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

function GridWordsVisual() {
  const cellSize = 32;
  const gap = 4;
  const totalSize = 4 * cellSize + 3 * gap;

  // CAT: (0,0)(0,1)(0,2)
  const catPoints = [
    [gap / 2 + cellSize * 0 + cellSize / 2, gap / 2 + cellSize * 0 + cellSize / 2],
    [gap / 2 + (cellSize + gap) * 1 + cellSize / 2, gap / 2 + cellSize / 2],
    [gap / 2 + (cellSize + gap) * 2 + cellSize / 2, gap / 2 + cellSize / 2],
  ];
  // DOG: (3,0)(2,0)(1,0)
  const dogPoints = [
    [gap / 2 + (cellSize + gap) * 0 + cellSize / 2, gap / 2 + (cellSize + gap) * 3 + cellSize / 2],
    [gap / 2 + (cellSize + gap) * 0 + cellSize / 2, gap / 2 + (cellSize + gap) * 2 + cellSize / 2],
    [gap / 2 + (cellSize + gap) * 0 + cellSize / 2, gap / 2 + (cellSize + gap) * 1 + cellSize / 2],
  ];

  const toPoints = (pts: number[][]) => pts.map((p) => p.join(',')).join(' ');

  return (
    <div className="w-80 h-60 flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(4, ${cellSize}px)`, gap: `${gap}px` }}
        >
          {GRID_LETTERS.flat().map((letter, i) => (
            <div
              key={i}
              className="flex items-center justify-center bg-gray-700 rounded text-white font-bold text-sm"
              style={{ width: cellSize, height: cellSize }}
            >
              {letter}
            </div>
          ))}
        </div>
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalSize + gap}
          height={totalSize + gap}
          style={{ top: -gap / 2, left: -gap / 2 }}
        >
          <polyline
            points={toPoints(catPoints)}
            stroke="#f97316"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.45"
          />
          <polyline
            points={toPoints(dogPoints)}
            stroke="#818cf8"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.45"
          />
        </svg>
      </div>
      <div className="flex gap-4 text-sm font-mono">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#f97316' }} />
          <span className="text-gray-200">CAT</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#818cf8' }} />
          <span className="text-gray-200">DOG</span>
        </span>
      </div>
    </div>
  );
}

function TraceVisual() {
  const cellSize = 32;
  const gap = 4;
  const totalSize = 4 * cellSize + 3 * gap;
  const offset = gap / 2;

  // Trace path: B(0,1) -> I(1,1) -> R(1,2) -> D(3,3)
  // Using row,col: (0,1),(1,1),(2,1),(3,1) = OILS down col 1
  const tracePoints = [
    [offset + (cellSize + gap) * 1 + cellSize / 2, offset + (cellSize + gap) * 0 + cellSize / 2],
    [offset + (cellSize + gap) * 1 + cellSize / 2, offset + (cellSize + gap) * 1 + cellSize / 2],
    [offset + (cellSize + gap) * 1 + cellSize / 2, offset + (cellSize + gap) * 2 + cellSize / 2],
    [offset + (cellSize + gap) * 1 + cellSize / 2, offset + (cellSize + gap) * 3 + cellSize / 2],
  ];
  const polylinePoints = tracePoints.map((p) => p.join(',')).join(' ');

  // Approximate perimeter for stroke-dasharray
  const perimeter = 3 * (cellSize + gap);

  const fingerX = tracePoints[0][0];
  const fingerY = tracePoints[0][1];

  return (
    <div className="w-80 h-60 flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(4, ${cellSize}px)`, gap: `${gap}px` }}
        >
          {GRID_LETTERS.flat().map((letter, i) => (
            <div
              key={i}
              className="flex items-center justify-center bg-gray-700 rounded text-white font-bold text-sm"
              style={{ width: cellSize, height: cellSize }}
            >
              {letter}
            </div>
          ))}
        </div>
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalSize + gap}
          height={totalSize + gap}
          style={{ top: -offset, left: -offset }}
        >
          <style>{`
            @keyframes draw-stroke {
              0%   { stroke-dashoffset: ${perimeter}; }
              60%  { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes finger-pulse {
              0%, 100% { opacity: 1; r: 8; }
              50%       { opacity: 0.5; r: 10; }
            }
          `}</style>
          <polyline
            points={polylinePoints}
            stroke="#34d399"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.55"
            strokeDasharray={perimeter}
            strokeDashoffset={perimeter}
            style={{ animation: 'draw-stroke 1.5s ease-in-out infinite' }}
          />
          <circle
            cx={fingerX}
            cy={fingerY}
            r="8"
            fill="white"
            opacity="0.85"
            style={{ animation: 'finger-pulse 1.5s ease-in-out infinite' }}
          />
        </svg>
      </div>
      <p className="text-xs text-gray-400 font-mono tracking-widest">Drag through the letters</p>
    </div>
  );
}

function TimerVisual() {
  const cx = 80;
  const cy = 80;
  const r = 60;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="w-80 h-60 flex flex-col items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
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
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} stroke="#374151" strokeWidth="12" fill="none" />
        {/* Filling ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#34d399"
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ animation: `ring-fill 2.5s ease-in-out infinite` }}
        />
        {/* Timer label */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="#d1d5db"
          fontSize="13"
          fontFamily="monospace"
          style={{ animation: 'time-count 2.5s ease-in-out infinite' }}
        >
          1:29
        </text>
        {/* FINISH label */}
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="#34d399"
          fontSize="16"
          fontWeight="bold"
          opacity="0"
          style={{ animation: 'finish-fade 2.5s ease-in-out infinite' }}
        >
          FINISH!
        </text>
      </svg>
    </div>
  );
}

function PodiumVisual() {
  return (
    <div className="w-80 h-60 flex items-end justify-center gap-3 pb-4">
      {/* 2nd place */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-gray-400" />
        <p className="text-xs font-mono text-gray-400">18.2s</p>
        <div className="w-16 rounded-t-md bg-gray-500" style={{ height: 80 }}>
          <p className="text-center text-white font-bold text-sm pt-2">2</p>
        </div>
      </div>
      {/* 1st place */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-yellow-400 text-2xl leading-none" aria-label="crown">♛</span>
        <div className="w-8 h-8 rounded-full bg-yellow-400" />
        <p className="text-xs font-mono text-yellow-300">12.4s</p>
        <div className="w-16 rounded-t-md bg-yellow-500" style={{ height: 120 }}>
          <p className="text-center text-white font-bold text-sm pt-2">1</p>
        </div>
      </div>
      {/* 3rd place */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-amber-700" />
        <p className="text-xs font-mono text-gray-400">24.9s</p>
        <div className="w-16 rounded-t-md bg-amber-800" style={{ height: 60 }}>
          <p className="text-center text-white font-bold text-sm pt-2">3</p>
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
    body: 'Press and drag through the letters in order. Let go when you\'ve traced the whole word.',
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
    <div className="fixed inset-0 z-50 bg-gray-950/95 flex flex-col items-center justify-center p-8">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors text-3xl font-light leading-none"
        aria-label="Close"
      >
        &times;
      </button>

      {/* Visual */}
      <SlideVisual />

      {/* Text */}
      <h2 className="text-4xl font-extrabold text-white text-center mt-4 max-w-xl">
        {SLIDES[slide].headline}
      </h2>
      <p className="text-xl text-gray-300 text-center max-w-md mt-3">
        {SLIDES[slide].body}
      </p>

      {/* Navigation */}
      <div className="flex items-center gap-6 mt-8">
        <button
          onClick={() => setSlide((s) => s - 1)}
          disabled={slide === 0}
          className="px-5 py-2 rounded-lg font-bold text-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
        >
          Prev
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span
              key={i}
              className={`block w-3 h-3 rounded-full transition-colors ${
                i <= slide ? 'bg-white' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setSlide((s) => s + 1)}
          disabled={slide === TOTAL - 1}
          className="px-5 py-2 rounded-lg font-bold text-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
