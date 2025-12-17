import express from "express"
import { verifyToken } from "../middleware/auth.js"
import {
  sendCollaborationRequest,
  getCollaborationRequests,
  getSentCollaborationRequests,
  getCollaborationRequestsByBoard,
  acceptCollaborationRequest,
  rejectCollaborationRequest,
} from "../controllers/collaborationRequestController.js"

const router = express.Router()

router.post("/", verifyToken, sendCollaborationRequest)
router.get("/", verifyToken, getCollaborationRequests)
router.get("/sent", verifyToken, getSentCollaborationRequests)
router.get("/board/:boardId", verifyToken, getCollaborationRequestsByBoard)
router.put("/:requestId/accept", verifyToken, acceptCollaborationRequest)
router.put("/:requestId/reject", verifyToken, rejectCollaborationRequest)

export default router
