import User from "../models/User.js"
import jwt from "jsonwebtoken"

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const user = new User({ 
      name, 
      email, 
      password,
      role: role || "USER" 
    })
    const savedUser = await user.save()

    const token = jwt.sign(
      { id: savedUser._id, role: savedUser.role }, 
      process.env.JWT_SECRET || "your-secret-key", 
      { expiresIn: "7d" }
    )

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        avatar: `${savedUser.avatar}${savedUser.email}`,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const isPasswordCorrect = await user.comparePassword(password)
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || "your-secret-key", 
      { expiresIn: "7d" }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: `${user.avatar}${user.email}`,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message })
  }
}

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: `${user.avatar}${user.email}`,
    })
  } catch (error) {
    res.status(500).json({ message: "Failed to get user", error: error.message })
  }
}
