import express from "express"
import { verifyToken } from "../middleware/auth.js"
import {
  createConnector,
  getBoardConnectors,
  updateConnector,
  deleteConnector,
} from "../controllers/connectorController.js"

const router = express.Router()

router.post("/", verifyToken, createConnector)
router.get("/board/:boardId", verifyToken, getBoardConnectors)
router.put("/:id", verifyToken, updateConnector)
router.delete("/:id", verifyToken, deleteConnector)

export default router
