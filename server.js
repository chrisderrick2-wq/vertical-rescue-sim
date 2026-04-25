import { createServer } from "http"
import { Server } from "socket.io"

const PORT = process.env.PORT || 10000

// 1. Create HTTP server FIRST
const httpServer = createServer()

// 2. Create Socket.IO instance SECOND
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// 3. State
let state = {
  load_kN: 0,
  angle: 0,
  system: "single_rope",
  role: "ic",
  safety: "SAFE",
  tasks: [],
  decisions: []
}

// 4. CONNECTION HANDLER (AFTER io exists)
io.on("connection", (socket) => {
  console.log("🔥 CLIENT CONNECTED:", socket.id)

  socket.emit("state", state)

  socket.on("update_state", (data) => {
    state = { ...state, ...data }
    io.emit("state", state)
  })

  socket.on("set_role", (role) => {
    state.role = role
    io.emit("state", state)
  })

  socket.on("add_task", (task) => {
    state.tasks.push({
      id: Date.now(),
      ...task,
      status: "pending"
    })
    io.emit("state", state)
  })

  socket.on("update_task", ({ id, status }) => {
    const t = state.tasks.find(x => x.id === id)
    if (t) t.status = status
    io.emit("state", state)
  })

  socket.on("add_decision", (text) => {
    state.decisions.push({
      id: Date.now(),
      role: state.role,
      text
    })
    io.emit("state", state)
  })

  socket.on("load_scenario", (name) => {
    if (name === "cliff_rescue") {
      state.load_kN = 2
      state.angle = 30
    }

    if (name === "tower_evacuation") {
      state.load_kN = 4
      state.angle = 60
      state.safety = "WARNING"
    }

    io.emit("state", state)
  })

  socket.on("disconnect", () => {
    console.log("❌ DISCONNECTED:", socket.id)
  })
})

// 5. START SERVER LAST
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`)
})