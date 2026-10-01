import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { UserRole, SellerStatus } from '@prisma/client';
import { sendSellerApproval } from '@/lib/email';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole([UserRole.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      await prisma.sellerProfile.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      // Update user role
      const seller = await prisma.sellerProfile.findUnique({ where: { id } });
      if (seller) {
        await prisma.user.update({
          where: { id: seller.userId },
          data: { role: 'SELLER' },
        });

        // Send approval email
        const user = await prisma.user.findUnique({ where: { id: seller.userId } });
        if (user?.email) {
          await sendSellerApproval(user.email, user.name || 'Seller');
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      await prisma.sellerProfile.update({
        where: { id },
        data: { status: 'REJECTED', approvedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Seller approval failed:', error);
    return NextResponse.json({ error: 'Failed to process seller' }, { status: 500 });
  }
}
