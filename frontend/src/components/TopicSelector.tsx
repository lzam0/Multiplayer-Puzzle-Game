'use client';

const TOPICS = ['Animals', 'Foods', 'Countries', 'Colors', 'Sports'] as const;

interface TopicSelectorProps {
  value: string;
  onChange: (topic: string) => void;
  disabled?: boolean;
}

export function TopicSelector({ value, onChange, disabled = false }: TopicSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {TOPICS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
