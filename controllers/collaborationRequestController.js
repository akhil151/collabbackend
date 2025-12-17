import CollaborationRequest from "../models/CollaborationRequest.js"
import Board from "../models/Board.js"
import User from "../models/User.js"
import Message from "../models/Message.js"
import { 
  sendCollaborationRequestEmail, 
  sendRequestAcceptedEmail, 
  sendRequestRejectedEmail 
} from "../services/emailService.js"
import { io } from "../server.js"

// Send collaboration request (ADMIN to another ADMIN's board)
export const sendCollaborationRequest = async (req, res) => {
  try {
    const { boardId, message } = req.body
    const requesterId = req.userId
    const requesterRole = req.userRole

    // Only ADMIN users can send collaboration requests
    if (requesterRole !== "ADMIN") {
      return res.status(403).json({ message: "Only ADMIN users can send collaboration requests" })
    }

    const board = await Board.findById(boardId).populate("owner", "name email role")
    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    // Verify board owner is an ADMIN
    if (board.owner.role !== "ADMIN") {
      return res.status(400).json({ message: "Can only collaborate with ADMIN-owned boards" })
    }

    // Cannot request collaboration on own board
    if (board.owner._id.toString() === requesterId) {
      return res.status(400).json({ message: "Cannot collaborate on your own board" })
    }

    // Check if already a member
    if (board.members.includes(requesterId)) {
      return res.status(400).json({ message: "You are already a member of this board" })
    }

    // Check for existing pending request
    const existingRequest = await CollaborationRequest.findOne({
      board: boardId,
      requester: requesterId,
      status: "pending",
    })

    if (existingRequest) {
      return res.status(400).json({ message: "Collaboration request already pending" })
    }

    const collaborationRequest = new CollaborationRequest({
      board: boardId,
      requester: requesterId,
      boardOwner: board.owner._id,
      message,
    })

    await collaborationRequest.save()

    // Notify board owner
    const requester = await User.findById(requesterId)
    const messageNotification = new Message({
      recipient: board.owner._id,
      sender: requesterId,
      board: boardId,
      type: "collaboration_request",
      content: `${requester.name} (ADMIN) requested to collaborate on your board "${board.title}"`,
      metadata: {
        boardName: board.title,
        collaborationRequestId: collaborationRequest._id,
      },
    })

    await messageNotification.save()

    // Send email notification
    await sendCollaborationRequestEmail({
      recipientEmail: board.owner.email,
      requesterName: requester.name,
      boardName: board.title,
    })

    res.status(201).json({ message: "Collaboration request sent", collaborationRequest })
  } catch (error) {
    console.error("Send collaboration request error:", error)
    res.status(500).json({ message: "Failed to send collaboration request", error: error.message })
  }
}

// Get collaboration requests for logged-in ADMIN's boards
export const getCollaborationRequests = async (req, res) => {
  try {
    const userId = req.userId

    // Find all boards owned by this user
    const boards = await Board.find({ owner: userId })
    const boardIds = boards.map(b => b._id)

    // Find all pending collaboration requests for these boards
    const requests = await CollaborationRequest.find({
      board: { $in: boardIds },
      status: "pending",
    })
      .populate("requester", "name email")
      .populate("board", "title description")
      .sort({ createdAt: -1 })

    res.json(requests)
  } catch (error) {
    console.error("Get collaboration requests error:", error)
    res.status(500).json({ message: "Failed to fetch collaboration requests", error: error.message })
  }
}

// Get collaboration requests sent by logged-in ADMIN
export const getSentCollaborationRequests = async (req, res) => {
  try {
    const userId = req.userId

    const requests = await CollaborationRequest.find({ requester: userId })
      .populate("board", "title description")
      .populate("boardOwner", "name email")
      .sort({ createdAt: -1 })

    res.json(requests)
  } catch (error) {
    console.error("Get sent collaboration requests error:", error)
    res.status(500).json({ message: "Failed to fetch sent requests", error: error.message })
  }
}

// Get collaboration requests for a specific board
export const getCollaborationRequestsByBoard = async (req, res) => {
  try {
    const { boardId } = req.params
    const userId = req.userId

    const board = await Board.findById(boardId)
    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    // Only board owner can view collaboration requests
    if (board.owner.toString() !== userId) {
      return res.status(403).json({ message: "Only board owner can view collaboration requests" })
    }

    const requests = await CollaborationRequest.find({
      board: boardId,
      status: "pending",
    })
      .populate("requester", "name email role")
      .sort({ createdAt: -1 })

    res.json(requests)
  } catch (error) {
    console.error("Get board collaboration requests error:", error)
    res.status(500).json({ message: "Failed to fetch collaboration requests", error: error.message })
  }
}

// Accept collaboration request
export const acceptCollaborationRequest = async (req, res) => {
  try {
    const { requestId } = req.params
    const userId = req.userId

    const collaborationRequest = await CollaborationRequest.findById(requestId)
      .populate("board")
      .populate("requester", "name email")
      .populate("boardOwner", "name email")

    if (!collaborationRequest) {
      return res.status(404).json({ message: "Collaboration request not found" })
    }

    const board = await Board.findById(collaborationRequest.board._id)
    
    if (board.owner.toString() !== userId) {
      return res.status(403).json({ message: "Only board owner can accept collaboration requests" })
    }

    if (collaborationRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" })
    }

    // Update request status
    collaborationRequest.status = "accepted"
    await collaborationRequest.save()

    // Add requester to board as member (not owner)
    if (!board.members.includes(collaborationRequest.requester._id)) {
      board.members.push(collaborationRequest.requester._id)
    }

    // Add to participants with member role (admins collaborate as members on other boards)
    const existingParticipant = board.participants.find(
      p => p.user.toString() === collaborationRequest.requester._id.toString()
    )
    const newParticipant = {
      user: collaborationRequest.requester._id,
      role: "member",
      joinedAt: new Date(),
    }
    if (!existingParticipant) {
      board.participants.push(newParticipant)
    }

    await board.save()

    // Emit real-time event for participant addition
    io.to(`board-${board._id}`).emit("participant:added", {
      participant: {
        user: { 
          _id: collaborationRequest.requester._id, 
          name: collaborationRequest.requester.name, 
          email: collaborationRequest.requester.email 
        },
        role: "member",
        joinedAt: newParticipant.joinedAt
      }
    })

    // Update original collaboration request message status
    await Message.updateOne(
      { 'metadata.collaborationRequestId': requestId },
      { $set: { status: 'accepted' } }
    )

    // Emit socket event for message update
    io.to(`user-${userId}`).emit("message:updated", {
      messageId: requestId,
      status: 'accepted',
      type: 'collaboration_request'
    })

    // Emit request:updated event to board participants
    io.to(`board-${board._id}`).emit("request:updated", {
      requestId,
      type: 'collaboration_request',
      status: 'accepted'
    })

    // Notify user's dashboard about new board
    io.to(`user-${collaborationRequest.requester._id}`).emit("board:joined", {
      board: { _id: board._id, name: board.title, description: board.description }
    })

    // Notify requester that collaboration was accepted via socket event
    io.to(`user-${collaborationRequest.requester._id}`).emit("message:updated", {
      messageId: requestId,
      status: 'accepted',
      type: 'collaboration_request'
    })

    // Send email notification
    await sendRequestAcceptedEmail({
      recipientEmail: collaborationRequest.requester.email,
      boardName: board.title,
      acceptedBy: collaborationRequest.boardOwner.name,
    })

    res.status(200).json({ message: "Collaboration request accepted", collaborationRequest })
  } catch (error) {
    console.error("Accept collaboration request error:", error)
    res.status(500).json({ message: "Failed to accept request", error: error.message })
  }
}

// Reject collaboration request
export const rejectCollaborationRequest = async (req, res) => {
  try {
    const { requestId } = req.params
    const { reason } = req.body
    const userId = req.userId

    const collaborationRequest = await CollaborationRequest.findById(requestId)
      .populate("board")
      .populate("requester", "name email")
      .populate("boardOwner", "name email")

    if (!collaborationRequest) {
      return res.status(404).json({ message: "Collaboration request not found" })
    }

    const board = await Board.findById(collaborationRequest.board._id)
    
    if (board.owner.toString() !== userId) {
      return res.status(403).json({ message: "Only board owner can reject collaboration requests" })
    }

    if (collaborationRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" })
    }

    // Update request status
    collaborationRequest.status = "rejected"
    await collaborationRequest.save()

    // Update original collaboration request message status (DO NOT CREATE NEW MESSAGE)
    await Message.updateOne(
      { 'metadata.collaborationRequestId': requestId },
      { 
        $set: { 
          status: 'rejected',
          'metadata.respondedAt': new Date(),
          'metadata.respondedBy': userId,
          'metadata.reason': reason || ''
        } 
      }
    )

    // Emit socket event for message update to board owner (who rejected)
    io.to(`user-${userId}`).emit("message:updated", {
      messageId: requestId,
      status: 'rejected',
      type: 'collaboration_request'
    })

    // Notify requester that collaboration was rejected
    io.to(`user-${collaborationRequest.requester._id}`).emit("message:updated", {
      messageId: requestId,
      status: 'rejected',
      type: 'collaboration_request'
    })

    // Emit request:updated event to board participants
    io.to(`board-${board._id}`).emit("request:updated", {
      requestId,
      type: 'collaboration_request',
      status: 'rejected'
    })

    // Send email notification
    await sendRequestRejectedEmail({
      recipientEmail: collaborationRequest.requester.email,
      boardName: board.title,
      rejectedBy: collaborationRequest.boardOwner.name,
      reason: reason || "No reason provided",
    })

    res.status(200).json({ message: "Collaboration request rejected", collaborationRequest })
  } catch (error) {
    console.error("Reject collaboration request error:", error)
    res.status(500).json({ message: "Failed to reject request", error: error.message })
  }
}
