import sgMail from '@sendgrid/mail';
import { SENDGRID_API_KEY, FRONTEND_URL } from '../config.js';
import EmailTemplate from '../models/emailTemplate.model.js';
import { renderTemplate, getDefaultEmailStructure } from '../utils/emailTemplateEngine.js';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export const sendVerificationEmail = async (email, token, firstName) => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email verification email not sent.');
    return false;
  }

  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com',
      name: 'Catholic Trading Post',
    },
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome to Catholic Trading Post!</h2>
          <p>Hello ${firstName || 'there'},</p>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <div class="footer">
            <p>Best regards,<br>The Catholic Trading Post Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

// Send subscription grant confirmation email
export const sendSubscriptionGrantEmail = async (email, firstName, plan, subscription, memo = '') => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Subscription grant email not sent.');
    return false;
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com',
      name: 'Catholic Trading Post',
    },
    subject: 'Your Subscription Has Been Activated',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .plan-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #667eea; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          .memo-box { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎉 Subscription Activated!</h2>
          </div>
          <div class="content">
            <p>Hello ${firstName || 'there'},</p>
            <p>We're excited to inform you that your subscription has been successfully activated!</p>
            
            <div class="plan-box">
              <h3 style="margin-top: 0;">Subscription Details</h3>
              <p><strong>Plan:</strong> ${plan.name}</p>
              <p><strong>Price:</strong> $${plan.price}</p>
              <p><strong>Duration:</strong> ${plan.durationInDays} days</p>
              <p><strong>Start Date:</strong> ${formatDate(subscription.startDate)}</p>
              <p><strong>End Date:</strong> ${formatDate(subscription.endDate)}</p>
              <p><strong>Unlimited Posts:</strong> ${subscription.unlimitedPosts ? 'Yes' : 'No'}</p>
              ${subscription.unlimitedPosts ? '<p style="color: #28a745; font-weight: bold;">✓ You can now post unlimited items during your subscription period!</p>' : ''}
            </div>

            ${memo ? `
            <div class="memo-box">
              <p><strong>Payment Note:</strong> ${memo}</p>
            </div>
            ` : ''}

            <p>You now have full access to all features included in your plan. If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <div class="footer">
              <p>Best regards,<br>The Catholic Trading Post Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending subscription grant email:', error);
    return false;
  }
};

// Send credit grant confirmation email
export const sendCreditGrantEmail = async (email, firstName, amount, newBalance, memo = '', isSubscriptionCredit = false) => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Credit grant email not sent.');
    return false;
  }

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com',
      name: 'Catholic Trading Post',
    },
    subject: isSubscriptionCredit ? 'Credits Added to Your Subscription' : 'Credits Added to Your Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .credit-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          .memo-box { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .amount { font-size: 2em; font-weight: bold; color: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💰 Credits Added!</h2>
          </div>
          <div class="content">
            <p>Hello ${firstName || 'there'},</p>
            <p>We're pleased to inform you that credits have been added to your ${isSubscriptionCredit ? 'subscription' : 'account'}!</p>
            
            <div class="credit-box">
              <h3 style="margin-top: 0;">Credit Details</h3>
              <p><strong>Credits Added:</strong> <span class="amount">$${amount}</span></p>
              <p><strong>New Balance:</strong> <span style="font-size: 1.5em; font-weight: bold; color: #667eea;">$${newBalance}</span></p>
              <p style="margin-top: 15px; color: #666;">You can now use these credits to post items on the marketplace.</p>
            </div>

            ${memo ? `
            <div class="memo-box">
              <p><strong>Payment Note:</strong> ${memo}</p>
            </div>
            ` : ''}

            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <div class="footer">
              <p>Best regards,<br>The Catholic Trading Post Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending credit grant email:', error);
    return false;
  }
};

// Send receipt email for Stripe payment
// Send new message notification email
export const sendMessageNotificationEmail = async (email, firstName, senderName, listingTitle, messagePreview, threadId, listingId) => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Message notification email not sent.');
    return false;
  }

  const messageUrl = `${FRONTEND_URL}/marketplace/messages/${threadId}?listing=${listingId}`;

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com',
      name: 'Catholic Trading Post',
    },
    subject: `New message about "${listingTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .message-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #667eea; }
          .button { display: inline-block; padding: 12px 24px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Message</h2>
          </div>
          <div class="content">
            <p>Hello ${firstName || 'there'},</p>
            <p><strong>${senderName}</strong> sent you a new message about your listing:</p>
            <div class="message-box">
              <p><strong>Listing:</strong> ${listingTitle}</p>
              <p><strong>Message:</strong> ${messagePreview || '[No preview available]'}</p>
            </div>
            <a href="${messageUrl}" class="button">View Message</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px;">${messageUrl}</p>
            <div class="footer">
              <p>You're receiving this email because you have an active listing on Catholic Trading Post.</p>
              <p>Best regards,<br>The Catholic Trading Post Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending message notification email:', error);
    return false;
  }
};

export const sendReceiptEmail = async (email, firstName, receiptData) => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Receipt email not sent.');
    return false;
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com',
      name: 'Catholic Trading Post',
    },
    subject: `Receipt for ${receiptData.description || 'Payment'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .receipt-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          .amount { font-size: 2em; font-weight: bold; color: #28a745; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          table td { padding: 10px; border-bottom: 1px solid #ddd; }
          table td:first-child { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📧 Payment Receipt</h2>
          </div>
          <div class="content">
            <p>Hello ${firstName || 'there'},</p>
            <p>Thank you for your payment. Here is your receipt:</p>
            
            <div class="receipt-box">
              <h3 style="margin-top: 0;">Receipt Details</h3>
              <table>
                <tr>
                  <td>Description:</td>
                  <td>${receiptData.description || 'Payment'}</td>
                </tr>
                <tr>
                  <td>Amount:</td>
                  <td><span class="amount">$${receiptData.amount}</span></td>
                </tr>
                <tr>
                  <td>Payment ID:</td>
                  <td>${receiptData.paymentId || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Date:</td>
                  <td>${receiptData.date ? formatDate(receiptData.date) : 'N/A'}</td>
                </tr>
                ${receiptData.invoiceUrl ? `
                <tr>
                  <td>Invoice:</td>
                  <td><a href="${receiptData.invoiceUrl}" target="_blank">View Invoice</a></td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${receiptData.subscriptionDetails ? `
            <div class="receipt-box">
              <h3>Subscription Details</h3>
              <p><strong>Plan:</strong> ${receiptData.subscriptionDetails.planName}</p>
              <p><strong>Start Date:</strong> ${formatDate(receiptData.subscriptionDetails.startDate)}</p>
              <p><strong>End Date:</strong> ${formatDate(receiptData.subscriptionDetails.endDate)}</p>
            </div>
            ` : ''}

            <p>If you have any questions about this receipt, please contact our support team.</p>
            
            <div class="footer">
              <p>Best regards,<br>The Catholic Trading Post Team</p>
              <p style="font-size: 10px; color: #999;">This is an automated receipt. Please keep this for your records.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return false;
  }
};

/**
 * Send verification approval email
 * Sent when user's Catholic verification is approved
 */
export const sendVerificationApprovalEmail = async (email, firstName) => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Verification approval email not sent.');
    return false;
  }

  const dashboardUrl = `${FRONTEND_URL}/dashboard`;

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com',
      name: 'Catholic Trading Post',
    },
    subject: 'Your Verification Has Been Approved',
    html: getDefaultEmailStructure({
      title: '✅ Verification Approved!',
      content: `
        <p>Hello ${firstName || 'there'},</p>
        <p>We're pleased to inform you that your Catholic verification has been <strong>approved</strong>!</p>
        
        <div class="success-box">
          <h3 style="margin-top: 0;">You're Now a Verified Member</h3>
          <p>As a verified Catholic member, you now have access to:</p>
          <ul>
            <li>Full marketplace access</li>
            <li>Community events (Cars for Christ)</li>
            <li>All premium features</li>
            <li>Priority support</li>
          </ul>
        </div>

        <p>Welcome to the Catholic Trading Post community! We're excited to have you with us.</p>
      `,
      buttonText: 'Go to Dashboard',
      buttonUrl: dashboardUrl,
    }),
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending verification approval email:', error);
    return false;
  }
};

/**
 * Send verification denial email
 * Sent when user's Catholic verification is denied
 */
export const sendVerificationDenialEmail = async (email, firstName, reason, correctionDeadline) => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Verification denial email not sent.');
    return false;
  }

  const verificationUrl = `${FRONTEND_URL}/verification`;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com',
      name: 'Catholic Trading Post',
    },
    subject: 'Verification Update - Action Required',
    html: getDefaultEmailStructure({
      title: '⚠️ Verification Update',
      content: `
        <p>Hello ${firstName || 'there'},</p>
        <p>We regret to inform you that your Catholic verification has been <strong>denied</strong>.</p>
        
        <div class="warning-box">
          <h3 style="margin-top: 0;">Why Was My Verification Denied?</h3>
          <p>${reason || 'The information provided did not meet our verification requirements. Please review and correct your information.'}</p>
        </div>

        ${correctionDeadline ? `
        <div class="info-box">
          <p><strong>Correction Deadline:</strong> ${formatDate(correctionDeadline)}</p>
          <p>You have until this date to correct your information and resubmit your verification request.</p>
        </div>
        ` : ''}

        <p>Please review your verification information and make any necessary corrections. You can resubmit your verification request at any time.</p>
        
        <p>If you have questions or need assistance, please contact our support team.</p>
      `,
      buttonText: 'Update Verification',
      buttonUrl: verificationUrl,
    }),
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending verification denial email:', error);
    return false;
  }
};

/**
 * Send error alert email to admin
 */
export const sendAlertEmail = async (email, subject, errorDetails) => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Alert email not sent.');
    return false;
  }

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@catholictradingpost.com',
      name: 'Catholic Trading Post - Alert System',
    },
    subject: `🚨 ${subject}`,
    html: getDefaultEmailStructure({
      title: '🚨 Critical Error Alert',
      content: `
        <p><strong>Alert Type:</strong> ${subject}</p>
        <div class="error-box">
          <h3 style="margin-top: 0;">Error Details</h3>
          <p><strong>Message:</strong> ${errorDetails.message || 'N/A'}</p>
          <p><strong>Type:</strong> ${errorDetails.type || 'N/A'}</p>
          <p><strong>Status Code:</strong> ${errorDetails.statusCode || 'N/A'}</p>
          <p><strong>URL:</strong> ${errorDetails.url || 'N/A'}</p>
          <p><strong>Method:</strong> ${errorDetails.method || 'N/A'}</p>
          <p><strong>IP:</strong> ${errorDetails.ip || 'N/A'}</p>
          <p><strong>Timestamp:</strong> ${errorDetails.timestamp || new Date().toISOString()}</p>
          ${errorDetails.stack ? `
          <p><strong>Stack Trace:</strong></p>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${errorDetails.stack}</pre>
          ` : ''}
        </div>
        <p>Please investigate this error immediately.</p>
      `,
    }),
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending alert email:', error);
    return false;
  }
};

