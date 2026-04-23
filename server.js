import { createServer } from "http"
import { Server } from "socket.io"

const PORT = process.env.PORT || 3001

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

let state = {
  load_kN: 0,
  angle: 0,
  system: "single_rope",
  messages: []
}

io.on("connection", (socket) => {
  console.log("Client connected")

  socket.emit("state", state)

  socket.on("update_state", (data) => {
    state = { ...state, ...data }
    io.emit("state", state)
  })

  socket.on("message", (msg) => {
    state.messages.push(msg)
    io.emit("state", state)
  })
})

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})