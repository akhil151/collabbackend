import Card from "../models/Card.js"
import List from "../models/List.js"
import { io } from "../server.js"

export const createCard = async (req, res) => {
  try {
    const { title, description, list, board } = req.body

    const card = new Card({
      title,
      description,
      list,
      board,
    })

    const savedCard = await card.save()
    await savedCard.populate("assignees")

    await List.findByIdAndUpdate(list, { $push: { cards: savedCard._id } })

    // Emit socket event for real-time updates
    io.to(`board-${board}`).emit("card:created", { cardId: savedCard._id, boardId: board })

    res.status(201).json(savedCard)
  } catch (error) {
    res.status(500).json({ message: "Failed to create card", error: error.message })
  }
}

export const updateCard = async (req, res) => {
  try {
    const { title, description, dueDate, labels, elements, connectors } = req.body
    
    // Validate and clean workspace data
    let cleanedElements = elements
    let cleanedConnectors = connectors
    
    if (elements) {
      cleanedElements = elements.map(el => {
        const cleaned = { ...el }
        // Remove base64 images from storage - they should use localStorage references
        if (cleaned.type === 'image' && cleaned.url && cleaned.url.startsWith('data:')) {
          // Keep only the storageKey reference
          cleaned.url = cleaned.storageKey || cleaned.url.substring(0, 100) + '...[truncated]'
        }
        return cleaned
      })
    }
    
    const updateData = { title, description, dueDate, labels }
    if (cleanedElements !== undefined) updateData.elements = cleanedElements
    if (cleanedConnectors !== undefined) updateData.connectors = cleanedConnectors
    
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    ).populate("assignees")
    
    if (!card) {
      return res.status(404).json({ message: "Card not found" })
    }

    res.json(card)
  } catch (error) {
    res.status(500).json({ message: "Failed to update card", error: error.message })
  }
}

export const deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)

    if (!card) {
      return res.status(404).json({ message: "Card not found" })
    }

    await List.findByIdAndUpdate(card.list, { $pull: { cards: req.params.id } })
    await Card.findByIdAndDelete(req.params.id)

    // Emit socket event for real-time updates
    io.to(`board-${card.board}`).emit("card:deleted", { cardId: req.params.id, boardId: card.board })

    res.json({ message: "Card deleted" })
  } catch (error) {
    res.status(500).json({ message: "Failed to delete card", error: error.message })
  }
}

export const moveCard = async (req, res) => {
  try {
    const { fromList, toList, position } = req.body

    const card = await Card.findByIdAndUpdate(req.params.id, { list: toList }, { new: true }).populate("assignees")

    if (fromList === toList) {
      // Reorder within the same list
      const list = await List.findById(fromList)
      const cardIndex = list.cards.indexOf(req.params.id)
      if (cardIndex > -1) {
        list.cards.splice(cardIndex, 1)
        list.cards.splice(position, 0, req.params.id)
        await list.save()
      }
    } else {
      // Move to different list
      await List.findByIdAndUpdate(fromList, { $pull: { cards: req.params.id } })
      const toListDoc = await List.findById(toList)
      toListDoc.cards.splice(position, 0, req.params.id)
      await toListDoc.save()
    }

    res.json(card)
  } catch (error) {
    res.status(500).json({ message: "Failed to move card", error: error.message })
  }
}

export const addAssignee = async (req, res) => {
  try {
    const { userId } = req.body
    const card = await Card.findByIdAndUpdate(req.params.id, { $push: { assignees: userId } }, { new: true }).populate(
      "assignees",
    )

    res.json(card)
  } catch (error) {
    res.status(500).json({ message: "Failed to add assignee", error: error.message })
  }
}

export const removeAssignee = async (req, res) => {
  try {
    const { userId } = req.body
    const card = await Card.findByIdAndUpdate(req.params.id, { $pull: { assignees: userId } }, { new: true }).populate(
      "assignees",
    )

    res.json(card)
  } catch (error) {
    res.status(500).json({ message: "Failed to remove assignee", error: error.message })
  }
}
