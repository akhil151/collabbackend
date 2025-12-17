import express from "express"
import { verifyToken } from "../middleware/auth.js"
import { createList, updateList, deleteList, reorderLists } from "../controllers/listController.js"

const router = express.Router()

router.post("/", verifyToken, createList)
router.put("/:id", verifyToken, updateList)
router.delete("/:id", verifyToken, deleteList)
router.post("/reorder", verifyToken, reorderLists)

export default router
