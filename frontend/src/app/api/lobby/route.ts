import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

export async function POST(): Promise<NextResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}/lobby`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to create room' },
        { status: res.status },
      );
    }

    const data = (await res.json()) as { code: string };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Backend unavailable' },
      { status: 502 },
    );
  }
}
