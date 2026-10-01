import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { UserRole, OrderStatus } from '@prisma/client';
import { generateDownloadCode } from '@/lib/utils';
import { sendDownloadLink } from '@/lib/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole([UserRole.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const { action, adminNote } = body;

    if (action === 'verify') {
      const order = await prisma.order.update({
        where: { id },
        data: {
          status: 'VERIFIED',
          verifiedBy: admin.id,
          verifiedAt: new Date(),
          adminNote,
          downloadCode: generateDownloadCode(),
        },
        include: { buyer: true, product: true },
      });

      // Send download link email
      await sendDownloadLink(order.buyer.email, order.downloadCode!, order.product.title);

      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      await prisma.order.update({
        where: { id },
        data: {
          status: 'REJECTED',
          verifiedBy: admin.id,
          verifiedAt: new Date(),
          adminNote,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Order verification failed:', error);
    return NextResponse.json({ error: 'Failed to verify order' }, { status: 500 });
  }
}
