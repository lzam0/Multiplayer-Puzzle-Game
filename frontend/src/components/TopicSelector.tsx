'use client';

interface TopicSelectorProps {
  value: string;
  onChange: (topic: string) => void;
  disabled?: boolean;
}

export function TopicSelector({ value, onChange, disabled = false }: TopicSelectorProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Enter a topic…"
      className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white text-gray-900"
    />
  );
}
