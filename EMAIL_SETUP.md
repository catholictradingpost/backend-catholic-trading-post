# Free Email Service Setup Guide

This application supports multiple **FULLY FREE** email providers. All options below are completely free with no limits (except rate limits).

## 🆓 Fully Free Options (Unlimited)

### Option 1: Gmail (Recommended - Easiest) ⭐
**Cost:** Completely FREE, Unlimited emails

### Setup:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Add to your `.env` file:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your_16_char_app_password
   EMAIL_FROM=your-email@gmail.com
   ```

### Option 2: Outlook/Hotmail 🆓
**Cost:** Completely FREE, Unlimited emails

### Setup:
1. Use your Outlook/Hotmail account
2. Enable 2-Factor Authentication (recommended)
3. Add to your `.env` file:
   ```env
   OUTLOOK_USER=your-email@outlook.com
   OUTLOOK_PASSWORD=your_password_or_app_password
   EMAIL_FROM=your-email@outlook.com
   ```

### Option 3: Yahoo 🆓
**Cost:** Completely FREE, Unlimited emails

### Setup:
1. Enable 2-Factor Authentication on Yahoo
2. Generate an App Password:
   - Go to Yahoo Account Security
   - Generate app password
3. Add to your `.env` file:
   ```env
   YAHOO_USER=your-email@yahoo.com
   YAHOO_APP_PASSWORD=your_app_password
   EMAIL_FROM=your-email@yahoo.com
   ```

### Option 4: Any SMTP Server 🆓
**Cost:** FREE (if you have access to an SMTP server)

### Setup:
Add to your `.env` file:
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your_password
SMTP_SECURE=false
EMAIL_FROM=your-email@example.com
```

## 📧 Limited Free Options

### Option 5: Resend
**Free Tier:** 3,000 emails/month

### Setup:
1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to your `.env` file:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=onboarding@yourdomain.com
   ```

### Option 6: SendGrid (If you have credits)
**Free Tier:** 100 emails/day (then requires payment)

### Setup:
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get your API key from the dashboard
3. Verify your sender email
4. Add to your `.env` file:
   ```env
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_FROM_EMAIL=your-verified-email@domain.com
   ```

## Priority Order

The system tries email services in this order:
1. **Resend** (if `RESEND_API_KEY` is set)
2. **Generic SMTP** (Gmail/Outlook/Yahoo/Any SMTP - if configured)
3. **SendGrid** (if `SENDGRID_API_KEY` is set)

## Testing

If all email services fail, the verification code will be:
- Logged in the server console
- Returned in the API response (development mode)
- Displayed on the frontend verification page

## Recommended for Production

- **Resend**: Best for production (3,000/month free, easy setup, good deliverability)
- **Gmail**: Good for development/testing (unlimited, but may hit rate limits)
- **SendGrid**: Only if you already have credits or want to pay

