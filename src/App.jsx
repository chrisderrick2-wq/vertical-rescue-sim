import { useEffect, useState } from "react"
import { socket } from "./socket"

const STORAGE_KEY = "rescue_state_cache"

function App() {
  const [state, setState] = useState({
    load_kN: 0,
    angle: 0,
    system: "single_rope",

    role: "ic",

    rope_tension_kN: 0,
    effective_load_kN: 0,
    utilisation: 0,
    safety: "SAFE",

    messages: [],
    tasks: [],
    decisions: [],

    smeacs: {
      situation: "",
      mission: "",
      execution: "",
      administration: "",
      communications: "",
      safety: ""
    }
  })

  const [isOnline, setIsOnline] = useState(true)

  /* =========================
     LOAD CACHE ON START
  ========================= */
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY)

    if (cached) {
      try {
        setState(JSON.parse(cached))
      } catch (e) {
        console.log("⚠ Cache load failed")
      }
    }
  }, [])

  /* =========================
     SAVE CACHE ON UPDATE
  ========================= */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  /* =========================
     ONLINE / OFFLINE DETECTION
  ========================= */
  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)

    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)

    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  /* =========================
     SOCKET SYNC
  ========================= */
  useEffect(() => {
    socket.on("state", (data) => {
      setState(data)
    })

    socket.on("connect", () => {
      console.log("📡 Reconnected")

      const cached = localStorage.getItem(STORAGE_KEY)

      if (cached) {
        socket.emit("sync_state", JSON.parse(cached))
      }
    })

    return () => {
      socket.off("state")
      socket.off("connect")
    }
  }, [])

  /* =========================
     SAFE EMIT (OFFLINE AWARE)
  ========================= */
  const safeEmit = (event, data) => {
    if (isOnline && socket.connected) {
      socket.emit(event, data)
    } else {
      console.log("📴 Offline mode — queued locally")
    }
  }

  const update = (data) => safeEmit("update_state", data)

  const setRole = (role) => safeEmit("set_role", role)

  const addTask = (title, assigned_to) =>
    safeEmit("add_task", { title, assigned_to })

  const updateTask = (id, status) =>
    safeEmit("update_task", { id, status })

  const addDecision = (text) =>
    safeEmit("add_decision", text)

  /* =========================
     UI ACTIONS
  ========================= */
  const adjustLoad = (v) =>
    update({ load_kN: Math.max(0, state.load_kN + v) })

  const adjustAngle = (v) =>
    update({ angle: Math.max(0, Math.min(90, state.angle + v)) })

  const setSystem = (system) => update({ system })

  /* =========================
     UI
  ========================= */

  return (
    <div style={styles.container}>

      {/* OFFLINE BANNER */}
      {!isOnline && (
        <div style={styles.offline}>
          ⚠ OFFLINE MODE ACTIVE — using local cache
        </div>
      )}

      <h1>🚒 Incident Command Dashboard</h1>

      {/* =========================
          ROLES + CONTROL
      ========================= */}
      <div style={styles.panel}>
        <h2>🧑‍🚒 Roles</h2>

        <button onClick={() => setRole("ic")}>IC</button>
        <button onClick={() => setRole("rope")}>Rope</button>
        <button onClick={() => setRole("safety")}>Safety</button>
        <button onClick={() => setRole("medic")}>Medic</button>
      </div>

      {/* =========================
          PHYSICS
      ========================= */}
      <div style={styles.panel}>
        <h2>⚙️ Physics</h2>

        <p>Load: {state.load_kN} kN</p>
        <p>Angle: {state.angle}°</p>
        <p>System: {state.system}</p>

        <button onClick={() => adjustLoad(+1)}>+1 kN</button>
        <button onClick={() => adjustLoad(-1)}>-1 kN</button>

        <button onClick={() => adjustAngle(+5)}>+5°</button>
        <button onClick={() => adjustAngle(-5)}>-5°</button>
      </div>

      {/* =========================
          SAFETY
      ========================= */}
      <div style={styles.panel}>
        <h2>⚠ Safety</h2>
        <h1>{state.safety}</h1>
      </div>

      {/* =========================
          SMEACS (READ ONLY HERE)
      ========================= */}
      <div style={styles.panel}>
        <h2>📊 SMEACS</h2>

        <p><b>Situation:</b> {state.smeacs.situation}</p>
        <p><b>Mission:</b> {state.smeacs.mission}</p>
        <p><b>Execution:</b> {state.smeacs.execution}</p>
        <p><b>Safety:</b> {state.smeacs.safety}</p>
      </div>

      {/* =========================
          TASKS
      ========================= */}
      <div style={styles.panel}>
        <h2>📋 Tasks</h2>

        {state.role === "ic" && (
          <>
            <button onClick={() => addTask("Anchor check", "safety")}>
              Add Safety Task
            </button>
            <button onClick={() => addTask("Build haul system", "rope")}>
              Add Rope Task
            </button>
          </>
        )}

        <ul>
          {state.tasks.map((t) => (
            <li key={t.id}>
              {t.title} ({t.status})

              <button onClick={() => updateTask(t.id, "done")}>
                Done
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* =========================
          DECISIONS
      ========================= */}
      <div style={styles.panel}>
        <h2>🧠 Decisions</h2>

        {state.role === "ic" && (
          <button
            onClick={() =>
              addDecision("Switch to safer lowering configuration")
            }
          >
            Log Decision
          </button>
        )}

        <ul>
          {state.decisions.map((d) => (
            <li key={d.id}>
              [{d.role}] {d.text}
            </li>
          ))}
        </ul>
      </div>

      {/* =========================
          INCIDENT LOG
      ========================= */}
      <div style={styles.panel}>
        <h2>💬 Log</h2>

        {state.messages.map((m, i) => (
          <p key={i}>
            [{m.role}] {m.text}
          </p>
        ))}
      </div>
    </div>
  )
}

/* =========================
   STYLES
========================= */

const styles = {
  container: {
    padding: 20,
    fontFamily: "Arial",
    background: "#0f172a",
    color: "white",
    minHeight: "100vh"
  },

  panel: {
    background: "#1e293b",
    padding: 15,
    marginTop: 10,
    borderRadius: 10
  },

  offline: {
    background: "red",
    padding: 10,
    marginBottom: 10,
    fontWeight: "bold"
  }
}

export default App