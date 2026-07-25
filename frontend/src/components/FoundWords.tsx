'use client';

interface FoundWordsProps {
  words: string[];
}

export function FoundWords({ words }: FoundWordsProps) {
  if (words.length === 0) {
    return <p className="text-gray-400 italic text-sm">No words found yet</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {words.map((w) => (
        <span
          key={w}
          className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium"
        >
          {w}
        </span>
      ))}
    </div>
  );
}
