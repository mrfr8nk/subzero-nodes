import nodemailer from 'nodemailer';

if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
  throw new Error("GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables must be set");
}

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"SUBZERO-MD Bot Platform" <${process.env.GMAIL_EMAIL}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, verificationToken: string, baseUrl: string): Promise<boolean> {
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - SUBZERO-MD</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">SUBZERO-MD</div>
          <p>WhatsApp Bot Platform</p>
        </div>
        <div class="content">
          <h2>Welcome to SUBZERO-MD!</h2>
          <p>Thank you for signing up for our WhatsApp bot deployment platform. To complete your registration, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 5px;">
            ${verificationUrl}
          </p>
          
          <p><strong>This verification link will expire in 24 hours.</strong></p>
          
          <p>If you didn't create an account with SUBZERO-MD, you can safely ignore this email.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          
          <h3>What's next?</h3>
          <ul>
            <li>Deploy your first WhatsApp bot</li>
            <li>Earn coins through our referral system</li>
            <li>Manage multiple bot deployments</li>
            <li>Track your bot performance</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2025 SUBZERO-MD Bot Platform. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to SUBZERO-MD!

Thank you for signing up for our WhatsApp bot deployment platform.

To complete your registration, please verify your email address by visiting:
${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with SUBZERO-MD, you can safely ignore this email.

What's next?
- Deploy your first WhatsApp bot
- Earn coins through our referral system  
- Manage multiple bot deployments
- Track your bot performance

© 2025 SUBZERO-MD Bot Platform. All rights reserved.
  `;

  return await sendEmail({
    to: email,
    subject: '✅ Verify Your Email - SUBZERO-MD Bot Platform',
    text: textContent,
    html: htmlContent,
  });
}

export async function sendWelcomeEmail(email: string, firstName?: string, baseUrl?: string): Promise<boolean> {
  const name = firstName || 'there';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to SUBZERO-MD</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
        .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #10b981; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎉 Welcome to SUBZERO-MD!</div>
          <p>Your WhatsApp Bot Journey Starts Here</p>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Welcome to SUBZERO-MD! Your email has been verified and your account is now active.</p>
          
          <div style="text-align: center;">
            <a href="${baseUrl ? `${baseUrl}/dashboard` : '#'}" class="button">Go to Dashboard</a>
          </div>
          
          <h3>🚀 Get Started:</h3>
          
          <div class="feature">
            <h4>1. Deploy Your First Bot</h4>
            <p>Create and deploy WhatsApp bots in just a few clicks with our simple interface.</p>
          </div>
          
          <div class="feature">
            <h4>2. Earn Coins</h4>
            <p>Get daily login bonuses and earn more through our referral program.</p>
          </div>
          
          <div class="feature">
            <h4>3. Manage Deployments</h4>
            <p>Monitor your bots, track performance, and manage resources efficiently.</p>
          </div>
          
          <div class="feature">
            <h4>4. Refer Friends</h4>
            <p>Share your referral code and earn bonus coins when friends join!</p>
          </div>
          
          <p>If you have any questions or need help, don't hesitate to reach out to our support team.</p>
          
          <p>Happy bot building!<br>
          The SUBZERO-MD Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: '🎉 Welcome to SUBZERO-MD - Your Account is Ready!',
    html: htmlContent,
  });
}