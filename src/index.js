import app from "./app.js";
import { connectDB } from "./db.js";
import { PORT, SENDGRID_API_KEY, RESEND_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, OUTLOOK_USER, OUTLOOK_PASSWORD, YAHOO_USER, YAHOO_APP_PASSWORD, SMTP_HOST, SMTP_USER } from "./config.js";
import http from "http";
import "./libs/initialSetup.js";
import { initSocket } from "./libs/socket.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    console.log('🚀 Starting server...');
    console.log('📦 Environment:', process.env.NODE_ENV);
    console.log('🔌 Port:', PORT);
    
    await connectDB();
    console.log('✅ Database connected');
    
    // Check email service configuration
    const emailServices = [];
    if (RESEND_API_KEY) {
      emailServices.push('Resend (3,000/month free)');
    }
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      emailServices.push('Gmail (unlimited, FREE)');
    }
    if (OUTLOOK_USER && OUTLOOK_PASSWORD) {
      emailServices.push('Outlook (unlimited, FREE)');
    }
    if (YAHOO_USER && YAHOO_APP_PASSWORD) {
      emailServices.push('Yahoo (unlimited, FREE)');
    }
    if (SMTP_HOST && SMTP_USER && process.env.SMTP_PASSWORD) {
      emailServices.push('Generic SMTP (unlimited, FREE)');
    }
    if (SENDGRID_API_KEY) {
      emailServices.push('SendGrid');
    }
    
    if (emailServices.length > 0) {
      console.log(`✅ Email service(s) configured: ${emailServices.join(', ')}`);
    } else {
      console.warn('⚠️  WARNING: No email service configured. Email verification will not work.');
      console.warn('   Configure one of the following FREE options in your .env file:');
      console.warn('   🆓 GMAIL_USER + GMAIL_APP_PASSWORD (unlimited, completely free)');
      console.warn('   🆓 OUTLOOK_USER + OUTLOOK_PASSWORD (unlimited, completely free)');
      console.warn('   🆓 YAHOO_USER + YAHOO_APP_PASSWORD (unlimited, completely free)');
      console.warn('   🆓 SMTP_HOST + SMTP_USER + SMTP_PASSWORD (any SMTP server)');
      console.warn('   📧 RESEND_API_KEY (3,000/month free)');
      console.warn('   💰 SENDGRID_API_KEY (if you have credits)');
    }
    
    const server = http.createServer(app);
    console.log('✅ HTTP server created');
    
    initSocket(server);
    console.log('✅ Socket.IO initialized');
    
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server started successfully`, { port: PORT, env: process.env.NODE_ENV });
      console.log(`✅ Server started successfully on port ${PORT}`);
      console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`🔌 Socket.IO path: /socket.io/`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      logger.error('Server error', error);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM signal received: closing HTTP server");
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT signal received: closing HTTP server");
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at Promise", reason, { promise });
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", error);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    logger.error("Error starting server", error);
    console.error(error);
    process.exit(1);
  }
}

main();
