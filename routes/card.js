import express from "express"
import { verifyToken } from "../middleware/auth.js"
import Card from "../models/Card.js"
import {
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  addAssignee,
  removeAssignee,
} from "../controllers/cardController.js"

const router = express.Router()

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id).populate("assignees")
    if (!card) {
      return res.status(404).json({ message: "Card not found" })
    }
    res.json(card)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch card", error: error.message })
  }
})

router.post("/", verifyToken, createCard)
router.put("/:id", verifyToken, updateCard)
router.delete("/:id", verifyToken, deleteCard)
router.post("/:id/move", verifyToken, moveCard)
router.post("/:id/assignee", verifyToken, addAssignee)
router.delete("/:id/assignee", verifyToken, removeAssignee)

export default router
