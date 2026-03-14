import { NextRequest, NextResponse } from 'next/server';
import { readPayments, writePayments } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      gameweek: number;
      entryId: number;
      paid: boolean;
      amount?: number;
    };

    const payments = readPayments();
    const next = payments.filter(
      (row) => !(row.gameweek === body.gameweek && row.entryId === body.entryId)
    );

    next.push({
      gameweek: body.gameweek,
      entryId: body.entryId,
      paid: body.paid,
      amount: body.amount ?? 100,
      updatedAt: new Date().toISOString(),
    });

    writePayments(next);
    return NextResponse.json({ ok: true, payments: next });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
