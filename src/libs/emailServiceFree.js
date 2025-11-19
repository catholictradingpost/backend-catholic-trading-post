/**
 * Free Email Service - Supports multiple free email providers
 * Priority: Resend > Generic SMTP (Gmail/Outlook/Yahoo/etc) > SendGrid (if configured)
 * 
 * FULLY FREE OPTIONS:
 * - Gmail: Unlimited, free (requires app password)
 * - Outlook/Hotmail: Unlimited, free (requires app password)
 * - Yahoo: Unlimited, free (requires app password)
 * - Any SMTP server: Free if you have access
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { SENDGRID_API_KEY, FRONTEND_URL } from '../config.js';

// Initialize Resend if API key is available
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Initialize SendGrid if API key is available
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Create SMTP transporter for any email provider
 */
function createSMTPTransporter() {
  // Generic SMTP configuration (works with Gmail, Outlook, Yahoo, etc.)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Gmail-specific (easiest setup)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Outlook/Hotmail
  if (process.env.OUTLOOK_USER && process.env.OUTLOOK_PASSWORD) {
    return nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: process.env.OUTLOOK_USER,
        pass: process.env.OUTLOOK_PASSWORD,
      },
    });
  }

  // Yahoo
  if (process.env.YAHOO_USER && process.env.YAHOO_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'yahoo',
      auth: {
        user: process.env.YAHOO_USER,
        pass: process.env.YAHOO_APP_PASSWORD,
      },
    });
  }

  return null;
}

/**
 * Send verification email using the best available service
 * Tries: Resend -> Nodemailer (Gmail) -> SendGrid
 */
export const sendVerificationEmail = async (email, code, firstName) => {
  const fromEmail = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com';
  const fromName = 'Catholic Trading Post';

  console.log(`📧 Attempting to send verification email to ${email} from ${fromEmail}`);

  // Try Resend first (3,000 emails/month free)
  if (resend && process.env.RESEND_API_KEY) {
    try {
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: 'Verify Your Email Address',
        html: getEmailTemplate(code, firstName),
      });
      
      console.log(`✅ Verification email sent via Resend to ${email}`);
      return true;
    } catch (error) {
      console.warn('⚠️  Resend failed, trying next provider:', error.message);
    }
  }

  // Try Generic SMTP (works with Gmail, Outlook, Yahoo, or any SMTP server)
  const smtpTransporter = createSMTPTransporter();
  if (smtpTransporter) {
    try {
      const fromAddress = process.env.SMTP_USER || 
                         process.env.GMAIL_USER || 
                         process.env.OUTLOOK_USER || 
                         process.env.YAHOO_USER;

      await smtpTransporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: email,
        subject: 'Verify Your Email Address',
        html: getEmailTemplate(code, firstName),
      });

      const provider = process.env.SMTP_HOST ? 'SMTP' :
                      process.env.GMAIL_USER ? 'Gmail' :
                      process.env.OUTLOOK_USER ? 'Outlook' :
                      process.env.YAHOO_USER ? 'Yahoo' : 'Email';
      
      console.log(`✅ Verification email sent via ${provider} to ${email}`);
      return true;
    } catch (error) {
      console.warn(`⚠️  SMTP email failed, trying SendGrid:`, error.message);
    }
  }

  // Try SendGrid as fallback (if configured)
  if (SENDGRID_API_KEY) {
    try {
      const msg = {
        to: email,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: 'Verify Your Email Address',
        html: getEmailTemplate(code, firstName),
      };

      await sgMail.send(msg);
      console.log(`✅ Verification email sent via SendGrid to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ All email services failed');
      if (error.response) {
        console.error('SendGrid Error:', error.response.body);
      }
    }
  }

  // All services failed
  console.error('❌ No email service available or all services failed');
  console.error('   Configure one of:');
  console.error('   - RESEND_API_KEY (3,000 emails/month free)');
  console.error('   - GMAIL_USER + GMAIL_APP_PASSWORD (unlimited, free)');
  console.error('   - SENDGRID_API_KEY (if you have credits)');
  return false;
};

/**
 * Email template for verification code
 */
function getEmailTemplate(code, firstName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .code-box { background-color: #f5f5f5; border: 2px solid #1d4ed8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .verification-code { font-size: 32px; font-weight: bold; color: #1d4ed8; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
        .warning { color: #d97706; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome to Catholic Trading Post!</h2>
        <p>Hello ${firstName || 'there'},</p>
        <p>Thank you for registering. Please verify your email address by entering the verification code below:</p>
        <div class="code-box">
          <p style="margin-top: 0; font-weight: bold;">Your Verification Code:</p>
          <div class="verification-code">${code}</div>
        </div>
        <p class="warning">⚠️ This code will expire in 15 minutes.</p>
        <p>Enter this code in the verification form to complete your registration.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <div class="footer">
          <p>Best regards,<br>The Catholic Trading Post Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

