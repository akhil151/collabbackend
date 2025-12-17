import express from "express"
import cors from "cors"
import { createServer } from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"
import mongoose from "mongoose"

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Configure CORS for Socket.IO
const allowedOrigins = [
  process.env.FRONTEND_URL || process.env.CLIENT_URL,  // Support both variable names
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
].filter(Boolean)

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn(`Socket.IO CORS blocked origin: ${origin}`)
        callback(null, true) // Allow anyway for development
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: false,  // Changed to false to match frontend
  },
  transports: ['websocket', 'polling']  // Ensure both transports work
})

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`HTTP CORS blocked origin: ${origin}`)
      callback(null, true) // Allow anyway for development
    }
  },
  credentials: false,  // Changed to false to match frontend
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}))
app.use(express.json({ limit: '10mb' })) // Increase payload limit for workspace data
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/collaboration-board")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err))

// Routes
import authRoutes from "./routes/auth.js"
import boardRoutes from "./routes/board.js"
import listRoutes from "./routes/list.js"
import cardRoutes from "./routes/card.js"
import userRoutes from "./routes/user.js"
import connectorRoutes from "./routes/connector.js"
import invitationRoutes from "./routes/invitation.js"
import joinRequestRoutes from "./routes/joinRequest.js"
import messageRoutes from "./routes/message.js"
import collaborationRequestRoutes from "./routes/collaborationRequest.js"

app.use("/api/auth", authRoutes)
app.use("/api/boards", boardRoutes)
app.use("/api/lists", listRoutes)
app.use("/api/cards", cardRoutes)
app.use("/api/users", userRoutes)
app.use("/api/connectors", connectorRoutes)
app.use("/api/invitations", invitationRoutes)
app.use("/api/join-requests", joinRequestRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/collaboration-requests", collaborationRequestRoutes)

app.get("/", (req, res) => {
  res.send("Collaboration Board Server Running")
})

// Health check endpoint with DB status
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: statusMap[dbStatus] || 'unknown',
      connected: dbStatus === 1
    },
    server: 'running'
  })
})

// Socket.io Events
import { handleSocketConnection } from "./sockets/socketHandler.js"
io.on("connection", (socket) => {
  handleSocketConnection(socket, io)
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export { io }
