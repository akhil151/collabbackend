import Board from "../models/Board.js"
import List from "../models/List.js"
import Card from "../models/Card.js"
import User from "../models/User.js"

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password")
    
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("Failed to get current user:", error)
    res.status(500).json({ message: "Failed to get current user", error: error.message })
  }
}

export const getUserStats = async (req, res) => {
  try {
    const userId = req.userId

    // Get boards count where user is owner or member
    const boardsCount = await Board.countDocuments({
      $or: [{ owner: userId }, { members: userId }]
    })

    // Get lists count from boards where user is owner or member
    const userBoards = await Board.find({
      $or: [{ owner: userId }, { members: userId }]
    }).select('_id')

    const boardIds = userBoards.map(board => board._id)
    
    const listsCount = await List.countDocuments({
      board: { $in: boardIds }
    })

    // Get cards count from lists in user's boards
    const cardsCount = await Card.countDocuments({
      board: { $in: boardIds }
    })

    res.json({
      boards: boardsCount,
      lists: listsCount,
      cards: cardsCount
    })
  } catch (error) {
    console.error("Failed to get user stats:", error)
    res.status(500).json({ message: "Failed to get user stats", error: error.message })
  }
}