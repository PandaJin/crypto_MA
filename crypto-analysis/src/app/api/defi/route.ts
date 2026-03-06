import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const response = await fetch(
      'https://api.llama.fi/overview/dexs?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume',
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      throw new Error(`DefiLlama API responded with status ${response.status}`);
    }

    const rawData = await response.json();

    const data = {
      total24h: rawData.total24h,
      total7d: rawData.total7d,
      totalDataChart: rawData.totalDataChart,
      protocols: rawData.protocols?.map(
        (protocol: { name: string; total24h: number; [key: string]: unknown }) => ({
          name: protocol.name,
          total24h: protocol.total24h,
        })
      ),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching DeFi data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DeFi data' },
      { status: 500 }
    );
  }
}
