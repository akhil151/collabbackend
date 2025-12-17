import Invitation from "../models/Invitation.js"
import Message from "../models/Message.js"
import User from "../models/User.js"
import Board from "../models/Board.js"
import { sendInvitationEmail, sendRequestAcceptedEmail, sendRequestRejectedEmail } from "../services/emailService.js"
import { io } from "../server.js"

// Get all invitations for logged-in user
export const getInvitations = async (req, res) => {
  try {
    const userEmail = req.user?.email
    if (!userEmail) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const invitations = await Invitation.find({
      recipientEmail: userEmail,
      status: "pending",
    })
      .populate("sender", "name email")
      .populate("board", "name description")
      .sort({ createdAt: -1 })

    res.json(invitations)
  } catch (error) {
    console.error("Get invitations error:", error)
    res.status(500).json({ message: "Failed to fetch invitations", error: error.message })
  }
}

// Send invitation
export const sendInvitation = async (req, res) => {
  try {
    const { boardId, recipientEmail, message } = req.body
    const senderId = req.userId

    // Validate board exists and sender is admin
    const board = await Board.findById(boardId).populate("owner")
    if (!board) {
      return res.status(404).json({ message: "Board not found" })
    }

    if (board.owner._id.toString() !== senderId) {
      return res.status(403).json({ message: "Only board admin can send invitations" })
    }

    // Check if user exists
    const recipient = await User.findOne({ email: recipientEmail })
    if (!recipient) {
      return res.status(404).json({ message: "Email ID not available" })
    }

    // Check if user has USER role (ADMIN users must use collaboration flow)
    if (recipient.role === "ADMIN") {
      return res.status(400).json({ message: "This email belongs to an admin. Use collaboration instead." })
    }

    if (recipient.role !== "USER") {
      return res.status(400).json({ message: "Can only invite users with USER role" })
    }

    // Check if user is already a member of the board
    if (board.members.includes(recipient._id)) {
      return res.status(400).json({ message: "User is already a member of this board" })
    }

    // Check for existing invitation
    const existingInvitation = await Invitation.findOne({
      board: boardId,
      recipientEmail,
      status: "pending",
    })

    if (existingInvitation) {
      return res.status(400).json({ message: "An invitation has already been sent to this user" })
    }

    // Create invitation
    const invitation = new Invitation({
      board: boardId,
      sender: senderId,
      recipientEmail,
      recipient: recipient._id,
      message,
    })

    await invitation.save()

    // Create message notification
    const messageNotification = new Message({
      recipient: recipient._id,
      sender: senderId,
      board: boardId,
      type: "invitation",
      content: `You have been invited to join "${board.title}"`,
      metadata: {
        boardName: board.title,
        invitationId: invitation._id,
      },
    })

    await messageNotification.save()

    // Send email notification
    const sender = await User.findById(senderId)
    await sendInvitationEmail({
      recipientEmail,
      senderName: sender.name,
      boardName: board.title,
      invitationLink: `${process.env.CLIENT_URL || 'http://localhost:5173'}/messages`
    })

    res.status(201).json({ message: "Invitation sent successfully", invitation })
  } catch (error) {
    console.error("Send invitation error:", error)
    res.status(500).json({ message: "Failed to send invitation", error: error.message })
  }
}

// Accept invitation
export const acceptInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params
    const userId = req.userId

    const invitation = await Invitation.findById(invitationId)
      .populate("board")
      .populate("sender", "name email")

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" })
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "Invitation already processed" })
    }

    // Update invitation status
    invitation.status = "accepted"
    await invitation.save()

    // Add user to board members and participants
    const board = await Board.findById(invitation.board._id)
    if (!board.members.includes(userId)) {
      board.members.push(userId)
    }
    
    // Add to participants array with member role
    const existingParticipant = board.participants.find(p => p.user.toString() === userId)
    const newParticipant = {
      user: userId,
      role: "member",
      joinedAt: new Date()
    }
    if (!existingParticipant) {
      board.participants.push(newParticipant)
    }
    
    await board.save()

    // Emit real-time event for participant addition
    const addedUser = await User.findById(userId)
    io.to(`board-${board._id}`).emit("participant:added", {
      participant: {
        user: { _id: addedUser._id, name: addedUser.name, email: addedUser.email },
        role: "member",
        joinedAt: newParticipant.joinedAt
      }
    })

    // Notify user's dashboard about new board
    io.to(`user-${userId}`).emit("board:joined", {
      board: { _id: board._id, name: board.title, description: board.description }
    })

    // Update original invitation message status (DO NOT CREATE NEW MESSAGE)
    const updatedMessage = await Message.findOneAndUpdate(
      { 'metadata.invitationId': invitationId },
      { 
        $set: { 
          status: 'accepted',
          'metadata.respondedAt': new Date(),
          'metadata.respondedBy': userId
        } 
      },
      { new: true }
    ).populate('sender', 'name email')

    // Emit socket event for message update to recipient (who accepted)
    io.to(`user-${userId}`).emit("message:updated", {
      messageId: invitationId,
      status: 'accepted',
      type: 'invitation'
    })

    // Notify sender that invitation was accepted
    if (updatedMessage) {
      io.to(`user-${invitation.sender._id}`).emit("message:updated", {
        messageId: invitationId,
        status: 'accepted',
        type: 'invitation'
      })
    }

    // Send email notification
    const acceptedBy = await User.findById(userId)
    const sender = await User.findById(invitation.sender._id)
    await sendRequestAcceptedEmail({
      recipientEmail: sender.email,
      boardName: board.title,
      acceptedBy: acceptedBy.name
    })

    res.json({ message: "Invitation accepted", board })
  } catch (error) {
    console.error("Accept invitation error:", error)
    res.status(500).json({ message: "Failed to accept invitation", error: error.message })
  }
}

// Reject invitation
export const rejectInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params
    const userId = req.userId

    const invitation = await Invitation.findById(invitationId)
      .populate("board")
      .populate("sender", "name email")

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" })
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "Invitation already processed" })
    }

    // Update invitation status
    invitation.status = "rejected"
    await invitation.save()

    // Update original invitation message status (DO NOT CREATE NEW MESSAGE)
    const updatedMessage = await Message.findOneAndUpdate(
      { 'metadata.invitationId': invitationId },
      { 
        $set: { 
          status: 'rejected',
          'metadata.respondedAt': new Date(),
          'metadata.respondedBy': userId
        } 
      },
      { new: true }
    )

    // Emit socket event for message update to recipient (who rejected)
    io.to(`user-${userId}`).emit("message:updated", {
      messageId: invitationId,
      status: 'rejected',
      type: 'invitation'
    })

    // Notify sender that invitation was rejected
    if (updatedMessage) {
      io.to(`user-${invitation.sender._id}`).emit("message:updated", {
        messageId: invitationId,
        status: 'rejected',
        type: 'invitation'
      })
    }

    // Send email notification
    const rejectedBy = await User.findById(userId)
    const sender = await User.findById(invitation.sender._id)
    await sendRequestRejectedEmail({
      recipientEmail: sender.email,
      boardName: invitation.board.name,
      rejectedBy: rejectedBy.name,
      reason: ""
    })

    res.status(200).json({ message: "Invitation rejected" })
  } catch (error) {
    console.error("Reject invitation error:", error)
    res.status(500).json({ message: "Failed to reject invitation", error: error.message })
  }
}
