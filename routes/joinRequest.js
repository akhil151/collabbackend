import express from "express"
import { verifyToken } from "../middleware/auth.js"
import {
  createJoinRequest,
  getJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} from "../controllers/joinRequestController.js"

const router = express.Router()

router.post("/", verifyToken, createJoinRequest)
router.get("/board/:boardId", verifyToken, getJoinRequests)
router.put("/:requestId/accept", verifyToken, acceptJoinRequest)
router.put("/:requestId/reject", verifyToken, rejectJoinRequest)

export default router
