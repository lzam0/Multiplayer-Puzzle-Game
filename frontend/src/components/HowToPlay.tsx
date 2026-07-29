'use client';

import { useState } from 'react';

interface HowToPlayProps {
  onClose: () => void;
}

function PhoneScanVisual() {
  return (
    <div className="w-full h-72 flex items-center justify-center">
      <svg width="240" height="260" viewBox="0 0 240 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Phone frame */}
        <rect x="60" y="10" width="120" height="220" rx="16" ry="16" stroke="#9ca3af" strokeWidth="3" fill="#f9fafb" />
        {/* Speaker notch */}
        <rect x="96" y="20" width="48" height="7" rx="3" fill="#d1d5db" />
        {/* Home indicator */}
        <rect x="102" y="218" width="36" height="5" rx="2" fill="#d1d5db" />
        {/* QR code area */}
        <rect x="74" y="40" width="92" height="160" rx="4" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
        {/* QR corner squares */}
        <rect x="80" y="46" width="24" height="24" rx="2" fill="#111827" />
        <rect x="137" y="46" width="24" height="24" rx="2" fill="#111827" />
        <rect x="80" y="128" width="24" height="24" rx="2" fill="#111827" />
        {/* QR inner whites */}
        <rect x="83" y="49" width="18" height="18" rx="1" fill="#ffffff" />
        <rect x="86" y="52" width="12" height="12" fill="#111827" />
        <rect x="140" y="49" width="18" height="18" rx="1" fill="#ffffff" />
        <rect x="143" y="52" width="12" height="12" fill="#111827" />
        <rect x="83" y="131" width="18" height="18" rx="1" fill="#ffffff" />
        <rect x="86" y="134" width="12" height="12" fill="#111827" />
        {/* QR filler dots */}
        <rect x="112" y="54" width="6" height="6" fill="#111827" />
        <rect x="124" y="54" width="6" height="6" fill="#111827" />
        <rect x="112" y="66" width="6" height="6" fill="#111827" />
        <rect x="130" y="66" width="6" height="6" fill="#111827" />
        <rect x="108" y="78" width="6" height="6" fill="#111827" />
        <rect x="120" y="78" width="6" height="6" fill="#111827" />
        <rect x="132" y="78" width="6" height="6" fill="#111827" />
        <rect x="108" y="90" width="6" height="6" fill="#111827" />
        <rect x="126" y="90" width="6" height="6" fill="#111827" />
        <rect x="114" y="102" width="6" height="6" fill="#111827" />
        <rect x="130" y="102" width="6" height="6" fill="#111827" />
        <rect x="108" y="114" width="6" height="6" fill="#111827" />
        <rect x="120" y="114" width="6" height="6" fill="#111827" />
        <rect x="114" y="128" width="6" height="6" fill="#111827" />
        <rect x="126" y="128" width="6" height="6" fill="#111827" />
        <rect x="120" y="140" width="6" height="6" fill="#111827" />
        <rect x="132" y="140" width="6" height="6" fill="#111827" />
        {/* Scan bracket corners */}
        <g className="animate-pulse" opacity="0.9">
          <path d="M62 68 L62 46 L84 46" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M178 68 L178 46 L156 46" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M62 180 L62 202 L84 202" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M178 180 L178 202 L156 202" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
  const cellSize = 44;
  const gap = 5;
  const totalSize = 4 * cellSize + 3 * gap;

  const cx = (col: number) => gap / 2 + (cellSize + gap) * col + cellSize / 2;
  const cy = (row: number) => gap / 2 + (cellSize + gap) * row + cellSize / 2;

  const catPoints = [[cx(0), cy(0)], [cx(1), cy(0)], [cx(2), cy(0)]];
  const dogPoints = [[cx(0), cy(3)], [cx(0), cy(2)], [cx(0), cy(1)]];
  const toPoints = (pts: number[][]) => pts.map((p) => p.join(',')).join(' ');

  return (
    <div className="w-full h-72 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(4, ${cellSize}px)`, gap: `${gap}px` }}
        >
          {GRID_LETTERS.flat().map((letter, i) => (
            <div
              key={i}
              className="flex items-center justify-center bg-white border-2 border-gray-300 rounded text-gray-800 font-bold text-base"
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
          <polyline points={toPoints(catPoints)} stroke="#f97316" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45" />
          <polyline points={toPoints(dogPoints)} stroke="#818cf8" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45" />
        </svg>
      </div>
      <div className="flex gap-5 text-sm font-mono">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#f97316' }} />
          <span className="text-gray-700 font-semibold">CAT</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#818cf8' }} />
          <span className="text-gray-700 font-semibold">DOG</span>
        </span>
      </div>
    </div>
  );
}

function TraceVisual() {
  const cellSize = 44;
  const gap = 5;
  const totalSize = 4 * cellSize + 3 * gap;
  const offset = gap / 2;

  const cx = (col: number) => offset + (cellSize + gap) * col + cellSize / 2;
  const cy = (row: number) => offset + (cellSize + gap) * row + cellSize / 2;

  const tracePoints = [[cx(1), cy(0)], [cx(1), cy(1)], [cx(1), cy(2)], [cx(1), cy(3)]];
  const polylinePoints = tracePoints.map((p) => p.join(',')).join(' ');
  const perimeter = 3 * (cellSize + gap);

  return (
    <div className="w-full h-72 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(4, ${cellSize}px)`, gap: `${gap}px` }}
        >
          {GRID_LETTERS.flat().map((letter, i) => (
            <div
              key={i}
              className="flex items-center justify-center bg-white border-2 border-gray-300 rounded text-gray-800 font-bold text-base"
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
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.5; }
            }
          `}</style>
          <polyline
            points={polylinePoints}
            stroke="#10b981"
            strokeWidth="18"
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
            r="10"
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
  const cx = 90;
  const cy = 90;
  const r = 70;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="w-full h-72 flex flex-col items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
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
        <circle cx={cx} cy={cy} r={r} stroke="#e5e7eb" strokeWidth="14" fill="none" />
        <circle
          cx={cx} cy={cy} r={r}
          stroke="#10b981"
          strokeWidth="14"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ animation: `ring-fill 2.5s ease-in-out infinite` }}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#374151" fontSize="15" fontFamily="monospace" style={{ animation: 'time-count 2.5s ease-in-out infinite' }}>1:29</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#10b981" fontSize="18" fontWeight="bold" opacity="0" style={{ animation: 'finish-fade 2.5s ease-in-out infinite' }}>FINISH!</text>
      </svg>
    </div>
  );
}

function PodiumVisual() {
  return (
    <div className="w-full h-72 flex items-end justify-center gap-4 pb-4">
      {/* 2nd place */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-full bg-gray-400" />
        <p className="text-sm font-mono text-gray-500">18.2s</p>
        <div className="w-20 rounded-t-md bg-gray-300" style={{ height: 90 }}>
          <p className="text-center text-gray-700 font-bold text-base pt-2">2</p>
        </div>
      </div>
      {/* 1st place */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-yellow-500 text-2xl leading-none">♛</span>
        <div className="w-10 h-10 rounded-full bg-yellow-400" />
        <p className="text-sm font-mono text-yellow-600 font-bold">12.4s</p>
        <div className="w-20 rounded-t-md bg-yellow-400" style={{ height: 130 }}>
          <p className="text-center text-white font-bold text-base pt-2">1</p>
        </div>
      </div>
      {/* 3rd place */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-full bg-amber-600" />
        <p className="text-sm font-mono text-gray-500">24.9s</p>
        <div className="w-20 rounded-t-md bg-amber-600" style={{ height: 65 }}>
          <p className="text-center text-white font-bold text-base pt-2">3</p>
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col items-center relative p-8">
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
        <h2 className="text-4xl font-extrabold text-gray-900 text-center mt-2 max-w-md leading-tight">
          {SLIDES[slide].headline}
        </h2>
        <p className="text-xl text-gray-600 text-center max-w-md mt-3">
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
                className={`block w-3 h-3 rounded-full transition-colors ${
                  i <= slide ? 'bg-gray-900' : 'bg-gray-300'
                }`}
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
