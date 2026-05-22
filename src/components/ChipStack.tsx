'use client';

const DENOMS: Array<{ value: number; color: string; ring: string }> = [
  { value: 1000, color: 'linear-gradient(180deg,#1b1b1b,#000)', ring: '#d4af37' },
  { value: 500, color: 'linear-gradient(180deg,#7a4caa,#3b1c5e)', ring: '#f5d976' },
  { value: 100, color: 'linear-gradient(180deg,#1a1a1a,#0a0a0a)', ring: '#d4af37' },
  { value: 25, color: 'linear-gradient(180deg,#1b6e3b,#0c3a1f)', ring: '#f5d976' },
  { value: 5, color: 'linear-gradient(180deg,#c0392b,#5a1a13)', ring: '#f5d976' },
  { value: 1, color: 'linear-gradient(180deg,#f5f0e1,#bdb59b)', ring: '#a8841f' },
];

export function ChipStack({ amount, size = 'md' }: { amount: number; size?: 'sm' | 'md' | 'lg' }) {
  const stacks = breakdown(amount);
  const px = size === 'sm' ? 14 : size === 'lg' ? 28 : 20;
  return (
    <div className="flex items-end gap-1">
      {stacks.map(({ value, count, color, ring }) => (
        <div key={value} className="relative flex flex-col-reverse" style={{ height: px * Math.min(count, 5) + (px / 4) }}>
          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
            <div
              key={i}
              className="relative rounded-full"
              style={{
                width: px,
                height: px * 0.32,
                background: color,
                border: `1.5px dashed ${ring}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.6), inset 0 -2px 0 rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.15)',
                marginTop: i === 0 ? 0 : -px * 0.18,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function breakdown(amount: number) {
  const out: Array<{ value: number; count: number; color: string; ring: string }> = [];
  let remaining = amount;
  for (const d of DENOMS) {
    const count = Math.floor(remaining / d.value);
    if (count > 0) {
      out.push({ value: d.value, count, color: d.color, ring: d.ring });
      remaining -= count * d.value;
    }
  }
  return out.slice(0, 4);
}
