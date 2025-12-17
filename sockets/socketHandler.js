const activeUsers = {}

export const handleSocketConnection = (socket, io) => {
  console.log("User connected:", socket.id)

  // User joins board room
  socket.on("join-board", (boardId, userId) => {
    if (!boardId) {
      console.error("No boardId provided for join-board")
      return
    }
    socket.join(`board-${boardId}`)
    if (!activeUsers[boardId]) {
      activeUsers[boardId] = []
    }
    activeUsers[boardId].push({ userId: userId || "anonymous", socketId: socket.id })
    io.to(`board-${boardId}`).emit("user-joined", { userId: userId || "anonymous", socketId: socket.id })
  })

  // User joins for profile updates
  socket.on("join-user", (userId) => {
    if (!userId) {
      console.error("No userId provided for join-user")
      return
    }
    socket.join(`user-${userId}`)
  })

  // Real-time card creation
  socket.on("card:create", (data) => {
    if (!data || !data.boardId) {
      console.error("Invalid card:create data")
      return
    }
    io.to(`board-${data.boardId}`).emit("card:created", data)
  })

  // Real-time card update
  socket.on("card:update", (data) => {
    if (!data || !data.boardId) {
      console.error("Invalid card:update data")
      return
    }
    io.to(`board-${data.boardId}`).emit("card:updated", data)
  })

  // Real-time card movement
  socket.on("card:move", (data) => {
    if (!data || !data.boardId) {
      console.error("Invalid card:move data")
      return
    }
    io.to(`board-${data.boardId}`).emit("card:moved", data)
  })

  // Real-time list creation
  socket.on("list:create", (data) => {
    if (!data || !data.boardId) {
      console.error("Invalid list:create data")
      return
    }
    io.to(`board-${data.boardId}`).emit("list:created", data)
  })

  // Real-time list update
  socket.on("list:update", (data) => {
    if (!data || !data.boardId) {
      console.error("Invalid list:update data")
      return
    }
    io.to(`board-${data.boardId}`).emit("list:updated", data)
  })

  // Real-time board creation
  socket.on("board:create", (data) => {
    io.to(`user-${data.userId}`).emit("board:created", data)
  })

  // Real-time board deletion
  socket.on("board:delete", (data) => {
    io.to(`user-${data.userId}`).emit("board:deleted", data)
  })

  // Real-time list deletion
  socket.on("list:delete", (data) => {
    io.to(`board-${data.boardId}`).emit("list:deleted", data)
    io.to(`user-${data.userId}`).emit("list:deleted", data)
  })

  // Real-time card deletion
  socket.on("card:delete", (data) => {
    io.to(`board-${data.boardId}`).emit("card:deleted", data)
    io.to(`user-${data.userId}`).emit("card:deleted", data)
  })

  // Card workspace events
  socket.on("join-card", (cardId) => {
    socket.join(`card-${cardId}`)
    console.log(`User joined card workspace: ${cardId}`)
  })

  socket.on("workspace:save", (data) => {
    socket.to(`card-${data.cardId}`).emit("workspace:update", {
      elements: data.elements,
      connectors: data.connectors
    })
  })

  socket.on("element:add", (data) => {
    socket.to(`card-${data.cardId}`).emit("element:added", data.element)
  })

  socket.on("element:update", (data) => {
    socket.to(`card-${data.cardId}`).emit("element:updated", data.element)
  })

  socket.on("element:delete", (data) => {
    socket.to(`card-${data.cardId}`).emit("element:deleted", {
      elementId: data.elementId
    })
  })

  socket.on("connector:add", (data) => {
    socket.to(`card-${data.cardId}`).emit("connector:added", data.connector)
  })

  socket.on("connector:delete", (data) => {
    socket.to(`card-${data.cardId}`).emit("connector:deleted", {
      connectorId: data.connectorId
    })
  })

  // Participant events
  socket.on("participant:added", (data) => {
    io.to(`board-${data.boardId}`).emit("participant:added", {
      participant: data.participant
    })
  })

  socket.on("participant:removed", (data) => {
    io.to(`board-${data.boardId}`).emit("participant:removed", {
      userId: data.userId
    })
  })

  socket.on("invitation:sent", (data) => {
    io.to(`user-${data.recipientId}`).emit("invitation:received", {
      invitation: data.invitation
    })
  })

  socket.on("join-request:submitted", (data) => {
    io.to(`user-${data.ownerId}`).emit("join-request:received", {
      request: data.request
    })
  })

  // User disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
    for (const boardId in activeUsers) {
      activeUsers[boardId] = activeUsers[boardId].filter((user) => user.socketId !== socket.id)
      if (activeUsers[boardId].length === 0) {
        delete activeUsers[boardId]
      }
    }
  })
}
