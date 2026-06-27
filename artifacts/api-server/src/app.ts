import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger, sanitizeBody } from "./lib/logger";
import { attachUser } from "./lib/auth";

const app: Express = express();
// Respect proxy headers when running behind a load balancer (affects secure cookies)
const trustProxy = (process.env.TRUST_PROXY ?? "").toLowerCase();
if (trustProxy === "1" || trustProxy === "true") {
  app.set("trust proxy", 1);
}
const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  pinoHttp({
    logger,
    // Use existing X-Request-ID header if provided, otherwise generate a UUID.
    genReqId: (req) => {
      const incoming = (req.headers && (req.headers["x-request-id"] as string)) || undefined;
      if (incoming && typeof incoming === "string" && incoming.trim()) return incoming;
      try {
        return crypto.randomUUID();
      } catch {
        // Fallback to timestamp if randomUUID isn't available
        return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      }
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Expose the request id to clients for correlation with logs
app.use((req, res, next) => {
  try {
    if (req.id) res.setHeader("X-Request-ID", String(req.id));
  } catch {
    // ignore
  }
  next();
});
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  }),
);
// Security: set sensible defaults for Production
app.use(helmet());

// Rate limiting: strict in production; relaxed locally so dashboard polling doesn't lock you out
const isProduction = process.env.NODE_ENV === "production";
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS ?? 15 * 60 * 1000);
const RATE_MAX = Number(
  process.env.RATE_MAX ?? (isProduction ? 100 : 10_000),
);
if (RATE_MAX > 0) {
  app.use(
    rateLimit({
      windowMs: isNaN(RATE_WINDOW_MS) ? 15 * 60 * 1000 : RATE_WINDOW_MS,
      max: isNaN(RATE_MAX) ? (isProduction ? 100 : 10_000) : RATE_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
    }),
  );
}

// Warn if running in production without explicit CORS origins
if (process.env.NODE_ENV === "production" && corsOrigins.length === 0) {
  logger.warn("CORS_ORIGIN not set in production — allowing all origins");
}
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

const uploadsRoot = path.resolve(process.cwd(), "../uploads/videos");
const messageUploadsRoot = path.resolve(process.cwd(), "../uploads/messages");
const cvUploadsRoot = path.resolve(process.cwd(), "../uploads/cvs");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
if (!fs.existsSync(messageUploadsRoot)) {
  fs.mkdirSync(messageUploadsRoot, { recursive: true });
}
if (!fs.existsSync(cvUploadsRoot)) {
  fs.mkdirSync(cvUploadsRoot, { recursive: true });
}

// Serve uploaded videos
app.use("/uploads/videos", express.static(uploadsRoot));
app.use("/uploads/messages", express.static(messageUploadsRoot));
app.use("/uploads/cvs", express.static(cvUploadsRoot));

app.use(
  "/api",
  (req, res, next) => {
    if (req.method === "GET") {
      res.set("Cache-Control", "no-store");
    }
    next();
  },
  (req, res, next) => {
    // Skip authentication for POST /api/applications (registration endpoint)
    if (req.path === "/applications" && req.method === "POST") {
      return next();
    }
    return attachUser(req, res, next);
  },
  router,
);

// Global error handler: logs sanitized context and returns a safe error message
app.use((err: any, req: any, res: any, next: any) => {
  try {
    const safeBody = sanitizeBody(req.body);
    const safeHeaders: Record<string, any> = {
      host: req.headers.host,
      referer: req.headers.referer,
      "user-agent": req.headers["user-agent"],
      "content-type": req.headers["content-type"],
    };
    req.log?.error({ err, body: safeBody, headers: safeHeaders }, "unhandled error");
  } catch (logErr) {
    // eslint-disable-next-line no-console
    console.error("error handler failed", logErr, err);
  }
  try {
    res.status(500).json({ error: "Internal server error", requestId: req.id });
  } catch {
    // If response fails, just end the connection
    try {
      res.statusCode = 500;
      res.end();
    } catch {
      /* ignore */
    }
  }
});

export default app;
