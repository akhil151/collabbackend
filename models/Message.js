import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
    },
    type: {
      type: String,
      enum: [
        "invitation",
        "join_request",
        "request_accepted",
        "request_rejected",
        "removed_from_board",
        "collaboration_request",
        "collaboration_accepted",
        "collaboration_rejected",
      ],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      reason: String,
      boardName: String,
      action: String,
      invitationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invitation",
      },
      joinRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JoinRequest",
      },
      collaborationRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CollaborationRequest",
      },
    },
    read: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

export default mongoose.model("Message", messageSchema)
