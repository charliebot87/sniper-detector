import { analyzeSnipers, SniperEntry } from '@/lib/sniper-analyzer';
import MatrixRain from '@/components/MatrixRain';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Props {
  params: Promise<{ account: string }>;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s after launch`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m after launch`;
  return `${Math.round(seconds / 3600)}h after launch`;
}

const THREAT_CONFIG = {
  BOT: { label: '🤖 BOT', color: '#ff3333', desc: 'Avg buy < 5s — almost certainly automated' },
  INSTANT: { label: '⚡ INSTANT', color: '#ff8800', desc: 'Avg buy 5-30s — suspiciously fast' },
  FAST: { label: '🏃 FAST', color: '#ffff00', desc: 'Avg buy 30s-2min — could be a fast trader' },
  HUMAN: { label: '👤 HUMAN', color: '#00ff88', desc: 'Avg buy > 2min — likely manual trading' },
} as const;

function ThreatMeter({ sniper }: { sniper: SniperEntry }) {
  const threat = THREAT_CONFIG[sniper.threatLevel];
  const max = 120; // 2 minutes as max scale
  const pct = Math.min(100, Math.max(5, 100 - (sniper.avgBuyTimeSeconds / max) * 100));

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-bold" style={{ color: threat.color }}>
          {threat.label}
        </span>
        <span className="text-xs" style={{ color: '#888' }}>
          avg {Math.round(sniper.avgBuyTimeSeconds)}s
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: '#1a1a1a' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${threat.color}88, ${threat.color})`,
            boxShadow: `0 0 8px ${threat.color}`,
          }}
        />
      </div>
      <div className="text-xs mt-1" style={{ color: '#555' }}>
        {threat.desc}
      </div>
    </div>
  );
}

export default async function SniperProfilePage({ params }: Props) {
  const { account } = await params;
  const decodedAccount = decodeURIComponent(account);

  const stats = await analyzeSnipers();
  const sniper: SniperEntry | undefined = stats.topSnipers.find(
    (s) => s.account === decodedAccount
  );

  if (!sniper) {
    notFound();
  }

  const avgTime = sniper.avgBuyTimeSeconds;
  const fastest = sniper.fastestBuyTimeSeconds;
  const slowest = Math.max(...sniper.tokens.map((t) => t.buyTimeSeconds));
  const threat = THREAT_CONFIG[sniper.threatLevel];

  // Distribution buckets
  const under5s = sniper.tokens.filter((t) => t.buyTimeSeconds < 5).length;
  const under30s = sniper.tokens.filter((t) => t.buyTimeSeconds >= 5 && t.buyTimeSeconds < 30).length;
  const under120s = sniper.tokens.filter((t) => t.buyTimeSeconds >= 30 && t.buyTimeSeconds < 120).length;
  const over120s = sniper.tokens.filter((t) => t.buyTimeSeconds >= 120).length;

  return (
    <>
      <MatrixRain />
      <div className="scan-line" />

      <div className="content min-h-screen px-4 py-8 max-w-5xl mx-auto">
        {/* Nav */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-xs hover:underline transition-colors"
            style={{ color: '#555' }}
          >
            ← BACK TO LEADERBOARD
          </Link>
        </div>

        {/* Header */}
        <div className="card rounded-lg p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs tracking-widest mb-2" style={{ color: '#555' }}>
                SNIPER PROFILE
              </div>
              <h1 className="text-3xl font-bold font-mono mb-1" style={{ color: '#00ff88' }}>
                {sniper.account}
              </h1>
              <a
                href={`https://explorer.xprnetwork.org/account/${sniper.account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ color: '#9945FF' }}
              >
                View on Explorer →
              </a>
            </div>
            <div className="text-right w-56">
              <div className="text-xs mb-1" style={{ color: '#555' }}>
                TIMING-BASED THREAT
              </div>
              <ThreatMeter sniper={sniper} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total Snipes', value: sniper.snipeCount, color: '#00ff88' },
            { label: 'Avg Buy Time', value: `${Math.round(avgTime)}s`, color: '#9945FF' },
            { label: 'Fastest Buy', value: `${Math.round(fastest)}s`, color: '#ff8800' },
            { label: 'Slowest Buy', value: `${Math.round(slowest)}s`, color: '#888' },
            {
              label: 'XPR Deployed',
              value: `${sniper.totalXprInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              color: '#00ff88',
            },
          ].map((stat) => (
            <div key={stat.label} className="card rounded-lg p-4">
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#555' }}>
                {stat.label}
              </div>
              <div
                className="text-2xl font-bold font-mono"
                style={{
                  color: stat.color,
                  textShadow: `0 0 10px ${stat.color}`,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Speed distribution — 4 buckets */}
        <div className="card rounded-lg p-5 mb-6">
          <h2 className="text-sm font-bold mb-4" style={{ color: '#00ff88' }}>
            ⚡ BUY SPEED DISTRIBUTION
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center text-sm">
            <div>
              <div style={{ color: '#ff3333' }} className="font-bold text-xs">
                🤖 Under 5s
              </div>
              <div className="text-2xl font-mono font-bold" style={{ color: '#ff3333' }}>
                {under5s}
              </div>
              <div className="text-xs" style={{ color: '#444' }}>
                bot-speed
              </div>
            </div>
            <div>
              <div style={{ color: '#ff8800' }} className="font-bold text-xs">
                ⚡ 5s – 30s
              </div>
              <div className="text-2xl font-mono font-bold" style={{ color: '#ff8800' }}>
                {under30s}
              </div>
              <div className="text-xs" style={{ color: '#444' }}>
                instant
              </div>
            </div>
            <div>
              <div style={{ color: '#ffff00' }} className="font-bold text-xs">
                🏃 30s – 2min
              </div>
              <div className="text-2xl font-mono font-bold" style={{ color: '#ffff00' }}>
                {under120s}
              </div>
              <div className="text-xs" style={{ color: '#444' }}>
                fast
              </div>
            </div>
            <div>
              <div style={{ color: '#00ff88' }} className="font-bold text-xs">
                👤 Over 2min
              </div>
              <div className="text-2xl font-mono font-bold" style={{ color: '#00ff88' }}>
                {over120s}
              </div>
              <div className="text-xs" style={{ color: '#444' }}>
                human-speed
              </div>
            </div>
          </div>

          {/* Visual bar */}
          <div className="flex h-3 rounded-full overflow-hidden mt-4" style={{ background: '#1a1a1a' }}>
            {[
              { count: under5s, color: '#ff3333' },
              { count: under30s, color: '#ff8800' },
              { count: under120s, color: '#ffff00' },
              { count: over120s, color: '#00ff88' },
            ].map((bucket, i) => {
              const pct = (bucket.count / sniper.tokens.length) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={i}
                  style={{
                    width: `${pct}%`,
                    background: bucket.color,
                    boxShadow: `0 0 6px ${bucket.color}`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Token snipe history */}
        <div className="card rounded-lg overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
            <h2 className="text-lg font-bold font-mono" style={{ color: '#00ff88' }}>
              🎯 SNIPE HISTORY
            </h2>
            <p className="text-xs mt-1" style={{ color: '#555' }}>
              All detected snipes, sorted by speed (fastest first)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>TOKEN</th>
                  <th>BUY POSITION</th>
                  <th>TIME AFTER LAUNCH</th>
                  <th>XPR SPENT</th>
                  <th>SPEED RATING</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sniper.tokens.map((t) => {
                  const speedColor =
                    t.buyTimeSeconds < 5
                      ? '#ff3333'
                      : t.buyTimeSeconds < 30
                      ? '#ff8800'
                      : t.buyTimeSeconds < 120
                      ? '#ffff00'
                      : '#00ff88';
                  const speedLabel =
                    t.buyTimeSeconds < 5
                      ? '🤖 BOT'
                      : t.buyTimeSeconds < 30
                      ? '⚡ INSTANT'
                      : t.buyTimeSeconds < 120
                      ? '🏃 FAST'
                      : '👤 HUMAN';

                  return (
                    <tr key={`${t.tokenId}-${t.buyPosition}`}>
                      <td>
                        <a
                          href={`https://dex.protonnz.com/launch/${t.tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono hover:underline"
                          style={{ color: '#9945FF' }}
                        >
                          ${t.symbol}
                        </a>
                      </td>
                      <td>
                        <span
                          style={{
                            color: t.buyPosition <= 3 ? '#ff3333' : '#888',
                            fontWeight: t.buyPosition <= 3 ? 'bold' : 'normal',
                          }}
                        >
                          #{t.buyPosition}
                        </span>
                      </td>
                      <td style={{ color: '#e0e0e0' }}>{formatTime(t.buyTimeSeconds)}</td>
                      <td style={{ color: '#aaa' }}>
                        {t.xprInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })} XPR
                      </td>
                      <td>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            color: speedColor,
                            border: `1px solid ${speedColor}`,
                            background: `${speedColor}11`,
                          }}
                        >
                          {speedLabel}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`https://dex.protonnz.com/launch/${t.tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline"
                          style={{ color: '#555' }}
                        >
                          DEX →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-xs" style={{ color: '#333' }}>
          Data refreshes hourly · Speed range: {Math.round(fastest)}s – {Math.round(slowest)}s ·{' '}
          Verdict: <span style={{ color: threat.color, fontWeight: 'bold' }}>{threat.label}</span> ·{' '}
          <Link href="/" style={{ color: '#9945FF' }}>
            Back to leaderboard
          </Link>
        </div>
      </div>
    </>
  );
}
