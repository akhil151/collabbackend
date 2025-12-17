import express from "express"
import { getCurrentUser, getUserStats } from "../controllers/userController.js"
import { verifyToken } from "../middleware/auth.js"

const router = express.Router()

router.get("/me", verifyToken, getCurrentUser)
router.get("/stats", verifyToken, getUserStats)

export default router