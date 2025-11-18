import app from "./app.js";
import { connectDB } from "./db.js";
import { PORT } from "./config.js";
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
