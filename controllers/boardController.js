import Board from "../models/Board.js"
import List from "../models/List.js"
import Card from "../models/Card.js"
import User from "../models/User.js"
import Message from "../models/Message.js"
import { io } from "../server.js"
import { sendRemovalEmail } from "../services/emailService.js"

export const createBoard = async (req, res) => {
  try {
    // Only ADMIN users can create boards
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ message: "Only ADMIN users can create boards" })
    }

    const { title, description, color } = req.body

    const board = new Board({
      title,
      description,
      color,
      owner: req.userId,
      members: [req.userId],
      participants: [
        {
          user: req.userId,
          role: "owner",
          joinedAt: new Date()
        }
      ]
    })

    const savedBoard = await board.save()
    await savedBoard.populate("owner members")

    // Emit socket event for real-time updates to owner and all members
    io.to(`user-${req.userId}`).emit("board:created", { boardId: savedBoard._id, userId: req.userId })
    savedBoard.members.forEach(memberId => {
      io.to(`user-${memberId.toString()}`).emit("board:created", { boardId: savedBoard._id, userId: memberId.toString() })
    })

    res.status(201).json(savedBoard)
  } catch (error) {
    res.status(500).json({ message: "Failed to create board", error: error.message })
  }
}

export const getUserBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.userId }, { members: req.userId }],
    }).populate("owner members lists")

    res.json(boards)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch boards", error: error.message })
  }
}

export const getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("owner members")
      .populate("participants.user", "name email")

    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    // Populate lists from List model to ensure all lists are included
    const lists = await List.find({ board: req.params.id }).populate({
      path: "cards",
      populate: "assignees",
    }).sort({ position: 1 })

    board.lists = lists

    res.json(board)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch board", error: error.message })
  }
}

export const updateBoard = async (req, res) => {
  try {
    const { title, description, color } = req.body
    const board = await Board.findByIdAndUpdate(req.params.id, { title, description, color }, { new: true }).populate(
      "owner members lists",
    )

    res.json(board)
  } catch (error) {
    res.status(500).json({ message: "Failed to update board", error: error.message })
  }
}

export const addMember = async (req, res) => {
  try {
    const { email } = req.body
    const board = await Board.findById(req.params.id)

    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    // Import User to find by email
    const User = (await import("../models/User.js")).default
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (!board.members.includes(user._id)) {
      board.members.push(user._id)
      await board.save()
    }

    await board.populate("owner members")
    res.json(board)
  } catch (error) {
    res.status(500).json({ message: "Failed to add member", error: error.message })
  }
}

export const removeMember = async (req, res) => {
  try {
    const { id: boardId, memberId } = req.params
    const { reason } = req.body
    const userId = req.userId

    const board = await Board.findById(boardId).populate("owner", "name email")
    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    // Only board owner can remove members
    if (board.owner._id.toString() !== userId) {
      return res.status(403).json({ message: "Only board owner can remove members" })
    }

    // Cannot remove owner
    if (board.owner._id.toString() === memberId) {
      return res.status(400).json({ message: "Cannot remove board owner" })
    }

    // Remove from members array
    board.members = board.members.filter(m => m.toString() !== memberId)
    
    // Remove from participants array
    board.participants = board.participants.filter(p => p.user.toString() !== memberId)
    
    await board.save()

    // Get removed user details
    const removedUser = await User.findById(memberId)
    if (removedUser) {
      // Send message notification
      const messageNotification = new Message({
        recipient: memberId,
        sender: userId,
        board: boardId,
        type: "removed_from_board",
        content: `You have been removed from board "${board.title}"${reason ? `: ${reason}` : ""}`,
        metadata: {
          boardName: board.title,
          reason: reason || "No reason provided",
        },
      })

      await messageNotification.save()

      // Send email notification
      await sendRemovalEmail({
        recipientEmail: removedUser.email,
        boardName: board.title,
        removedBy: board.owner.name,
        reason: reason || "No reason provided",
      })
      
      // Emit socket events
      io.to(`user-${memberId}`).emit("board:removed", { boardId, userId: memberId })
      io.to(`user-${memberId}`).emit("message:received", { message: messageNotification })
    }
    
    // Emit to board room
    io.to(`board-${boardId}`).emit("participant:removed", { userId: memberId })

    res.status(200).json({ message: "Member removed successfully" })
  } catch (error) {
    console.error("Remove member error:", error)
    res.status(500).json({ message: "Failed to remove member", error: error.message })
  }
}

export const deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)

    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    if (board.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    // Emit to all members before deleting
    board.members.forEach(memberId => {
      io.to(`user-${memberId.toString()}`).emit("board:deleted", { boardId: req.params.id, userId: memberId.toString() })
    })

    await List.deleteMany({ board: req.params.id })
    await Card.deleteMany({ board: req.params.id })
    await Board.findByIdAndDelete(req.params.id)

    res.json({ message: "Board deleted" })
  } catch (error) {
    res.status(500).json({ message: "Failed to delete board", error: error.message })
  }
}
