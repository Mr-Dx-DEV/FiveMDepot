import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDownloadLink } from '@/lib/email';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const download = await prisma.downloadCode.findUnique({
    where: { code },
    include: { order: { include: { buyer: true, product: true } } },
  });

  if (!download || download.isUsed || download.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Invalid or expired download link' },
      { status: 404 }
    );
  }

  // Mark as used
  await prisma.downloadCode.update({
    where: { code },
    data: { isUsed: true },
  });

  // Increment product downloads
  await prisma.product.update({
    where: { id: download.order.productId },
    data: { downloads: { increment: 1 } },
  });

  // Send email with actual download link
  await sendDownloadLink(download.order.buyer.email, download.code, download.order.product.title);

  return NextResponse.json({
    success: true,
    downloadUrl: '/api/download/file?code=' + download.code,
  });
}
