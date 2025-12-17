import express from "express"
import { verifyToken } from "../middleware/auth.js"
import {
  getMessages,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/messageController.js"

const router = express.Router()

router.get("/", verifyToken, getMessages)
router.get("/unread-count", verifyToken, getUnreadCount)
router.put("/:messageId/read", verifyToken, markAsRead)
router.put("/read-all", verifyToken, markAllAsRead)

export default router
