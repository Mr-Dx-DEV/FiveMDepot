import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { UserRole, ProductCategory } from '@prisma/client';
import { slugify } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const user = await requireRole([UserRole.SELLER, UserRole.ADMIN]);

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as ProductCategory;
    const price = parseFloat(formData.get('price') as string);
    const tags = (formData.get('tags') as string).split(',').map((t) => t.trim()).filter(Boolean);
    const version = (formData.get('version') as string) || '1.0.0';
    const compatibility = (formData.get('compatibility') as string)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const slug = slugify(title);

    // Generate unique slug
    const existing = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const product = await prisma.product.create({
      data: {
        userId: user.id,
        slug: finalSlug,
        title,
        description,
        category,
        price,
        tags,
        version,
        compatibility,
        screenshots: [], // Will be updated with actual URLs after upload
        files: '/uploads/drafts/' + finalSlug,
        status: 'PUBLISHED',
      },
    });

    return NextResponse.json({ success: true, product: { id: product.id, slug: product.slug } });
  } catch (error) {
    console.error('Product creation failed:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
