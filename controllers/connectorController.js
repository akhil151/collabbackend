import Connector from "../models/Connector.js"
import { io } from "../server.js"

export const createConnector = async (req, res) => {
  try {
    const connector = new Connector({
      ...req.body,
      createdBy: req.userId,
    })

    const savedConnector = await connector.save()

    // Emit socket event for real-time updates
    io.to(`board-${savedConnector.board}`).emit("connector:created", savedConnector)

    res.status(201).json(savedConnector)
  } catch (error) {
    res.status(500).json({ message: "Failed to create connector", error: error.message })
  }
}

export const getBoardConnectors = async (req, res) => {
  try {
    const connectors = await Connector.find({ board: req.params.boardId })
    res.json(connectors)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch connectors", error: error.message })
  }
}

export const updateConnector = async (req, res) => {
  try {
    const connector = await Connector.findByIdAndUpdate(req.params.id, req.body, { new: true })

    if (!connector) {
      return res.status(404).json({ message: "Connector not found" })
    }

    // Emit socket event for real-time updates
    io.to(`board-${connector.board}`).emit("connector:updated", connector)

    res.json(connector)
  } catch (error) {
    res.status(500).json({ message: "Failed to update connector", error: error.message })
  }
}

export const deleteConnector = async (req, res) => {
  try {
    const connector = await Connector.findByIdAndDelete(req.params.id)

    if (!connector) {
      return res.status(404).json({ message: "Connector not found" })
    }

    // Emit socket event for real-time updates
    io.to(`board-${connector.board}`).emit("connector:deleted", { connectorId: req.params.id })

    res.json({ message: "Connector deleted" })
  } catch (error) {
    res.status(500).json({ message: "Failed to delete connector", error: error.message })
  }
}
