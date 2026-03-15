import Link from 'next/link';
import MatrixRain from '@/components/MatrixRain';

export default function NotFound() {
  return (
    <>
      <MatrixRain />
      <div className="content min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-3xl font-bold font-mono mb-2" style={{ color: '#00ff88' }}>
            ACCOUNT NOT FOUND
          </h1>
          <p className="mb-6" style={{ color: '#888' }}>
            This account hasn&apos;t been detected as a sniper — or isn&apos;t in the current dataset.
          </p>
          <Link
            href="/"
            className="px-6 py-3 rounded font-mono text-sm transition-all hover:opacity-80"
            style={{
              border: '1px solid #00ff88',
              color: '#00ff88',
              background: 'rgba(0,255,136,0.05)',
            }}
          >
            ← BACK TO LEADERBOARD
          </Link>
        </div>
      </div>
    </>
  );
}
