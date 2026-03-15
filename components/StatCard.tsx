interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'neon' | 'purple';
}

export default function StatCard({ label, value, sub, accent = 'neon' }: StatCardProps) {
  return (
    <div className="card rounded-lg p-4">
      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#666' }}>{label}</div>
      <div
        className="text-2xl font-bold font-mono"
        style={{
          color: accent === 'neon' ? '#00ff88' : '#9945FF',
          textShadow: `0 0 10px ${accent === 'neon' ? '#00ff88' : '#9945FF'}`,
        }}
      >
        {value}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: '#555' }}>{sub}</div>}
    </div>
  );
}
