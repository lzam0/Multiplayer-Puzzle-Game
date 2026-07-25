import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

interface RouteContext {
  params: { code: string };
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { code } = params;

  try {
    const res = await fetch(`${BACKEND_URL}/lobby/${encodeURIComponent(code)}`);

    if (res.status === 404) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch room' },
        { status: res.status },
      );
    }

    const data = (await res.json()) as {
      code: string;
      playerCount: number;
      status: string;
    };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Backend unavailable' },
      { status: 502 },
    );
  }
}
