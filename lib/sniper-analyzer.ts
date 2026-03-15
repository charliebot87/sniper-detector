const BASE_URL = 'https://indexer.protonnz.com';

export interface Token {
  tokenId: number;
  symbol: string;
  creator: string;
  name?: string;
  graduated?: boolean;
}

export interface Trade {
  account: string;
  type: string;
  timestamp: string;
  xprAmount: number | null;
  tokenAmount: number | null;
}

export interface SniperEntry {
  account: string;
  snipeCount: number;
  avgBuyTimeSeconds: number;
  fastestBuyTimeSeconds: number;
  threatLevel: 'BOT' | 'INSTANT' | 'FAST' | 'HUMAN';
  tokens: SniperTokenEntry[];
  totalXprInvested: number;
}

export interface SniperTokenEntry {
  tokenId: number;
  symbol: string;
  buyTimeSeconds: number;
  buyPosition: number;
  xprInvested: number;
}

export interface SniperStats {
  totalTokensAnalyzed: number;
  totalTradesAnalyzed: number;
  suspectsFound: number;
  topSnipers: SniperEntry[];
  lastUpdated: string;
}

function getThreatLevel(avgSeconds: number): 'BOT' | 'INSTANT' | 'FAST' | 'HUMAN' {
  if (avgSeconds < 5) return 'BOT';
  if (avgSeconds < 30) return 'INSTANT';
  if (avgSeconds < 120) return 'FAST';
  return 'HUMAN';
}

async function fetchAllTokens(): Promise<Token[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/tokens?fields=compact&limit=500`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const data = await res.json();
    const tokens = Array.isArray(data) ? data : (data.tokens || []);
    return tokens as Token[];
  } catch (e) {
    console.error('fetchAllTokens error:', e);
    return [];
  }
}

async function fetchFirstTrades(tokenId: number): Promise<Trade[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/tokens/${tokenId}/trades?limit=50`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const trades: Trade[] = Array.isArray(data) ? data : (data.trades || []);
    const total: number = data.total || trades.length;

    if (total <= 50) {
      return trades;
    }

    // For tokens with many trades, get the oldest ones via offset
    const offset = Math.max(0, total - 30);
    const res2 = await fetch(`${BASE_URL}/api/tokens/${tokenId}/trades?limit=30&offset=${offset}`, {
      next: { revalidate: 3600 },
    });
    if (!res2.ok) return trades;
    const data2 = await res2.json();
    const oldTrades: Trade[] = Array.isArray(data2) ? data2 : (data2.trades || []);
    return oldTrades;
  } catch {
    return [];
  }
}

function parseTimestamp(ts: string): number {
  if (!ts) return 0;
  if (/^\d{10}$/.test(ts)) return parseInt(ts) * 1000;
  if (/^\d{13}$/.test(ts)) return parseInt(ts);
  return new Date(ts).getTime();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory cache for serverless (survives warm starts)
let cachedResult: SniperStats | null = null;
let cachedAt = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

export async function analyzeSnipers(): Promise<SniperStats> {
  // Return cached result if still fresh
  if (cachedResult && Date.now() - cachedAt < CACHE_TTL) {
    return cachedResult;
  }

  const tokens = await fetchAllTokens();
  if (tokens.length === 0) {
    return {
      totalTokensAnalyzed: 0,
      totalTradesAnalyzed: 0,
      suspectsFound: 0,
      topSnipers: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  const accountSnipes = new Map<string, SniperTokenEntry[]>();
  let totalTrades = 0;
  let processed = 0;
  let failed = 0;

  // Process tokens in batches of 10 with 100ms delay between batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (token) => {
        const tokenId = token.tokenId;
        if (!tokenId) return;

        const trades = await fetchFirstTrades(tokenId);
        if (trades.length === 0) return;

        totalTrades += trades.length;

        const sorted = [...trades].sort(
          (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
        );

        const buys = sorted.filter(
          (t) => t.type === 'buy' && t.xprAmount && t.xprAmount > 0
        );
        if (buys.length < 2) return;

        const launchTime = parseTimestamp(buys[0].timestamp);
        if (!launchTime) return;

        const seenAccounts = new Set<string>();
        let position = 0;

        for (const trade of buys) {
          if (seenAccounts.size >= 10) break;
          const acct = trade.account;
          if (!acct || seenAccounts.has(acct)) continue;

          seenAccounts.add(acct);
          position++;

          const tradeTime = parseTimestamp(trade.timestamp);
          const secondsAfterLaunch = Math.max(0, (tradeTime - launchTime) / 1000);

          if (!accountSnipes.has(acct)) accountSnipes.set(acct, []);
          accountSnipes.get(acct)!.push({
            tokenId,
            symbol: token.symbol,
            buyTimeSeconds: secondsAfterLaunch,
            buyPosition: position,
            xprInvested: trade.xprAmount || 0,
          });
        }

        processed++;
      })
    );

    failed += results.filter((r) => r.status === 'rejected').length;

    // Rate limit: 100ms delay between batches
    if (i + BATCH_SIZE < tokens.length) {
      await sleep(100);
    }
  }

  if (failed > 0) {
    console.warn(`${failed} tokens failed to analyze out of ${tokens.length}`);
  }

  // Sniper threshold: in first 10 buyers of 3+ tokens
  const SNIPER_THRESHOLD = 3;
  const snipers: SniperEntry[] = [];

  for (const [account, snipes] of accountSnipes.entries()) {
    if (snipes.length < SNIPER_THRESHOLD) continue;

    const totalXpr = snipes.reduce((s, x) => s + x.xprInvested, 0);
    const avgTime = snipes.reduce((s, x) => s + x.buyTimeSeconds, 0) / snipes.length;
    const fastestTime = Math.min(...snipes.map((s) => s.buyTimeSeconds));

    snipers.push({
      account,
      snipeCount: snipes.length,
      avgBuyTimeSeconds: Math.round(avgTime),
      fastestBuyTimeSeconds: Math.round(fastestTime),
      threatLevel: getThreatLevel(avgTime),
      tokens: snipes.sort((a, b) => a.buyTimeSeconds - b.buyTimeSeconds),
      totalXprInvested: totalXpr,
    });
  }

  snipers.sort(
    (a, b) => b.snipeCount - a.snipeCount || a.avgBuyTimeSeconds - b.avgBuyTimeSeconds
  );

  const result: SniperStats = {
    totalTokensAnalyzed: tokens.length,
    totalTradesAnalyzed: totalTrades,
    suspectsFound: snipers.length,
    topSnipers: snipers.slice(0, 50),
    lastUpdated: new Date().toISOString(),
  };

  // Cache the result
  cachedResult = result;
  cachedAt = Date.now();

  return result;
}
