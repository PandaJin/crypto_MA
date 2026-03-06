import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/exchanges?per_page=20&page=1',
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API responded with status ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching exchanges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange data' },
      { status: 500 }
    );
  }
}
