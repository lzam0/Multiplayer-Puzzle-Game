'use client';

interface WordCounterProps {
  words: string[];
  foundWords: string[];
  wordColors?: Record<string, string>;
}

export function WordCounter({ words, foundWords, wordColors }: WordCounterProps) {
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
        const color = wordColors?.[word] ?? '#4ade80';
        return (
          <div key={word} className="flex gap-1 items-center">
            {word.split('').map((letter, i) => (
              <div
                key={i}
                className={`w-8 h-8 flex items-center justify-center rounded font-bold font-mono text-sm border-2 ${
                  found ? '' : 'bg-gray-200 text-gray-400 border-gray-300'
                }`}
                style={
                  found
                    ? { backgroundColor: color, color: 'white', borderColor: color }
                    : undefined
                }
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
