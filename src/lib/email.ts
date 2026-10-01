import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDownloadLink(email: string, code: string, productTitle: string) {
  try {
    await resend.emails.send({
      from: process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@fivemdepot.com',
      to: [email],
      subject: `Your download link for ${productTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #d4af37;">Your Download Link</h1>
          <p>Thank you for your purchase! Here is your download link for <strong>${productTitle}</strong>:</p>
          <div style="margin: 24px 0;">
            <a href="https://fivemdepot.com/download/${code}"
               style="display: inline-block; padding: 12px 32px; background: #d4af37; color: #0a0a0a; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Download Now
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
          <p style="color: #666; font-size: 14px;">Or use your download code directly:</p>
          <code style="background: #f5f5f5; padding: 8px 16px; border-radius: 4px; font-size: 16px;">${code}</code>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">If you didn't purchase this, please ignore this email.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send download email:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function sendPaymentVerification(email: string, orderId: string) {
  try {
    await resend.emails.send({
      from: process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@fivemdepot.com',
      to: [email],
      subject: `Payment proof received for order #${orderId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #d4af37;">Payment Proof Received</h1>
          <p>Thank you! We have received your payment proof for order <strong>#${orderId}</strong>.</p>
          <p>An admin will review your payment within 24 hours. You'll receive your download link once verified.</p>
          <p style="color: #666; font-size: 14px;">Thank you for your patience!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">FiveMDepot Team</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function sendSellerApproval(email: string, sellerName: string) {
  try {
    await resend.emails.send({
      from: process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@fivemdepot.com',
      to: [email],
      subject: 'Welcome to FiveMDepot! Your seller account is approved',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #d4af37;">Welcome, ${sellerName}!</h1>
          <p>Your seller application has been approved. You can now start listing your FiveM assets!</p>
          <div style="margin: 24px 0;">
            <a href="https://fivemdepot.com/dashboard/seller"
               style="display: inline-block; padding: 12px 32px; background: #d4af37; color: #0a0a0a; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Go to Seller Dashboard
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Start uploading your scripts, MLOs, and vehicles today.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send seller approval email:', error);
    return { success: false, error: (error as Error).message };
  }
}
