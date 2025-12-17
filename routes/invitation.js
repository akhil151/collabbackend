import express from "express"
import { verifyToken } from "../middleware/auth.js"
import {
  getInvitations,
  sendInvitation,
  acceptInvitation,
  rejectInvitation,
} from "../controllers/invitationController.js"

const router = express.Router()

router.get("/", verifyToken, getInvitations)
router.post("/", verifyToken, sendInvitation)
router.put("/:invitationId/accept", verifyToken, acceptInvitation)
router.put("/:invitationId/reject", verifyToken, rejectInvitation)

export default router
