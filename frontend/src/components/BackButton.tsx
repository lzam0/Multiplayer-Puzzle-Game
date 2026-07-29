'use client';

import { useRouter } from 'next/navigation';

interface BackButtonProps {
  variant?: 'light' | 'dark';
}

export function BackButton({ variant = 'light' }: BackButtonProps) {
  const router = useRouter();

  const styles =
    variant === 'dark'
      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100';

  return (
    <button
      onClick={() => router.push('/')}
      className={`fixed top-4 left-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${styles}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Home
    </button>
  );
}
