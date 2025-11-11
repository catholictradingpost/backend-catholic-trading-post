import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import rolRoutes from "./routes/rol.routes.js";
import postRoutes from "./routes/post.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import messageRoutes from "./routes/message.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import reactionRoutes from "./routes/reaction.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import verificationRoutes from "./routes/verification.routes.js";
import libraryRoutes from "./routes/library.routes.js";
import planRoutes from "./routes/plan.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import permissionRoutes from "./routes/permission.routes.js";
import logRoutes from "./routes/log.routes.js";
import reportRoutes from "./routes/report.routes.js";
import marketplaceRoutes from "./routes/marketplace.routes.js";
import questionnaireRoutes from "./routes/questionnaire.routes.js";
import friendshipRoutes from "./routes/friendship.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import configRoutes from "./routes/config.routes.js";
import creditRoutes from "./routes/credit.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import marketplaceMessageRoutes from "./routes/marketplaceMessage.routes.js";
import eventRoutes from "./routes/event.routes.js";
import moderationListRoutes from "./routes/moderationList.routes.js";
import marketingListRoutes from "./routes/marketingList.routes.js";
import adminRoutes from "./routes/admin.routes.js";

import { FRONTEND_URL } from "./config.js";
import path from "path";
import { fileURLToPath } from "url";
import { sanitizeRequestBody } from "./middlewares/inputValidation.middleware.js";
import { securityHeaders, corsConfig } from "./middlewares/security.middleware.js";
import { errorHandler, notFoundHandler } from "./utils/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration (using security middleware config)
app.use(cors(corsConfig));

app.use(cookieParser());

// Security with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow external resources if needed
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin requests
}));

// Security headers (already imported above)
app.use(securityHeaders);

// Stripe webhook route must be BEFORE JSON parsing middleware
// It needs raw body for signature verification
app.use("/api/payment/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const { handleStripeWebhook } = await import('../controllers/stripeWebhook.controller.js');
  return handleStripeWebhook(req, res);
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("dev"));

// Sanitize request body (remove null bytes, trim strings)
app.use(sanitizeRequestBody);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/rol", rolRoutes);
app.use("/api/post", postRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/reaction", reactionRoutes);
app.use("/api/comment", commentRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/plan", planRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/permission", permissionRoutes);
app.use("/api/log", logRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/questionnaire", questionnaireRoutes);
app.use("/api/friendship", friendshipRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/config", configRoutes);
app.use("/api/credit", creditRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/marketplace-message", marketplaceMessageRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/moderation-list", moderationListRoutes);
app.use("/api/marketing-list", marketingListRoutes);
app.use("/api/admin", adminRoutes);

export default app;
