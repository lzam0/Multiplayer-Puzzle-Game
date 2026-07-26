'use client';

interface WordCounterProps {
  words: string[];
  foundWords: string[];
}

export function WordCounter({ words, foundWords }: WordCounterProps) {
  const foundSet = new Set(foundWords);

  const sorted = [...words].sort((a, b) => {
    const af = foundSet.has(a);
    const bf = foundSet.has(b);
    if (af && !bf) return -1;
    if (!af && bf) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((word) => {
        const found = foundSet.has(word);
        return (
          <div key={word} className="flex gap-1 items-center">
            {word.split('').map((letter, i) => (
              <div
                key={i}
                className={`w-8 h-8 flex items-center justify-center rounded font-bold font-mono text-sm border-2 ${
                  found
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-gray-200 text-gray-400 border-gray-300'
                }`}
              >
                {found ? letter : '_'}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
