'use client';

interface WordCounterProps {
  words: string[];
  foundWords: string[];
  wordColors?: Record<string, string>;
}

export function WordCounter({ words, foundWords, wordColors }: WordCounterProps) {
  const foundSet = new Set(foundWords);

  const sorted = [...words].sort((a, b) => a.length - b.length);

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((word) => {
        const found = foundSet.has(word);
        const color = wordColors?.[word] ?? '#4ade80';
        return (
          <div key={word} className="flex gap-0.5 items-center">
            {word.split('').map((letter, i) => (
              <div
                key={i}
                className={`w-6 h-6 flex items-center justify-center rounded font-bold font-mono text-xs border ${
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
