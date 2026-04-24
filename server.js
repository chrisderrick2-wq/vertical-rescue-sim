import { createServer } from "http"
import { Server } from "socket.io"

const PORT = process.env.PORT || 10000

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
  role: "ic",

  rope_tension_kN: 0,
  effective_load_kN: 0,
  utilisation: 0,
  safety: "SAFE",

  tasks: [],
  decisions: [],
  messages: [],

  smeacs: {
    situation: "Initial situation",
    mission: "Rescue casualty",
    execution: "",
    administration: "",
    communications: "",
    safety: ""
  }
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  // 🔥 SEND INITIAL STATE
  socket.emit("state", state)

  // 🔁 FULL SYNC (from client cache)
  socket.on("sync_state", (clientState) => {
    state = { ...state, ...clientState }
    io.emit("state", state)
  })

  // ⚙️ UPDATE STATE (physics etc)
  socket.on("update_state", (data) => {
    state = { ...state, ...data }
    io.emit("state", state)
  })

  // 👤 ROLE
  socket.on("set_role", (role) => {
    state.role = role
    io.emit("state", state)
  })

  // 📋 TASKS
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
    const task = state.tasks.find((t) => t.id === id)
    if (task) task.status = status
    io.emit("state", state)
  })

  // 🧠 DECISIONS
  socket.on("add_decision", (text) => {
    state.decisions.push({
      id: Date.now(),
      role: state.role,
      text
    })
    io.emit("state", state)
  })

  // 🗺️ SCENARIOS
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
    console.log("Client disconnected:", socket.id)
  })
})

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})