import jwt from "jsonwebtoken"
import User from "../models/User.js"

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    req.userId = decoded.id
    req.userRole = decoded.role
    
    // Fetch full user data for controllers that need it
    const user = await User.findById(decoded.id).select("-password")
    req.user = user
    
    next()
  } catch (error) {
    res.status(401).json({ message: "Invalid token" })
  }
}

// Middleware to check if user is admin
export const requireAdmin = (req, res, next) => {
  if (req.userRole !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" })
  }
  next()
}
