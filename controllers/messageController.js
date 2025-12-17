import Message from "../models/Message.js"

// Get all messages for logged-in user
export const getMessages = async (req, res) => {
  try {
    const userId = req.userId

    const messages = await Message.find({ recipient: userId })
      .populate("sender", "name email")
      .populate("board", "title")
      .sort({ createdAt: -1 })

    res.json(messages)
  } catch (error) {
    console.error("Get messages error:", error)
    res.status(500).json({ message: "Failed to fetch messages", error: error.message })
  }
}

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId

    const count = await Message.countDocuments({
      recipient: userId,
      read: false,
    })

    res.json({ count })
  } catch (error) {
    console.error("Get unread count error:", error)
    res.status(500).json({ message: "Failed to fetch unread count", error: error.message })
  }
}

// Mark message as read
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params
    const userId = req.userId

    const message = await Message.findOne({
      _id: messageId,
      recipient: userId,
    })

    if (!message) {
      return res.status(404).json({ message: "Message not found" })
    }

    message.read = true
    await message.save()

    res.json({ message: "Message marked as read" })
  } catch (error) {
    console.error("Mark as read error:", error)
    res.status(500).json({ message: "Failed to mark message as read", error: error.message })
  }
}

// Mark all messages as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId

    await Message.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    )

    res.json({ message: "All messages marked as read" })
  } catch (error) {
    console.error("Mark all as read error:", error)
    res.status(500).json({ message: "Failed to mark all messages as read", error: error.message })
  }
}
