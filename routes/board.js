import express from "express"
import { verifyToken } from "../middleware/auth.js"
import {
  createBoard,
  getUserBoards,
  getBoardById,
  updateBoard,
  addMember,
  removeMember,
  deleteBoard,
} from "../controllers/boardController.js"

const router = express.Router()

router.post("/", verifyToken, createBoard)
router.get("/", verifyToken, getUserBoards)
router.get("/:id", verifyToken, getBoardById)
router.put("/:id", verifyToken, updateBoard)
router.post("/:id/members", verifyToken, addMember)
router.delete("/:id/members/:memberId", verifyToken, removeMember)
router.delete("/:id", verifyToken, deleteBoard)

export default router
