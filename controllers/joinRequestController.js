import JoinRequest from "../models/JoinRequest.js"
import Message from "../models/Message.js"
import Board from "../models/Board.js"
import User from "../models/User.js"
import { sendJoinRequestEmail, sendRequestAcceptedEmail, sendRequestRejectedEmail } from "../services/emailService.js"
import { io } from "../server.js"

// Create join request
export const createJoinRequest = async (req, res) => {
  try {
    const { boardId, message } = req.body
    const requesterId = req.userId

    const board = await Board.findById(boardId).populate("owner")
    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    // Check for existing pending request
    const existingRequest = await JoinRequest.findOne({
      board: boardId,
      requester: requesterId,
      status: "pending",
    })

    if (existingRequest) {
      return res.status(400).json({ message: "Join request already pending" })
    }

    const joinRequest = new JoinRequest({
      board: boardId,
      requester: requesterId,
      message,
    })

    await joinRequest.save()

    // Notify board owner
    const requester = await User.findById(requesterId)
    const messageNotification = new Message({
      recipient: board.owner._id,
      sender: requesterId,
      board: boardId,
      type: "join_request",
      content: `${requester.name} (${requester.email}) requested to join "${board.title}"`,
      metadata: {
        boardName: board.title,
        joinRequestId: joinRequest._id,
      },
    })

    await messageNotification.save()

    // Send email notification to board owner
    const owner = await User.findById(board.owner._id)
    await sendJoinRequestEmail({
      recipientEmail: owner.email,
      requesterName: requester.name,
      boardName: board.title,
      requestLink: `${process.env.CLIENT_URL || 'http://localhost:5173'}/messages`
    })

    res.status(201).json({ message: "Join request sent", joinRequest })
  } catch (error) {
    console.error("Create join request error:", error)
    res.status(500).json({ message: "Failed to create join request", error: error.message })
  }
}

// Get join requests for a board (admin only)
export const getJoinRequests = async (req, res) => {
  try {
    const { boardId } = req.params
    const userId = req.userId

    const board = await Board.findById(boardId)
    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    if (board.owner.toString() !== userId) {
      return res.status(403).json({ message: "Only board admin can view join requests" })
    }

    const requests = await JoinRequest.find({
      board: boardId,
      status: "pending",
    })
      .populate("requester", "name email")
      .sort({ createdAt: -1 })

    res.json(requests)
  } catch (error) {
    console.error("Get join requests error:", error)
    res.status(500).json({ message: "Failed to fetch join requests", error: error.message })
  }
}

// Accept join request
export const acceptJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params
    const userId = req.userId

    const joinRequest = await JoinRequest.findById(requestId)
      .populate("board")
      .populate("requester", "name email")

    if (!joinRequest) {
      return res.status(404).json({ message: "Join request not found" })
    }

    const board = await Board.findById(joinRequest.board._id)
    if (board.owner.toString() !== userId) {
      return res.status(403).json({ message: "Only board admin can accept requests" })
    }

    if (joinRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" })
    }

    // Update request status
    joinRequest.status = "accepted"
    await joinRequest.save()

    // Add requester to board members
    if (!board.members.includes(joinRequest.requester._id)) {
      board.members.push(joinRequest.requester._id)
    }
    
    // Add to participants array with member role
    const existingParticipant = board.participants.find(p => p.user.toString() === joinRequest.requester._id.toString())
    const newParticipant = {
      user: joinRequest.requester._id,
      role: "member",
      joinedAt: new Date()
    }
    if (!existingParticipant) {
      board.participants.push(newParticipant)
    }
    
    await board.save()

    // Emit real-time event for participant addition
    io.to(`board-${board._id}`).emit("participant:added", {
      participant: {
        user: { 
          _id: joinRequest.requester._id, 
          name: joinRequest.requester.name, 
          email: joinRequest.requester.email 
        },
        role: "member",
        joinedAt: newParticipant.joinedAt
      }
    })

    // Notify user's dashboard about new board
    io.to(`user-${joinRequest.requester._id}`).emit("board:joined", {
      board: { _id: board._id, name: board.title, description: board.description }
    })

    // Update original join request message status (DO NOT CREATE NEW MESSAGE)
    await Message.updateOne(
      { 'metadata.joinRequestId': requestId },
      { 
        $set: { 
          status: 'accepted',
          'metadata.respondedAt': new Date(),
          'metadata.respondedBy': userId
        } 
      }
    )

    // Emit socket event for message update to board owner (who accepted)
    io.to(`user-${userId}`).emit("message:updated", {
      messageId: requestId,
      status: 'accepted',
      type: 'join_request'
    })

    // Notify requester that join request was accepted
    io.to(`user-${joinRequest.requester._id}`).emit("message:updated", {
      messageId: requestId,
      status: 'accepted',
      type: 'join_request'
    })

    // Emit request:updated event to board participants
    io.to(`board-${board._id}`).emit("request:updated", {
      requestId,
      type: 'join_request',
      status: 'accepted'
    })

    // Send email notification
    await sendRequestAcceptedEmail({
      recipientEmail: joinRequest.requester.email,
      boardName: board.title,
      acceptedBy: "Board Admin"
    })

    res.status(200).json({ message: "Join request accepted", joinRequest })
  } catch (error) {
    console.error("Accept join request error:", error)
    res.status(500).json({ message: "Failed to accept request", error: error.message })
  }
}

// Reject join request
export const rejectJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params
    const { reason } = req.body
    const userId = req.userId

    const joinRequest = await JoinRequest.findById(requestId)
      .populate("board")
      .populate("requester", "name email")

    if (!joinRequest) {
      return res.status(404).json({ message: "Join request not found" })
    }

    const board = await Board.findById(joinRequest.board._id)
    if (board.owner.toString() !== userId) {
      return res.status(403).json({ message: "Only board admin can reject requests" })
    }

    if (joinRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" })
    }

    // Update request status
    joinRequest.status = "rejected"
    joinRequest.rejectionReason = reason || ""
    await joinRequest.save()

    // Update original join request message status (DO NOT CREATE NEW MESSAGE)
    await Message.updateOne(
      { 'metadata.joinRequestId': requestId },
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
      type: 'join_request'
    })

    // Notify requester that join request was rejected
    io.to(`user-${joinRequest.requester._id}`).emit("message:updated", {
      messageId: requestId,
      status: 'rejected',
      type: 'join_request'
    })

    // Emit request:updated event to board participants
    io.to(`board-${board._id}`).emit("request:updated", {
      requestId,
      type: 'join_request',
      status: 'rejected'
    })

    // Send email notification
    await sendRequestRejectedEmail({
      recipientEmail: joinRequest.requester.email,
      boardName: board.title,
      rejectedBy: "Board Admin",
      reason: reason || "No reason provided"
    })

    res.status(200).json({ message: "Join request rejected", joinRequest })
  } catch (error) {
    console.error("Reject join request error:", error)
    res.status(500).json({ message: "Failed to reject request", error: error.message })
  }
}
