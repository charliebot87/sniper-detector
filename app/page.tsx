import { analyzeSnipers } from '@/lib/sniper-analyzer';
import MatrixRain from '@/components/MatrixRain';
import StatCard from '@/components/StatCard';
import SniperRow from '@/components/SniperRow';

export const revalidate = 3600;

export default async function HomePage() {
  const stats = await analyzeSnipers();

  return (
    <>
      <MatrixRain />
      <div className="scan-line" />

      <div className="content min-h-screen px-4 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-xs tracking-widest mb-4" style={{ color: '#555' }}>
            SIMPLEDEX INTELLIGENCE SYSTEM v1.0
          </div>
          <h1 className="text-5xl font-bold mb-3 neon-text pulse-neon font-mono">
            🎯 SNIPER DETECTOR
          </h1>
          <p className="text-lg" style={{ color: '#888' }}>
            Exposing bot accounts systematically sniping new token launches
          </p>
          <div className="mt-2 text-xs" style={{ color: '#444' }}>
            Last updated: {new Date(stats.lastUpdated).toLocaleString()} •{' '}
            <span style={{ color: '#00ff88' }}>LIVE</span>
            <span className="blink" style={{ color: '#00ff88' }}>_</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Tokens Analyzed"
            value={stats.totalTokensAnalyzed.toLocaleString()}
            sub="SimpleDEX launches"
          />
          <StatCard
            label="Trades Scanned"
            value={stats.totalTradesAnalyzed.toLocaleString()}
            sub="buy/sell events"
            accent="purple"
          />
          <StatCard
            label="Suspects Found"
            value={stats.suspectsFound}
            sub="potential sniper bots"
          />
          <StatCard
            label="Top Sniper"
            value={stats.topSnipers[0]?.snipeCount ?? 0}
            sub={stats.topSnipers[0]?.account ? `${stats.topSnipers[0].account.slice(0, 12)}...` : 'none found'}
            accent="purple"
          />
        </div>

        {/* Warning banner */}
        <div
          className="rounded-lg p-4 mb-8 text-sm"
          style={{
            border: '1px solid #ff8800',
            background: 'rgba(255,136,0,0.05)',
            color: '#ff8800',
          }}
        >
          ⚠️ <strong>DISCLAIMER:</strong> This tool uses heuristic analysis. An account appearing in
          the first 10 buyers of 3+ tokens may indicate bot activity, but could also be an active
          trader. Use this data for informational purposes only.
        </div>

        {/* Leaderboard */}
        <div className="card rounded-lg overflow-hidden mb-10">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
            <h2 className="text-xl font-bold font-mono" style={{ color: '#00ff88' }}>
              ⚡ SNIPER LEADERBOARD
            </h2>
            <p className="text-xs mt-1" style={{ color: '#555' }}>
              Accounts that consistently buy within the first 10 trades of new launches
            </p>
          </div>

          {stats.topSnipers.length === 0 ? (
            <div className="p-12 text-center" style={{ color: '#444' }}>
              <div className="text-4xl mb-4">🔍</div>
              <div>No snipers detected — either they&apos;re clean or the data is still loading.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>ACCOUNT</th>
                    <th>SNIPES</th>
                    <th>AVG TIME</th>
                    <th>XPR DEPLOYED</th>
                    <th>THREAT</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topSnipers.slice(0, 10).map((sniper, idx) => (
                    <SniperRow key={sniper.account} sniper={sniper} rank={idx + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            {
              icon: '📡',
              title: 'DATA COLLECTION',
              desc: 'Fetches all SimpleDEX token launches and their trade histories from the indexer API.',
            },
            {
              icon: '🧠',
              title: 'PATTERN ANALYSIS',
              desc: 'Identifies accounts appearing in the first 10 buyers across multiple token launches.',
            },
            {
              icon: '🎯',
              title: 'SNIPER SCORING',
              desc: 'Ranks suspects by frequency, speed, and XPR deployed across their snipe history.',
            },
          ].map((item) => (
            <div key={item.title} className="card rounded-lg p-5">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-xs font-bold mb-2" style={{ color: '#9945FF' }}>
                {item.title}
              </div>
              <div className="text-sm" style={{ color: '#888' }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-xs" style={{ color: '#333' }}>
          <span style={{ color: '#9945FF' }}>SimpleDEX Sniper Detector</span> · Built by{' '}
          <a
            href="https://x.com/charliebot87"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#00ff88' }}
          >
            @charliebot87
          </a>{' '}
          · Data: indexer.protonnz.com · Refreshes every hour
        </div>
      </div>
    </>
  );
}
