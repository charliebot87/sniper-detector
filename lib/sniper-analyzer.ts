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
    // First fetch: get total count and latest trades
    const res = await fetch(`${BASE_URL}/api/tokens/${tokenId}/trades?limit=50`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const trades: Trade[] = Array.isArray(data) ? data : (data.trades || []);
    const total: number = data.total || trades.length;

    // If total <= 50, we have all trades; sort ascending to get first buys
    if (total <= 50) {
      return trades;
    }

    // For tokens with many trades, get the oldest ones via offset
    const offset = Math.max(0, total - 30);
    const res2 = await fetch(`${BASE_URL}/api/tokens/${tokenId}/trades?limit=30&offset=${offset}`, {
      next: { revalidate: 3600 },
    });
    if (!res2.ok) return trades; // fallback to what we have
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

export async function analyzeSnipers(): Promise<SniperStats> {
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

  // Process all tokens (we only have ~200)
  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      const tokenId = token.tokenId;
      if (!tokenId) return;

      const trades = await fetchFirstTrades(tokenId);
      if (trades.length === 0) return;

      totalTrades += trades.length;

      // Sort ascending by timestamp to get first buyers
      const sorted = [...trades].sort(
        (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
      );

      // Only buy trades
      const buys = sorted.filter(
        (t) => t.type === 'buy' && t.xprAmount && t.xprAmount > 0
      );
      if (buys.length < 2) return;

      const launchTime = parseTimestamp(buys[0].timestamp);
      if (!launchTime) return;

      // First 10 unique buyers
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
    })
  );

  // Log any failures
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`${failed.length} tokens failed to analyze`);
  }

  // Sniper threshold: in first 10 buyers of 3+ tokens
  const SNIPER_THRESHOLD = 3;
  const snipers: SniperEntry[] = [];

  for (const [account, snipes] of accountSnipes.entries()) {
    if (snipes.length < SNIPER_THRESHOLD) continue;

    const totalXpr = snipes.reduce((s, x) => s + x.xprInvested, 0);
    const avgTime = snipes.reduce((s, x) => s + x.buyTimeSeconds, 0) / snipes.length;

    snipers.push({
      account,
      snipeCount: snipes.length,
      avgBuyTimeSeconds: Math.round(avgTime),
      tokens: snipes.sort((a, b) => a.buyTimeSeconds - b.buyTimeSeconds),
      totalXprInvested: totalXpr,
    });
  }

  snipers.sort(
    (a, b) => b.snipeCount - a.snipeCount || a.avgBuyTimeSeconds - b.avgBuyTimeSeconds
  );

  return {
    totalTokensAnalyzed: tokens.length,
    totalTradesAnalyzed: totalTrades,
    suspectsFound: snipers.length,
    topSnipers: snipers.slice(0, 50),
    lastUpdated: new Date().toISOString(),
  };
}
