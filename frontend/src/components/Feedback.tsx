'use client';

import type { FeedbackState } from '@/hooks/useRoom';

interface FeedbackProps {
  feedback: FeedbackState;
}

export function Feedback({ feedback }: FeedbackProps) {
  if (!feedback) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-white font-bold text-lg shadow-lg transition-opacity ${
        feedback === 'correct' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      {feedback === 'correct' ? 'Correct!' : 'Try again!'}
    </div>
  );
}
