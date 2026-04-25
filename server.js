import { createServer } from "http"
import { Server } from "socket.io"

// =====================
// PORT (RENDER SAFE)
// =====================
const PORT = process.env.PORT

// =====================
// HTTP SERVER
// =====================
const httpServer = createServer()

// =====================
// SOCKET.IO SERVER
// =====================
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// =====================
// STATE
// =====================
let state = {
  load_kN: 0,
  angle: 0,
  system: "single_rope",
  role: "ic",

  rope_tension_kN: 0,
  effective_load_kN: 0,
  utilisation: 0,
  safety: "SAFE",

  tasks: [],
  decisions: [],
  messages: [],

  smeacs: {
    situation: "",
    mission: "",
    execution: "",
    administration: "",
    communications: "",
    safety: ""
  }
}

// =====================
// SOCKET EVENTS
// =====================
io.on("connection", (socket) => {
  console.log("🔥 CLIENT CONNECTED:", socket.id)

  // send initial state
  socket.emit("state", state)

  // sync from client cache
  socket.on("sync_state", (clientState) => {
    state = { ...state, ...clientState }
    io.emit("state", state)
  })

  // physics / general update
  socket.on("update_state", (data) => {
    state = { ...state, ...data }
    io.emit("state", state)
  })

  // role system
  socket.on("set_role", (role) => {
    state.role = role
    io.emit("state", state)
  })

  // tasks
  socket.on("add_task", ({ title, assigned_to }) => {
    state.tasks.push({
      id: Date.now(),
      title,
      assigned_to,
      status: "pending"
    })
    io.emit("state", state)
  })

  socket.on("update_task", ({ id, status }) => {
    const task = state.tasks.find(t => t.id === id)
    if (task) task.status = status
    io.emit("state", state)
  })

  // decisions
  socket.on("add_decision", (text) => {
    state.decisions.push({
      id: Date.now(),
      role: state.role,
      text
    })
    io.emit("state", state)
  })

  // scenarios
  socket.on("load_scenario", (name) => {
    if (name === "cliff_rescue") {
      state.load_kN = 2
      state.angle = 30
      state.safety = "SAFE"
    }

    if (name === "tower_evacuation") {
      state.load_kN = 4
      state.angle = 60
      state.safety = "WARNING"
    }

    io.emit("state", state)
  })

  socket.on("disconnect", () => {
    console.log("❌ CLIENT DISCONNECTED:", socket.id)
  })
})

// =====================
// START SERVER (RENDER SAFE)
// =====================
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on ${PORT}`)
})