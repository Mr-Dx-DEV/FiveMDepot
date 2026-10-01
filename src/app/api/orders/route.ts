import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDownloadCode } from '@/lib/utils';
import { sendPaymentVerification } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const method = formData.get('method') as string;
    const itemsRaw = formData.get('items') as string;
    const total = parseFloat(formData.get('total') as string);
    const proofFile = formData.get('files') as File;

    if (!proofFile) {
      return NextResponse.json({ error: 'Proof file required' }, { status: 400 });
    }

    // Save proof to storage (placeholder — implement FTP upload)
    const proofPath = `/uploads/proofs/${Date.now()}-${proofFile.name}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        productId: (JSON.parse(itemsRaw) as any[])[0]?.id, // First item for now
        amount: total,
        paymentProof: proofPath,
        downloadCode: generateDownloadCode(),
      },
    });

    // Send confirmation email
    await sendPaymentVerification(email, order.id);

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Order creation failed:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
