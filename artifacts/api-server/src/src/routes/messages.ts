import { Router, type IRouter, type Request } from "express";
import { eq, or, and, desc, asc, ne, isNull } from "drizzle-orm";
import multer, { type MulterError } from "multer";
import fs from "fs";
import path from "path";
import { db, messagesTable, usersTable } from "@workspace/db";
import { publicUser, requireAuth } from "../lib/auth";

const router: IRouter = Router();

const IMAGE_BODY_PREFIX = "[image:";
const IMAGE_BODY_SUFFIX = "]";

export function encodeImageMessage(imageUrl: string, caption?: string): string {
  const trimmedCaption = caption?.trim();
  return trimmedCaption
    ? `${IMAGE_BODY_PREFIX}${imageUrl}${IMAGE_BODY_SUFFIX}\n${trimmedCaption}`
    : `${IMAGE_BODY_PREFIX}${imageUrl}${IMAGE_BODY_SUFFIX}`;
}

export function parseMessageBody(body: string): { imageUrl?: string; text?: string } {
  if (!body.startsWith(IMAGE_BODY_PREFIX)) {
    return { text: body };
  }
  const closingIndex = body.indexOf(IMAGE_BODY_SUFFIX);
  if (closingIndex === -1) {
    return { text: body };
  }
  const imageUrl = body.slice(IMAGE_BODY_PREFIX.length, closingIndex).trim();
  const rest = body.slice(closingIndex + IMAGE_BODY_SUFFIX.length).replace(/^\n/, "").trim();
  return { imageUrl, text: rest || undefined };
}

const messageUploadsDir = path.resolve(process.cwd(), "../uploads/messages");
if (!fs.existsSync(messageUploadsDir)) {
  fs.mkdirSync(messageUploadsDir, { recursive: true });
}

const messageImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, messageUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `msg-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only PNG, JPEG, GIF, and WebP images are allowed."));
  },
});

router.post(
  "/messages/upload-image",
  requireAuth,
  (req, res, next) => {
    messageImageUpload.single("image")(req, res, (err: unknown) => {
      if (err) {
        const message =
          (err as MulterError)?.code === "LIMIT_FILE_SIZE"
            ? "Image is too large. Maximum size is 5 MB."
            : err instanceof Error
              ? err.message
              : "Could not upload image.";
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  },
  async (req: Request & { file?: Express.Multer.File }, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "Image file is required." });
      return;
    }
    res.status(201).json({ url: `/uploads/messages/${req.file.filename}` });
  },
);

/**
 * Returns ALL users the current user can message, in two virtual buckets the
 * frontend filters on:
 *   - existing conversations (have `lastAt`/`lastBody`)
 *   - potential new contacts   (no `lastAt`)
 *
 * Field names match what the UI consumes: `id`, `lastAt`, `lastBody`,
 * `unreadCount`, etc.
 */
router.get("/messages/contacts", requireAuth, async (req, res): Promise<void> => {
  const me = req.user!.id;

  // 1. Pull every other user (so we can offer "new conversation" targets).
  const others = await db
    .select()
    .from(usersTable)
    .where(ne(usersTable.id, me));

  if (others.length === 0) {
    res.json({ items: [] });
    return;
  }

  // 2. Pull every message that touches the current user, newest first.
  const allMessages = await db
    .select()
    .from(messagesTable)
    .where(or(eq(messagesTable.fromUserId, me), eq(messagesTable.toUserId, me)))
    .orderBy(desc(messagesTable.sentAt));

  // 3. Last message + unread count per partner.
  const lastByPartner = new Map<number, { body: string; sentAt: Date }>();
  const unreadByPartner = new Map<number, number>();
  for (const m of allMessages) {
    const pid = m.fromUserId === me ? m.toUserId : m.fromUserId;
    if (!lastByPartner.has(pid)) {
      lastByPartner.set(pid, { body: m.body, sentAt: m.sentAt });
    }
    // Unread = messages sent TO me by this partner that haven't been opened.
    if (m.toUserId === me && m.readAt === null) {
      unreadByPartner.set(pid, (unreadByPartner.get(pid) ?? 0) + 1);
    }
  }

  const items = others
    .map((p) => {
      const last = lastByPartner.get(p.id);
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        avatarUrl: p.avatarUrl,
        lastBody: last?.body ?? null,
        lastAt: last?.sentAt ?? null,
        unreadCount: unreadByPartner.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => {
      // Existing conversations first, sorted by recency, then everyone else.
      const at = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      if (at && bt) return bt - at;
      if (at) return -1;
      if (bt) return 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

  res.json({ items });
});

/**
 * Returns a conversation in the shape the UI expects:
 *   { items: [...messages...], otherUser: {…} }
 */
router.get("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const otherId = parseInt(String(req.params.userId), 10);
  if (!Number.isFinite(otherId)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const me = req.user!.id;

  // Mark partner's messages to me as read before returning the conversation,
  // so the unread badge clears as soon as you open the thread.
  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.fromUserId, otherId),
        eq(messagesTable.toUserId, me),
        isNull(messagesTable.readAt),
      ),
    );

  const rows = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(eq(messagesTable.fromUserId, me), eq(messagesTable.toUserId, otherId)),
        and(eq(messagesTable.fromUserId, otherId), eq(messagesTable.toUserId, me)),
      ),
    )
    .orderBy(asc(messagesTable.sentAt));

  const items = rows.map((m) => ({
    id: m.id,
    fromUserId: m.fromUserId,
    toUserId: m.toUserId,
    body: m.body,
    createdAt: m.sentAt,
  }));

  const [other] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, otherId))
    .limit(1);

  res.json({ items, otherUser: other ? publicUser(other) : null });
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const toUserId = Number(req.body?.toUserId);
  const body = String(req.body?.body ?? "").trim();
  if (!Number.isFinite(toUserId) || !body) {
    res.status(400).json({ error: "Recipient and message body are required." });
    return;
  }
  if (toUserId === req.user!.id) {
    res.status(400).json({ error: "You can't message yourself." });
    return;
  }
  const [m] = await db
    .insert(messagesTable)
    .values({ fromUserId: req.user!.id, toUserId, body })
    .returning();
  res.status(201).json({
    id: m.id,
    fromUserId: m.fromUserId,
    toUserId: m.toUserId,
    body: m.body,
    createdAt: m.sentAt,
  });
});

router.delete("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const otherId = parseInt(String(req.params.userId), 10);
  if (!Number.isFinite(otherId)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const me = req.user!.id;
  await db
    .delete(messagesTable)
    .where(
      or(
        and(eq(messagesTable.fromUserId, me), eq(messagesTable.toUserId, otherId)),
        and(eq(messagesTable.fromUserId, otherId), eq(messagesTable.toUserId, me)),
      ),
    );
  res.json({ ok: true });
});

export default router;
