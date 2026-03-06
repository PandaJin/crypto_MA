import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get('limit') || '30';

    const response = await fetch(
      `https://api.alternative.me/fng/?limit=${limit}&format=json`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error(`Alternative.me API responded with status ${response.status}`);
    }

    const rawData = await response.json();

    return NextResponse.json(rawData.data);
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Fear & Greed Index data' },
      { status: 500 }
    );
  }
}
