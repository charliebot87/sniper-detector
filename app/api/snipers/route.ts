import { NextResponse } from 'next/server';
import { analyzeSnipers } from '@/lib/sniper-analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const data = await analyzeSnipers();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Snipers API error:', error);
    return NextResponse.json({ error: 'Failed to analyze snipers' }, { status: 500 });
  }
}
