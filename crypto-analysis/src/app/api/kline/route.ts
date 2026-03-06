import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = searchParams.get('limit') || '100';

    // Try multiple endpoints (binance.com may be blocked in some regions)
    const endpoints = [
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    ];

    let response: Response | null = null;
    for (const url of endpoints) {
      try {
        response = await fetch(url, { next: { revalidate: 30 } });
        if (response.ok) break;
      } catch {
        continue;
      }
    }

    if (!response || !response.ok) {
      throw new Error('All Binance endpoints failed');
    }

    const rawData: unknown[][] = await response.json();

    const data: KlineData[] = rawData.map((item) => ({
      time: item[0] as number,
      open: parseFloat(item[1] as string),
      high: parseFloat(item[2] as string),
      low: parseFloat(item[3] as string),
      close: parseFloat(item[4] as string),
      volume: parseFloat(item[5] as string),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching kline data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kline data' },
      { status: 500 }
    );
  }
}
