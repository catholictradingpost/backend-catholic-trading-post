import app from "./app.js";
import { connectDB } from "./db.js";
import { PORT } from "./config.js";
import http from "http";
import "./libs/initialSetup.js";
import { initSocket } from "./libs/socket.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    await connectDB();
    const server = http.createServer(app);
    initSocket(server);
    
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server started successfully`, { port: PORT, env: process.env.NODE_ENV });
      console.log(`Server started on ${PORT}`);
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
