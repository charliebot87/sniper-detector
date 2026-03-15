import Link from 'next/link';
import { SniperEntry } from '@/lib/sniper-analyzer';

interface SniperRowProps {
  sniper: SniperEntry;
  rank: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return '#555';
}

const THREAT_CONFIG = {
  BOT: { label: '🤖 BOT', color: '#ff3333' },
  INSTANT: { label: '⚡ INSTANT', color: '#ff8800' },
  FAST: { label: '🏃 FAST', color: '#ffff00' },
  HUMAN: { label: '👤 HUMAN', color: '#00ff88' },
} as const;

export default function SniperRow({ sniper, rank }: SniperRowProps) {
  const threat = THREAT_CONFIG[sniper.threatLevel];

  return (
    <tr>
      <td>
        <span className="font-bold text-lg" style={{ color: getRankColor(rank) }}>
          #{rank}
        </span>
      </td>
      <td>
        <Link
          href={`/sniper/${sniper.account}`}
          className="font-mono hover:underline transition-colors"
          style={{ color: '#00ff88' }}
        >
          {sniper.account}
        </Link>
      </td>
      <td>
        <span className="font-bold" style={{ color: '#9945FF' }}>
          {sniper.snipeCount}
        </span>
      </td>
      <td>
        <span style={{ color: '#e0e0e0' }}>
          {formatTime(sniper.avgBuyTimeSeconds)}
        </span>
      </td>
      <td>
        <span style={{ color: '#ff8800', fontWeight: 'bold' }}>
          {formatTime(sniper.fastestBuyTimeSeconds)}
        </span>
      </td>
      <td>
        <span style={{ color: '#aaa' }}>
          {sniper.totalXprInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })} XPR
        </span>
      </td>
      <td>
        <span
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{
            color: threat.color,
            border: `1px solid ${threat.color}`,
            background: `${threat.color}11`,
          }}
        >
          {threat.label}
        </span>
      </td>
      <td>
        <Link
          href={`/sniper/${sniper.account}`}
          className="text-xs px-3 py-1 rounded transition-all hover:opacity-80"
          style={{
            border: '1px solid #00ff88',
            color: '#00ff88',
            background: 'rgba(0,255,136,0.05)',
          }}
        >
          PROFILE →
        </Link>
      </td>
    </tr>
  );
}
