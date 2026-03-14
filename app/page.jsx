'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// ============================================================================
// FIREBASE CONFIG - REPLACE THESE WITH YOUR FIREBASE CREDENTIALS
// ============================================================================
const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

let db = null;
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;
  if (!FIREBASE_CONFIG.databaseURL) return;
  
  try {
    const app = initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
    firebaseInitialized = true;
  } catch (err) {
    console.error("Firebase init error:", err);
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================
const ACCESS_CODE = "GROSSPI2026"; // Change this to your access code

const INIT_DATA = {
  "course": {
    "name": "Las Lomas de La Dehesa",
    "pars": [4, 4, 3, 4, 4, 3, 4, 5, 5, 4, 5, 4, 5, 4, 3, 4, 3, 4],
    "handicapIndex": [15, 3, 17, 5, 11, 13, 7, 1, 9, 10, 6, 14, 4, 16, 8, 2, 18, 12]
  },
  "players": [
    {"id": "p01", "name": "Agustín Larraín", "handicap": 19},
    {"id": "p02", "name": "Carlos Gana", "handicap": 19},
    {"id": "p03", "name": "Carlos Pucci", "handicap": 27},
    {"id": "p04", "name": "Gonzalo Errázuriz", "handicap": 21},
    {"id": "p05", "name": "Jaime Gutiérrez", "handicap": 21},
    {"id": "p06", "name": "Jaime Silva", "handicap": 15},
    {"id": "p07", "name": "Jorge Labra", "handicap": 18},
    {"id": "p08", "name": "Jorge Mandiola", "handicap": 15},
    {"id": "p09", "name": "Jorge Méndez", "handicap": 23},
    {"id": "p10", "name": "José Ignacio Amenábar", "handicap": 20},
    {"id": "p11", "name": "José Manuel Donoso", "handicap": 17},
    {"id": "p12", "name": "Juan A. Ruiz-Tagle", "handicap": 14},
    {"id": "p13", "name": "Mario Hanckes", "handicap": 17},
    {"id": "p14", "name": "Ricardo Delaño", "handicap": 20},
    {"id": "p15", "name": "Ricardo Marín", "handicap": 18},
    {"id": "p16", "name": "Rodrigo Alarcón", "handicap": 22},
    {"id": "p17", "name": "Rodrigo López", "handicap": 28},
    {"id": "p18", "name": "Rony Obach", "handicap": 20},
    {"id": "p19", "name": "Sergio Beckdorf", "handicap": 17},
    {"id": "p20", "name": "Sergio Mangelsdorff", "handicap": 31},
    {"id": "p21", "name": "Sergio Urzúa", "handicap": 12}
  ]
};

const HCP_2026_DEFAULT = {};
INIT_DATA.players.forEach(p => {
  HCP_2026_DEFAULT[p.id] = { gp2025: p.handicap, fed: p.handicap, inicial: p.handicap };
});

const COURSE = INIT_DATA.course;
const LOGO_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='50' r='8' fill='%234a6741'/%3E%3Cpath d='M 60 58 L 55 120 M 60 58 L 65 120' stroke='%234a6741' stroke-width='2' fill='none'/%3E%3C/svg%3E";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function scoreColor(strokes, par) {
  if (!strokes) return "#94a3b8";
  const d = strokes - par;
  if (d <= -2) return "#eab308";
  if (d === -1) return "#22c55e";
  if (d === 0) return "#94a3b8";
  if (d === 1) return "#3b82f6";
  return "#ef4444";
}

function scoreLabel(strokes, par) {
  if (!strokes) return "";
  const d = strokes - par;
  if (d <= -2) return "Eagle";
  if (d === -1) return "Birdie";
  if (d === 0) return "Par";
  if (d === 1) return "Bogey";
  if (d === 2) return "D.Bogey";
  return "+" + d;
}

function stablefordGross(strokes, par) {
  const d = strokes - par;
  if (d <= -2) return 5;
  if (d === -1) return 4;
  if (d === 0) return 3;
  if (d === 1) return 2;
  if (d >= 2) return 1;
  return 0;
}

function stablefordNet(strokes, par, hcp, courseHI) {
  const strokesGiven = Math.floor(hcp / 18) + (courseHI <= (hcp % 18) ? 1 : 0);
  const netStrokes = strokes - strokesGiven;
  return stablefordGross(netStrokes, par);
}

function calcDynamicHcp(pId, roundIdx, allRounds, players, hcpData) {
  const pastRounds = allRounds.slice(0, roundIdx);
  if (pastRounds.length === 0) {
    const h = hcpData[pId] || HCP_2026_DEFAULT[pId];
    return h?.inicial || 20;
  }

  const scores = [];
  pastRounds.forEach(r => {
    if (!r.scores?.[pId]) return;
    const holes = r.scores[pId];
    let strokes = 0;
    holes.forEach(s => s > 0 && (strokes += s));
    scores.push(strokes);
  });

  if (scores.length === 0) return 20;
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const scratch = 72;
  return Math.max(0, Math.min(54, scratch * 1.067 - avgScore * 1.067));
}

function roundYear(r) {
  if (!r.date) return 2025;
  return new Date(r.date).getFullYear();
}

function tiebreaker(a, b) {
  if (a.totalNet !== b.totalNet) return b.totalNet - a.totalNet;
  if (a.avgNet !== b.avgNet) return b.avgNet - a.avgNet;
  if (a.totalGross !== b.totalGross) return b.totalGross - a.totalGross;
  return a.name.localeCompare(b.name);
}

function computeRankingsFromRounds(players, yearRounds, yearNum, hcpData) {
  const BEST_N = 7;
  return players.map(p => {
    const netVals = [];
    const grossVals = [];
    let tarjetas = 0;

    yearRounds.forEach((r, idx) => {
      if (!r.scores?.[p.id]) return;
      const holes = r.scores[p.id];
      const hcp = yearNum >= 2026 ? calcDynamicHcp(p.id, idx, yearRounds, players, hcpData) : (p.handicap || 18);
      let netPts = 0, grossPts = 0;
      holes.forEach((s, i) => {
        if (s > 0) {
          netPts += stablefordNet(s, COURSE.pars[i], hcp, COURSE.handicapIndex[i]);
          grossPts += stablefordGross(s, COURSE.pars[i]);
        }
      });
      netVals.push(netPts);
      grossVals.push(grossPts);
      tarjetas++;
    });

    const best7Net = [...netVals].sort((a, b) => b - a).slice(0, BEST_N);
    const best7Gross = [...grossVals].sort((a, b) => b - a).slice(0, BEST_N);
    const totalNet7 = best7Net.reduce((s, v) => s + v, 0);
    const totalGross7 = best7Gross.reduce((s, v) => s + v, 0);

    return {
      ...p,
      totalNet: totalNet7,
      totalGross: totalGross7,
      totalNetAll: netVals.reduce((s, v) => s + v, 0),
      totalGrossAll: grossVals.reduce((s, v) => s + v, 0),
      tarjetas,
      best7Net,
      best7Gross,
      avgNet: best7Net.length > 0 ? totalNet7 / best7Net.length : 0,
      avgGross: best7Gross.length > 0 ? totalGross7 / best7Gross.length : 0,
    };
  }).sort(tiebreaker);
}

// ============================================================================
// STYLES
// ============================================================================

const S = {
  app: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "#ffffff",
    minHeight: "100vh",
    display: "flex",
    overflow: "hidden"
  },
  loadScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f8f9fa",
  },
  hamburger: {
    display: "none",
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 100,
    padding: "8px 12px",
    background: "#4a6741",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 20,
    cursor: "pointer",
  },
};

// ============================================================================
// ACCESS SCREEN COMPONENT
// ============================================================================

function AccessScreen({ onAccess }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.toUpperCase() === ACCESS_CODE) {
      onAccess();
      setError(false);
    } else {
      setError(true);
      setCode("");
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #4a6741 0%, #2d4a2b 100%)",
      padding: 20
    }}>
      <img src={LOGO_SRC} alt="Grosspi" style={{width: 100, marginBottom: 30, filter: "brightness(0) invert(1)"}} />
      <h1 style={{color: "white", marginBottom: 10, fontSize: 28}}>Grosspi 2025-2026</h1>
      <p style={{color: "#ddd", marginBottom: 30, textAlign: "center"}}>Campeonato de Golf</p>
      
      <form onSubmit={handleSubmit} style={{background: "white", padding: 30, borderRadius: 12, width: "100%", maxWidth: 300}}>
        <label style={{display: "block", marginBottom: 12, fontSize: 14, fontWeight: 600, color: "#333"}}>
          Código de acceso
        </label>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ingresa el código"
          style={{
            width: "100%",
            padding: "12px 16px",
            marginBottom: 16,
            border: error ? "2px solid #ef4444" : "1px solid #ddd",
            borderRadius: 8,
            fontSize: 16,
            boxSizing: "border-box"
          }}
        />
        {error && <p style={{color: "#ef4444", fontSize: 13, marginBottom: 12}}>Código incorrecto</p>}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "#4a6741",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [players, setPlayers] = useState(INIT_DATA.players);
  const [rounds, setRounds] = useState([]);
  const [hcp2026, setHcp2026] = useState(HCP_2026_DEFAULT);
  const [view, setView] = useState("dashboard");
  const [year, setYear] = useState(2026);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selRound, setSelRound] = useState(null);

  // Load Firebase and sync data
  useEffect(() => {
    initFirebase();
    if (!db) {
      setLoaded(true);
      return;
    }

    // Listen for rounds
    const roundsRef = ref(db, "rounds");
    const unsubscribeRounds = onValue(roundsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roundsList = Object.values(data);
        setRounds(roundsList);
      } else {
        setRounds([]);
      }
    });

    // Listen for hcp2026
    const hcpRef = ref(db, "hcp2026");
    const unsubscribeHcp = onValue(hcpRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setHcp2026(data);
    });

    setLoaded(true);

    return () => {
      unsubscribeRounds();
      unsubscribeHcp();
    };
  }, []);

  const saveRound = useCallback(async (r) => {
    if (!db) return;
    try {
      const roundId = r.id || `r-${Date.now()}`;
      await set(ref(db, `rounds/${roundId}`), { ...r, id: roundId });
    } catch (e) {
      console.error("Save error:", e);
    }
  }, []);

  const saveHcp = useCallback(async (h) => {
    if (!db) return;
    try {
      await set(ref(db, "hcp2026"), h);
    } catch (e) {
      console.error("Save hcp error:", e);
    }
  }, []);

  const yearRounds = useMemo(() => rounds.filter(r => roundYear(r) === year), [rounds, year]);
  const rankings = useMemo(() => computeRankingsFromRounds(players, yearRounds, year, hcp2026), [players, yearRounds, year, hcp2026]);
const availableYears = useMemo(() => [...new Set(rounds.map(roundYear)), 2025, 2026].sort(), [rounds]);
  if (!loaded) {
    return (
      <div style={S.loadScreen}>
        <img src={LOGO_SRC} alt="Grosspi" style={{width: 80, marginBottom: 16}} />
        <div style={{color: "#4a6741", fontSize: 14}}>Cargando...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <AccessScreen onAccess={() => setAuthenticated(true)} />;
  }

  // Simplified UI - Dashboard view
  return (
    <div style={S.app}>
      <div style={{flex: 1, display: "flex", flexDirection: "column", overflow: "hidden"}}>
        {/* Header */}
        <div style={{background: "#4a6741", color: "white", padding: "16px 24px", borderBottom: "1px solid #ddd"}}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <h1 style={{margin: 0, fontSize: 20}}>Grosspi Championship</h1>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{padding: "8px 12px", borderRadius: 6}}>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Rankings Table */}
        <div style={{flex: 1, overflow: "auto", padding: "20px 24px"}}>
          <h2 style={{marginTop: 0}}>Ranking {year}</h2>
          <div style={{overflowX: "auto"}}>
            <table style={{width: "100%", borderCollapse: "collapse", fontSize: 14}}>
              <thead>
                <tr style={{background: "#f0f0f0", borderBottom: "2px solid #ddd"}}>
                  <th style={{textAlign: "left", padding: "12px", fontWeight: 600}}>Posición</th>
                  <th style={{textAlign: "left", padding: "12px", fontWeight: 600}}>Jugador</th>
                  <th style={{textAlign: "center", padding: "12px", fontWeight: 600}}>Tarjetas</th>
                  <th style={{textAlign: "center", padding: "12px", fontWeight: 600}}>Pts Net (Mejores 7)</th>
                  <th style={{textAlign: "center", padding: "12px", fontWeight: 600}}>Promedio</th>
                  <th style={{textAlign: "center", padding: "12px", fontWeight: 600}}>Pts Gross (Mejores 7)</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((p, idx) => (
                  <tr key={p.id} style={{borderBottom: "1px solid #eee", background: idx % 2 === 0 ? "#fafafa" : "white"}}>
                    <td style={{padding: "12px", fontWeight: 600, color: "#4a6741"}}>{idx + 1}</td>
                    <td style={{padding: "12px"}}>{p.name}</td>
                    <td style={{textAlign: "center", padding: "12px"}}>{p.tarjetas}</td>
                    <td style={{textAlign: "center", padding: "12px", fontWeight: 600}}>{p.totalNet}</td>
                    <td style={{textAlign: "center", padding: "12px"}}>{p.avgNet.toFixed(1)}</td>
                    <td style={{textAlign: "center", padding: "12px"}}>{p.totalGross}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{fontSize: 12, color: "#666", marginTop: 20}}>
            💡 La BD se sincroniza automáticamente. Los cambios aparecen en todos los dispositivos.
          </p>
        </div>
      </div>
    </div>
  );
}
