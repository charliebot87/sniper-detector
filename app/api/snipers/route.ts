import { NextResponse } from 'next/server';
import { analyzeSnipers } from '@/lib/sniper-analyzer';

export const revalidate = 3600; // 1 hour

export async function GET() {
  try {
    const data = await analyzeSnipers();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Snipers API error:', error);
    return NextResponse.json({ error: 'Failed to analyze snipers' }, { status: 500 });
  }
}
