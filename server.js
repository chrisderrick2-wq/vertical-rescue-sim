import { createServer } from "http"
import { Server } from "socket.io"

/* =========================
   CLOUD SAFE CONFIG
========================= */

const PORT = process.env.PORT || 3001

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

/* =========================
   PHYSICS ENGINE
========================= */

function ropeTension(load_kN, angleDeg = 0) {
  const rad = (angleDeg * Math.PI) / 180
  const cosFactor = Math.max(Math.cos(rad), 0.1)
  return load_kN / cosFactor
}

function getMA(system) {
  switch (system) {
    case "2:1": return 2
    case "3:1": return 3
    case "4:1": return 4
    default: return 1
  }
}

function calcSafety(utilisation) {
  if (utilisation >= 1) return "OVERLOAD"
  if (utilisation >= 0.7) return "WARNING"
  return "SAFE"
}

/* =========================
   SCENARIOS
========================= */

const scenarios = {
  cliff_rescue: {
    load_kN: 0.85,
    angle: 35,
    system: "3:1",
    smeacs: {
      situation: "Cliff casualty unstable position",
      mission: "Raise to safe platform",
      execution: "Establish anchors + haul system",
      administration: "Limited access",
      communications: "Radio channel 2",
      safety: "Edge collapse risk"
    },
    objectives: [
      "Build anchor system",
      "Deploy haul system",
      "Control load under 30kN",
      "Recover casualty"
    ]
  },

  tower_evacuation: {
    load_kN: 1.2,
    angle: 60,
    system: "4:1",
    smeacs: {
      situation: "High-angle rescue required",
      mission: "Controlled descent",
      execution: "Install edge protection",
      administration: "High anchor demand",
      communications: "Multi-channel comms",
      safety: "High load amplification risk"
    },
    objectives: [
      "Secure anchors",
      "Install edge protection",
      "Control descent",
      "Avoid shock load"
    ]
  }
}

/* =========================
   INCIDENT STATE
========================= */

let state = {
  load_kN: 0,
  angle: 0,
  system: "single_rope",

  role: "ic",

  messages: [],
  tasks: [],
  decisions: [],

  smeacs: {
    situation: "Standby",
    mission: "Await assignment",
    execution: "",
    administration: "",
    communications: "",
    safety: "Normal conditions"
  },

  rope_tension_kN: 0,
  effective_load_kN: 0,
  utilisation: 0,
  safety: "SAFE"
}

/* =========================
   SOCKET.IO
========================= */

io.on("connection", (socket) => {
  console.log("📡 Client connected")

  socket.emit("state", state)

  /* =========================
     ROLE SYSTEM
  ========================= */
  socket.on("set_role", (role) => {
    state.role = role
    io.emit("state", state)
  })

  /* =========================
     STATE + PHYSICS UPDATE
  ========================= */
  socket.on("update_state", (update) => {
    state = { ...state, ...update }

    const ma = getMA(state.system)

    const tension = ropeTension(state.load_kN, state.angle)
    const effective = state.load_kN / ma

    const utilisation = tension / 30

    state.rope_tension_kN = tension
    state.effective_load_kN = effective
    state.utilisation = utilisation
    state.safety = calcSafety(utilisation)

    io.emit("state", state)
  })

  /* =========================
     TASK SYSTEM
  ========================= */
  socket.on("add_task", (task) => {
    state.tasks = [
      ...state.tasks,
      {
        id: Date.now(),
        status: "pending",
        ...task
      }
    ]

    io.emit("state", state)
  })

  socket.on("update_task", ({ id, status }) => {
    state.tasks = state.tasks.map(t =>
      t.id === id ? { ...t, status } : t
    )

    io.emit("state", state)
  })

  /* =========================
     SMEACS BOARD
  ========================= */
  socket.on("update_smeacs", (update) => {
    state.smeacs = {
      ...state.smeacs,
      ...update
    }

    io.emit("state", state)
  })

  /* =========================
     DECISIONS (AUDIT LOG)
  ========================= */
  socket.on("add_decision", (text) => {
    state.decisions = [
      ...state.decisions,
      {
        id: Date.now(),
        role: state.role,
        text,
        time: new Date().toISOString()
      }
    ]

    io.emit("state", state)
  })

  /* =========================
     SCENARIOS
  ========================= */
  socket.on("load_scenario", (name) => {
    const s = scenarios[name]
    if (!s) return

    state = {
      ...state,
      load_kN: s.load_kN,
      angle: s.angle,
      system: s.system,
      smeacs: s.smeacs,
      objectives: s.objectives,
      current_scenario: name
    }

    io.emit("state", state)
  })

  /* =========================
     MESSAGES
  ========================= */
  socket.on("message", (text) => {
    state.messages = [
      ...state.messages,
      {
        role: state.role,
        text
      }
    ]

    io.emit("state", state)
  })

  /* =========================
     DISCONNECT
  ========================= */
  socket.on("disconnect", () => {
    console.log("📴 Client disconnected")
  })
})

/* =========================
   START SERVER (CLOUD SAFE)
========================= */

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚒 Field Server running on port ${PORT}`)
})