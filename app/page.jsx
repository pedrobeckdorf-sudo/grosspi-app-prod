"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

const LOGO_SRC = "/logo.jpg";

const COURSE = {"name": "Las Lomas de La Dehesa", "pars": [4, 4, 3, 4, 4, 3, 4, 5, 5, 4, 5, 4, 5, 4, 3, 4, 3, 4], "handicapIndex": [15, 3, 17, 5, 11, 13, 7, 1, 9, 10, 6, 14, 4, 16, 8, 2, 18, 12]};
const INIT_PLAYERS = [{"id": "p01", "name": "Agustín Larraín", "handicap": 19}, {"id": "p02", "name": "Carlos Gana", "handicap": 19}, {"id": "p03", "name": "Carlos Pucci", "handicap": 27}, {"id": "p04", "name": "Gonzalo Errázuriz", "handicap": 21}, {"id": "p05", "name": "Jaime Gutiérrez", "handicap": 21}, {"id": "p06", "name": "Jaime Silva", "handicap": 15}, {"id": "p07", "name": "Jorge Labra", "handicap": 18}, {"id": "p08", "name": "Jorge Mandiola", "handicap": 15}, {"id": "p09", "name": "Jorge Méndez", "handicap": 23}, {"id": "p10", "name": "José Ignacio Amenábar", "handicap": 20}, {"id": "p11", "name": "José Manuel Donoso", "handicap": 17}, {"id": "p12", "name": "Juan A. Ruiz-Tagle", "handicap": 14}, {"id": "p13", "name": "Mario Hanckes", "handicap": 17}, {"id": "p14", "name": "Ricardo Delano", "handicap": 20}, {"id": "p15", "name": "Ricardo Marín", "handicap": 18}, {"id": "p16", "name": "Rodrigo Alarcón", "handicap": 22}, {"id": "p17", "name": "Rodrigo López", "handicap": 28}, {"id": "p18", "name": "Rony Obach", "handicap": 20}, {"id": "p19", "name": "Sergio Beckdorf", "handicap": 17}, {"id": "p20", "name": "Sergio Mangelsdorff", "handicap": 31}, {"id": "p21", "name": "Sergio Urzúa", "handicap": 12}, {"id": "p22", "name": "Leonardo Marchant", "handicap": 9}, {"id": "p23", "name": "Jorge Marchant", "handicap": 10}];

// Datos históricos 2025 (rondas + resumen anual) — se cargan bajo demanda desde /data2025.json
// para no inflar el bundle JS. Módulo-level para que los componentes los lean síncronamente.
let ROUNDS_2025 = [];
let ANNUAL_2025 = {};
let _hist2025Promise = null;
function loadHistoric2025() {
  if (_hist2025Promise) return _hist2025Promise;
  _hist2025Promise = fetch("/data2025.json")
    .then(r => r.json())
    .then(d => { ROUNDS_2025 = d.rounds || []; ANNUAL_2025 = d.annual2025 || {}; return d; })
    .catch(e => { console.error("loadHistoric2025:", e); return {rounds:[], annual2025:{}}; });
  return _hist2025Promise;
}

const HCP_2026_DEFAULT = {
  "p01": {gp2025:19,fed:20,inicial:19}, "p02": {gp2025:23,fed:19,inicial:19},
  "p03": {gp2025:27,fed:27,inicial:27}, "p04": {gp2025:21,fed:21,inicial:21},
  "p05": {gp2025:21,fed:21,inicial:21}, "p06": {gp2025:15,fed:17,inicial:15},
  "p07": {gp2025:18,fed:20,inicial:18}, "p08": {gp2025:15,fed:15,inicial:15},
  "p09": {gp2025:26,fed:23,inicial:23}, "p10": {gp2025:20,fed:22,inicial:20},
  "p11": {gp2025:17,fed:18,inicial:17}, "p12": {gp2025:19,fed:14,inicial:14},
  "p13": {gp2025:19,fed:17,inicial:17}, "p14": {gp2025:21,fed:20,inicial:20},
  "p15": {gp2025:18,fed:20,inicial:18}, "p16": {gp2025:22,fed:22,inicial:22},
  "p17": {gp2025:28,fed:29,inicial:28}, "p18": {gp2025:22,fed:20,inicial:20},
  "p19": {gp2025:17,fed:17,inicial:17}, "p20": {gp2025:31,fed:32,inicial:31},
  "p21": {gp2025:15,fed:12,inicial:12},
  "p22": {gp2025:9,fed:9,inicial:9},   "p23": {gp2025:10,fed:10,inicial:10}
};

// Dynamic HCP calculation per Art. 15
// HCP from gross points: 36 - grossPts
// T1: Inicial, T2: avg(Inicial, T1) cap +2, T3: avg(Inicial,T1,T2)
// T4: best 3 of (Inicial,T1,T2,T3), T5: best 3 of last 4, T6+: best 3 of last 5
// Cache: calcDynamicHcp se llama cientos de veces por render (jugadores x rondas x 2)
// y cada llamada recorre y ordena todas las rondas. El WeakMap se invalida solo
// cuando cambia la identidad del array de rondas o del objeto de handicaps.
const _hcpCache = new WeakMap();
function calcDynamicHcp(playerId, targetRoundId, allRounds, players, hcpData) {
  let byHcp = _hcpCache.get(allRounds);
  if (!byHcp) { byHcp = new WeakMap(); _hcpCache.set(allRounds, byHcp); }
  let memo = byHcp.get(hcpData);
  if (!memo) { memo = new Map(); byHcp.set(hcpData, memo); }
  const key = playerId + "|" + targetRoundId;
  if (memo.has(key)) return memo.get(key);
  const result = _calcDynamicHcp(playerId, targetRoundId, allRounds, players, hcpData);
  memo.set(key, result);
  return result;
}

function _calcDynamicHcp(playerId, targetRoundId, allRounds, players, hcpData) {
  const h0 = hcpData[playerId]?.inicial ?? 20;

  // Get the effective played date for a round for a specific player
  // Uses scores_log[playerId].playedAt if available, falls back to round.date
  const getPlayedDate = (r) => r.scores_log?.[playerId]?.playedAt || r.date;

  // Find the target round's effective date for this player
  let targetDate;
  if (typeof targetRoundId === "number") {
    const tr = allRounds[targetRoundId];
    targetDate = tr ? getPlayedDate(tr) : null;
  } else if (targetRoundId && targetRoundId.startsWith("__after__")) {
    // Synthetic sentinel: date is encoded after the prefix
    targetDate = targetRoundId.replace("__after__", "");
  } else {
    const tr = allRounds.find(r => r.id === targetRoundId);
    targetDate = tr ? getPlayedDate(tr) : null;
  }

  // Build player's personal sequence sorted by their individual played date
  const playerRounds = allRounds
    .filter(r => r.scores?.[playerId])
    .sort((a, b) => new Date(getPlayedDate(a)) - new Date(getPlayedDate(b)));

  // Collect grossPts from rounds played BEFORE the target date (player-chronological)
  const playedHcps = [];
  for (const r of playerRounds) {
    if (targetDate && new Date(getPlayedDate(r)) >= new Date(targetDate)) break;
    let grossPts = 0;
    r.scores[playerId].forEach((s, hi) => {
      grossPts += stablefordGross(s, COURSE.pars[hi]);
    });
    playedHcps.push(36 - grossPts);
  }

  const n = playedHcps.length;
  if (n === 0) return h0;
  if (n === 1) return Math.min(Math.round((h0 + playedHcps[0]) / 2), h0 + 2);
  if (n === 2) return Math.round((h0 + playedHcps[0] + playedHcps[1]) / 3);
  if (n === 3) { // 4ª: best 3 of [h0, T1, T2, T3]
    const all = [h0, ...playedHcps].sort((a,b) => a-b);
    return Math.round((all[0] + all[1] + all[2]) / 3);
  }
  if (n === 4) { // 5ª: best 3 of last 4
    const last4 = playedHcps.slice(-4).sort((a,b) => a-b);
    return Math.round((last4[0] + last4[1] + last4[2]) / 3);
  }
  // 6ª+: best 3 of last 5
  const last5 = playedHcps.slice(-5).sort((a,b) => a-b);
  return Math.round((last5[0] + last5[1] + last5[2]) / 3);
}

// Tiebreaker: best 3, then best 2, then best 1 (Art. 16)
function tiebreaker(a, b) {
  if (a.totalNet !== b.totalNet) return b.totalNet - a.totalNet;
  for (let k = 3; k >= 1; k--) {
    const aTop = a.best7Net.slice(0, k).reduce((s,v) => s+v, 0);
    const bTop = b.best7Net.slice(0, k).reduce((s,v) => s+v, 0);
    if (aTop !== bTop) return bTop - aTop;
  }
  return 0;
}

// Compute ranking score: sum all if <7 rounds played, best 7 if >=7
function rankingScore(netVals) {
  const sorted = [...netVals].sort((a,b) => b-a);
  if (netVals.length < 7) {
    return { total: netVals.reduce((s,v)=>s+v,0), best7: sorted, usedAll: true };
  }
  const best7 = sorted.slice(0,7);
  return { total: best7.reduce((s,v)=>s+v,0), best7, usedAll: false };
}

const PAR_TOTAL = COURSE.pars.reduce((a,b) => a+b, 0);

function stablefordNet(strokes, par, hcp, hcpIdx, totalHoles=18) {
  if (!strokes || strokes <= 0) return 0;
  const extra = Math.floor(hcp / totalHoles) + (hcpIdx <= (hcp % totalHoles) ? 1 : 0);
  const net = strokes - extra;
  const diff = net - par;
  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

function stablefordGross(strokes, par) {
  if (!strokes || strokes <= 0) return 0;
  const diff = strokes - par;
  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

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

// ======== FIREBASE REALTIME DATABASE ========
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBIp-mGYOb9w7gLNeSOttngtXQIJvjrfLI",
  authDomain: "grosspi.firebaseapp.com",
  databaseURL: "https://grosspi-default-rtdb.firebaseio.com",
  projectId: "grosspi",
  storageBucket: "grosspi.firebasestorage.app",
  messagingSenderId: "699405139472",
  appId: "1:699405139472:web:cbe25f92e1bf4c70961495",
};

// Lazy Firebase initializer — runs only in browser
let _db = null;
async function getDB() {
  if (_db) return _db;
  if (typeof window === "undefined") return null;
  const { initializeApp, getApps } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  _db = getDatabase(app);
  return _db;
}

async function fbGet(path, fallback = null) {
  try {
    const db = await getDB();
    if (!db) return fallback;
    const { ref, get } = await import("firebase/database");
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : fallback;
  } catch (e) { console.error("fbGet:", e); return fallback; }
}

async function fbSet(path, value) {
  try {
    const db = await getDB();
    if (!db) return;
    const { ref, set } = await import("firebase/database");
    await set(ref(db, path), value);
  } catch (e) { console.error("fbSet:", e); }
}

// Atomic multi-path write — prevents race conditions between separate fbSet calls
// updates = { "grosspi/rounds": [...], "grosspi/pending": [...] }
async function fbMultiSet(updates) {
  try {
    const db = await getDB();
    if (!db) return;
    const { ref, update } = await import("firebase/database");
    await update(ref(db, "/"), updates);
  } catch (e) {
    console.error("fbMultiSet failed, trying fallback:", e);
    for (const [path, value] of Object.entries(updates)) {
      await fbSet(path, value);
    }
  }
}

async function fbSubscribe(path, callback) {
  try {
    const db = await getDB();
    if (!db) return () => {};
    const { ref, onValue } = await import("firebase/database");
    const unsubscribe = onValue(ref(db, path), (snap) => {
      callback(snap.exists() ? snap.val() : null);
    });
    return unsubscribe;
  } catch (e) { console.error("fbSubscribe:", e); return () => {}; }
}

// localStorage — only for role (session-local, per device)
function lsGet(key, fallback = null) {
  try {
    if (typeof window === "undefined") return fallback;
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function lsSet(key, val) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) { console.error(e); }
}

// DB paths
const DB = { players: "grosspi/players", rounds: "grosspi/rounds", hcp2026: "grosspi/hcp2026", pending: "grosspi/pending", roundPhotos: "grosspi/roundPhotos", photoIndex: "grosspi/photoIndex" };

const EMPTY_OBJ = {};
const EMPTY_ARR = [];

// ======== FOTOS: carga bajo demanda ========
// Antes la app se suscribía a TODO grosspi/roundPhotos al arrancar, bajando cada
// tarjeta en base64 (~150KB c/u) en cada carga. Ahora sólo se suscribe al índice
// (ids + peso) y las imágenes se piden por ronda cuando se abren.

// Normaliza el nodo de fotos de una ronda a [{key, players:[pid], src}].
// Formatos soportados:
//   legacy array : [{player, src}]
//   por jugador  : { p05: "data:..." }
//   tarjeta compartida (varios jugadores en una foto): { card123: {src, players:[...]} }
function normalizePhotos(node) {
  if (!node) return [];
  const entries = Array.isArray(node) ? node.map((v, i) => [String(i), v]) : Object.entries(node);
  const out = [];
  const seen = new Set();
  for (const [k, v] of entries) {
    if (!v) continue;
    if (typeof v === "string") {
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ key: k, players: [k], src: v });
    } else if (v.src) {
      const pls = Array.isArray(v.players) && v.players.length ? v.players : [v.player || k];
      out.push({ key: k, players: pls, src: v.src });
    }
  }
  // Si un jugador aparece en formato nuevo y en uno legacy, se queda el nuevo
  const modernPlayers = new Set(out.filter(o => !/^\d+$/.test(o.key)).flatMap(o => o.players));
  return out.filter(o => !/^\d+$/.test(o.key) || !o.players.some(pid => modernPlayers.has(pid)));
}

// Bytes aproximados de un data URL base64
function approxBytes(dataUrl) {
  return Math.round(((dataUrl || "").length - 22) * 0.75);
}

async function fbGetRoundPhotos(roundId) {
  if (!roundId) return [];
  return normalizePhotos(await fbGet(`${DB.roundPhotos}/${roundId}`, null));
}

// Guarda UNA foto de tarjeta compartida por varios jugadores (no duplica la imagen)
async function fbSaveCardPhoto(roundId, playerIds, src) {
  const key = "card" + Date.now();
  const bytes = approxBytes(src);
  await fbMultiSet({
    [`${DB.roundPhotos}/${roundId}/${key}`]: { src, players: playerIds },
    [`${DB.photoIndex}/${roundId}/${key}`]: bytes,
  });
  return key;
}

async function fbDeleteRoundPhotos(roundIds) {
  const updates = {};
  roundIds.forEach(rid => {
    updates[`${DB.roundPhotos}/${rid}`] = null;
    updates[`${DB.photoIndex}/${rid}`] = null;
  });
  if (Object.keys(updates).length) await fbMultiSet(updates);
}

// Reconstruye el índice leyendo el nodo completo (operación pesada, sólo admin bajo demanda)
async function fbRebuildPhotoIndex() {
  const all = await fbGet(DB.roundPhotos, null);
  if (!all) { await fbSet(DB.photoIndex, null); return 0; }
  const index = {};
  let n = 0;
  Object.entries(all).forEach(([rid, node]) => {
    const photos = normalizePhotos(node);
    if (!photos.length) return;
    index[rid] = {};
    photos.forEach(ph => { index[rid][ph.player] = approxBytes(ph.src); n++; });
  });
  await fbSet(DB.photoIndex, Object.keys(index).length ? index : null);
  return n;
}
const LS = { role: "grosspi:role" };

const ADMIN_PIN = "Sbv1240";

// ======== LOGIN SCREEN ========
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState(null); // null | "admin"
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleAdmin = () => {
    if (pin === ADMIN_PIN) {
      onLogin("admin");
    } else {
      setError("PIN incorrecto");
      setPin("");
    }
  };

  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      minHeight:"100vh", backgroundColor:"#f5f7f3", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",
      padding:24
    }}>
      <img src={LOGO_SRC} alt="Grosspi" style={{width:110,borderRadius:14,marginBottom:24,boxShadow:"0 4px 16px rgba(0,0,0,0.12)"}} />
      <h1 style={{fontSize:22,fontWeight:800,color:"#1a472a",margin:"0 0 4px",letterSpacing:"-0.03em"}}>Copa Grosspi</h1>
      <p style={{fontSize:13,color:"#6b7280",marginBottom:32}}>Las Lomas de La Dehesa</p>

      {!mode ? (
        <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:280}}>
          <button
            style={{padding:"14px 24px",borderRadius:10,border:"none",backgroundColor:"#1a472a",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}
            onClick={() => onLogin("player")}
          >
            ⛳ Entrar como Jugador
          </button>
          <button
            style={{padding:"14px 24px",borderRadius:10,border:"1px solid #d1d5db",backgroundColor:"#fff",color:"#374151",fontWeight:600,fontSize:15,cursor:"pointer"}}
            onClick={() => setMode("admin")}
          >
            🔐 Entrar como Admin
          </button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:280}}>
          <p style={{textAlign:"center",fontWeight:600,color:"#1a472a",margin:0}}>PIN de administrador</p>
          <input
            type="password"
            placeholder="Ingresa el PIN..."
            value={pin}
            onChange={e => { setPin(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdmin()}
            autoFocus
            style={{padding:"10px 14px",borderRadius:8,border:"1px solid #d1d5db",fontSize:14,outline:"none",textAlign:"center",letterSpacing:"0.2em"}}
          />
          {error && <p style={{color:"#ef4444",fontSize:12,textAlign:"center",margin:0}}>{error}</p>}
          <button
            style={{padding:"12px 24px",borderRadius:10,border:"none",backgroundColor:"#1a472a",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}
            onClick={handleAdmin}
          >
            Ingresar
          </button>
          <button
            style={{padding:"8px",border:"none",backgroundColor:"transparent",color:"#6b7280",fontSize:13,cursor:"pointer"}}
            onClick={() => { setMode(null); setPin(""); setError(""); }}
          >
            ← Volver
          </button>
        </div>
      )}
    </div>
  );
}

// Helper: get year from a round
function roundYear(r) {
  if (!r.date) return 2025;
  return new Date(r.date).getFullYear();
}

// Compute rankings dynamically from round data (for 2026+)
function computeRankingsFromRounds(players, yearRounds, yearNum, hcpData) {
  return players.map(p => {
    const netByMonth = {};
    const grossByMonth = {};
    const strokesByMonth = {};
    let tarjetas = 0;
    const netVals = [];
    const grossVals = [];
    const hcpHistory = []; // [{roundName, hcp}] — hcp = AFTER that round

    yearRounds.forEach((r, rIdx) => {
      if (!r.scores?.[p.id]) return;
      const holes = r.scores[p.id];
      // HCP used to PLAY this round (before)
      const hcpForPlay = yearNum >= 2026 ? calcDynamicHcp(p.id, r.id, yearRounds, players, hcpData) : (p.handicap || 18);
      let netPts = 0, grossPts = 0, strokes = 0;
      holes.forEach((s, i) => {
        if (s > 0) {
          netPts += stablefordNet(s, COURSE.pars[i], hcpForPlay, COURSE.handicapIndex[i]);
          grossPts += stablefordGross(s, COURSE.pars[i]);
          strokes += s;
        }
      });
      const label = r.name || `Ronda`;
      netByMonth[label] = netPts;
      grossByMonth[label] = grossPts;
      strokesByMonth[label] = strokes;
      netVals.push(netPts);
      grossVals.push(grossPts);
      // HCP AFTER this round = calcDynamicHcp with rIdx+1
      // HCP AFTER this round: same as hcpForPlay but including this round's result
      // Pass a synthetic future date so calcDynamicHcp includes this round
      // hcpAfter: HCP after playing this round — use player's playedAt date + 1 day as sentinel
      const _pDate = r.scores_log?.[p.id]?.playedAt || r.date;
      const _afterDate = new Date(new Date(_pDate).getTime() + 86400000).toISOString().slice(0,10);
      const hcpAfter = yearNum >= 2026 ? calcDynamicHcp(p.id, "__after__" + _afterDate, yearRounds, players, hcpData) : hcpForPlay;
      hcpHistory.push({ roundName: label, hcp: hcpAfter, roundDate: _pDate });
      tarjetas++;
    });

    const { total: totalNet7, best7: best7Net } = rankingScore(netVals);
    const { total: totalGross7, best7: best7Gross } = rankingScore(grossVals);
    // Sort hcpHistory by individual played date so Adicional appears in correct position
    hcpHistory.sort((a, b) => new Date(a.roundDate) - new Date(b.roundDate));

    return {
      ...p,
      totalNet: totalNet7,
      totalGross: totalGross7,
      totalNetAll: netVals.reduce((s,v) => s+v, 0),
      totalGrossAll: grossVals.reduce((s,v) => s+v, 0),
      tarjetas,
      best7Net,
      best7Gross,
      avgNet: best7Net.length > 0 ? totalNet7 / best7Net.length : 0,
      avgGross: best7Gross.length > 0 ? totalGross7 / best7Gross.length : 0,
      netByMonth,
      grossByMonth,
      strokesByMonth,
      hcpHistory,
      currentHcp: hcpHistory.length > 0 ? hcpHistory[hcpHistory.length-1].hcp : null,
    };
  }).sort(tiebreaker);
}

export default function App() {
  const [players, setPlayers] = useState(INIT_PLAYERS);
  const [rounds, setRounds] = useState([]);
  const [hcp2026, setHcp2026] = useState(HCP_2026_DEFAULT);
  const [pending, setPending] = useState([]);
  const [photoIndex, setPhotoIndex] = useState({}); // { [roundId]: { [playerId]: bytes } } — sólo metadatos
  const [histLoaded, setHistLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [selPlayer, setSelPlayer] = useState(null);
  const [selRound, setSelRound] = useState(null);
  const [cmpIds, setCmpIds] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [year, setYear] = useState(2026);
  const [role, setRole] = useState(null); // null = not logged in, "player" | "admin"

  const isAdmin = role === "admin";

  const handleLogin = (r) => {
    setRole(r);
    lsSet(LS.role, r);
  };
  const handleLogout = () => {
    setRole(null);
    lsSet(LS.role, null);
    setView("dashboard");
  };

  useEffect(() => {
    // Role from localStorage (device-local)
    const savedRole = lsGet(LS.role, null);
    if (savedRole) setRole(savedRole);

    // Subscribe to Firebase realtime updates
    let unsubPlayers, unsubRounds, unsubHcp, unsubIndex;
    let firstPlayers = true, firstRounds = true, firstHcp = true;

    (async () => {
      unsubPlayers = await fbSubscribe(DB.players, (val) => {
        if (val) {
          // Auto-merge: si faltan jugadores del código en Firebase, agregarlos (one-time migration)
          if (firstPlayers) {
            const existingIds = new Set(val.map(p => p.id));
            const missing = INIT_PLAYERS.filter(p => !existingIds.has(p.id));
            if (missing.length > 0) {
              const merged = [...val, ...missing];
              setPlayers(merged);
              fbSet(DB.players, merged);
            } else {
              setPlayers(val);
            }
          } else {
            setPlayers(val);
          }
        }
        if (firstPlayers) firstPlayers = false;
      });
      unsubRounds = await fbSubscribe(DB.rounds, (val) => {
        if (val) setRounds(val);
        // Mostrar la UI apenas responde Firebase (antes había un delay fijo de 800ms)
        if (firstRounds) { firstRounds = false; setLoaded(true); }
      });
      unsubHcp = await fbSubscribe(DB.hcp2026, (val) => {
        if (val) {
          // Auto-merge: si faltan HCP iniciales del código en Firebase, agregarlos
          if (firstHcp) {
            const missing = {};
            Object.keys(HCP_2026_DEFAULT).forEach(pid => {
              if (!val[pid]) missing[pid] = HCP_2026_DEFAULT[pid];
            });
            if (Object.keys(missing).length > 0) {
              const merged = {...val, ...missing};
              setHcp2026(merged);
              fbSet(DB.hcp2026, merged);
            } else {
              setHcp2026(val);
            }
          } else {
            setHcp2026(val);
          }
        }
        if (firstHcp) firstHcp = false;
      });
      // Sólo el índice de fotos (ids + peso). Las imágenes se piden por ronda al abrirla.
      unsubIndex = await fbSubscribe(DB.photoIndex, (val) => setPhotoIndex(val || {}));
    })();

    // Red de seguridad: si Firebase no responde, mostrar la UI igual
    const failsafe = setTimeout(() => setLoaded(true), 2500);

    // Histórico 2025 fuera del bundle — se usa como fallback si Firebase no responde
    loadHistoric2025().then(() => {
      setHistLoaded(true);
      setRounds(prev => (prev && prev.length ? prev : ROUNDS_2025));
    });

    return () => {
      clearTimeout(failsafe);
      if (unsubPlayers) unsubPlayers();
      if (unsubRounds) unsubRounds();
      if (unsubHcp) unsubHcp();
      if (unsubIndex) unsubIndex();
    };
  }, []);

  // Solicitudes pendientes: sólo las necesita el admin (traen fotos en base64)
  useEffect(() => {
    if (!isAdmin) { setPending([]); return; }
    let unsub;
    let alive = true;
    (async () => {
      const u = await fbSubscribe(DB.pending, (val) => {
        if (!val) { setPending([]); return; }
        const arr = Array.isArray(val) ? val.filter(Boolean) : Object.values(val).filter(Boolean);
        setPending(arr);
      });
      if (alive) unsub = u; else u();
    })();
    return () => { alive = false; if (unsub) unsub(); };
  }, [isAdmin]);

  const savePlayers = useCallback(async (p) => { setPlayers(p); await fbSet(DB.players, p); }, []);
  const saveRounds = useCallback(async (r) => {
    setRounds(r);
    // Strip photos before writing — stored separately in roundPhotos
    const forDB = r.map(({ photos, ...rest }) => rest);
    await fbSet(DB.rounds, forDB);
  }, []);
  const saveHcp2026 = useCallback(async (h) => { setHcp2026(h); await fbSet(DB.hcp2026, h); }, []);
  // Escrituras por hijo: no requieren tener toda la lista en memoria y no pisan
  // solicitudes de otros usuarios (antes se reescribía el nodo completo).
  const addPendingRequest = useCallback(async (entry) => {
    await fbSet(`${DB.pending}/${entry.id}`, entry);
  }, []);
  const removePendingRequest = useCallback(async (id) => {
    setPending(prev => prev.filter(r => r.id !== id));
    await fbSet(`${DB.pending}/${id}`, null);
  }, []);


  const nav = (v, extra={}) => {
    if (extra.pid) setSelPlayer(extra.pid);
    if (extra.rid) setSelRound(extra.rid);
    setView(v);
    setMenuOpen(false);
  };

  // Available years from rounds
  const availableYears = useMemo(() => {
    const yrs = new Set(rounds.map(roundYear));
    yrs.add(2025); yrs.add(2026);
    return [...yrs].sort();
  }, [rounds]);

  // Filter rounds by selected year — sorted by date so HCP calc respects chronological order
  const yearRounds = useMemo(() => 
    rounds
      .filter(r => roundYear(r) === year)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  , [rounds, year]);

  // Rankings depend on the year
  const annual2025 = histLoaded ? ANNUAL_2025 : EMPTY_OBJ;

  const rankings = useMemo(() => {
    if (year === 2025) {
      // Use pre-computed annual data from Excel
      return players.map(p => {
        const a = annual2025[p.id];
        const netVals = a?.netPts ? Object.values(a.netPts) : [];
        const grossVals = a?.grossPts ? Object.values(a.grossPts) : [];
        const { total: totalNet7, best7: best7Net } = rankingScore(netVals);
        const { total: totalGross7, best7: best7Gross } = rankingScore(grossVals);
        // Build hcpHistory from round data for 2025 (gross-based: 36 - grossPts)
        const hcpHistory = a?.grossPts
          ? Object.entries(a.grossPts).map(([roundName, gp]) => ({
              roundName, hcp: 36 - gp, roundDate: null
            }))
          : [];
        return {
          ...p,
          totalNet: totalNet7,
          totalGross: totalGross7,
          totalNetAll: a?.totalNet || 0,
          totalGrossAll: a?.totalGross || 0,
          tarjetas: a?.numTarjetas || 0,
          best7Net,
          best7Gross,
          avgNet: best7Net.length > 0 ? totalNet7 / best7Net.length : 0,
          avgGross: best7Gross.length > 0 ? totalGross7 / best7Gross.length : 0,
          netByMonth: a?.netPts || {},
          grossByMonth: a?.grossPts || {},
          strokesByMonth: a?.strokes || {},
          hcpHistory,
          currentHcp: hcpHistory.length > 0 ? hcpHistory[hcpHistory.length-1].hcp : p.handicap,
        };
      }).sort(tiebreaker);
    }
    // For 2026+: compute from round data
    return computeRankingsFromRounds(players, yearRounds, year, hcp2026);
  }, [players, annual2025, year, yearRounds, hcp2026]);

  if (!loaded) return (
    <div style={S.loadScreen}>
      <img src={LOGO_SRC} alt="Grosspi" style={{width:120,borderRadius:16}} />
      <div style={{marginTop:16,color:"#4a6741",fontSize:14}}>Cargando campeonato...</div>
    </div>
  );

  if (!role) return <LoginScreen onLogin={handleLogin} />;

  const navItems = [
    {id:"dashboard",icon:"🏆",label:"Dashboard"},
    {id:"rounds",icon:"📅",label:"Rondas"},
    {id:"players",icon:"👥",label:"Jugadores"},
    {id:"stats",icon:"📊",label:"Estadísticas"},
    {id:"compare",icon:"⚔️",label:"Comparar"},
    {id:"manual",icon:"📝",label:"Cargar Ronda"},
    {id:"reglamento",icon:"📜",label:"Reglamento"},
    ...(isAdmin ? [{id:"settings",icon:"⚙️",label:"Config"}] : []),
  ];

  return (
    <div style={S.app}>
      {/* Mobile hamburger — always visible on mobile */}
      <button
        className="grosspi-hamburger"
        style={S.hamburger}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menú"
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Dark overlay — tap to close menu on mobile */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.45)",zIndex:999,display:"none"}}
          className="mob-overlay"
        />
      )}

      {/* Sidebar */}
      <nav
        style={S.sidebar}
        className={`grosspi-nav${menuOpen ? " open" : ""}`}
      >
        <div style={S.logoWrap}>
          <img src={LOGO_SRC} alt="Grosspi" style={S.logoImg} />
        </div>
        {/* Year selector */}
        <div style={S.yearSelector}>
          {availableYears.map(y => (
            <button key={y} style={{...S.yearBtn, ...(year===y?S.yearBtnActive:{})}} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
        <div style={S.navList}>
          {navItems.map(n => (
            <button key={n.id} style={{...S.navBtn, ...(view===n.id?S.navActive:{})}} onClick={() => nav(n.id)}>
              <span style={{width:22,textAlign:"center"}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.id==="manual" && isAdmin && pending.length > 0 && (
                <span style={{backgroundColor:"#ef4444",color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"1px 6px",minWidth:18,textAlign:"center"}}>
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={S.sideFooter}>
          <div style={S.footLabel}>{players.length} jugadores · {yearRounds.length} rondas ({year})</div>
          <div style={S.footLabel}>Las Lomas de La Dehesa</div>
          <div style={{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:700,color:isAdmin?"#f59e0b":"#86efac",textTransform:"uppercase",letterSpacing:"0.05em"}}>
              {isAdmin ? "🔐 Admin" : "⛳ Jugador"}
            </span>
            <button
              onClick={handleLogout}
              style={{fontSize:11,color:"#9ca3af",border:"none",backgroundColor:"transparent",cursor:"pointer",padding:"2px 6px"}}
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main style={S.main}>
        {view==="dashboard" && <Dashboard rankings={rankings} rounds={yearRounds} nav={nav} annual={year===2025?ANNUAL_2025:null} players={players} year={year} hcp2026={hcp2026} isAdmin={isAdmin} />}
        {view==="rounds" && <Rounds rounds={yearRounds} players={players} nav={nav} year={year} hcp2026={hcp2026} isAdmin={isAdmin} saveRounds={saveRounds} allRounds={rounds} />}
        {view==="round-detail" && <RoundDetail rid={selRound} rounds={rounds} players={players} nav={nav} year={year} hcp2026={hcp2026} allYearRounds={yearRounds} isAdmin={isAdmin} saveRounds={saveRounds} allRounds={rounds} photoIndex={photoIndex} />}
        {view==="players" && <Players rankings={rankings} nav={nav} year={year} hcp2026={hcp2026} />}
        {view==="player-detail" && <PlayerDetail pid={selPlayer} rankings={rankings} rounds={yearRounds} allRounds={rounds} nav={nav} year={year} hcp2026={hcp2026} players={players} />}
        {view==="stats" && <Stats allRounds={rounds} players={players} rankings={rankings} year={year} hcp2026={hcp2026} availableYears={availableYears} />}
        {view==="compare" && <Compare rankings={rankings} cmpIds={cmpIds} setCmpIds={setCmpIds} rounds={yearRounds} allRounds={rounds} players={players} hcp2026={hcp2026} />}
        {view==="manual" && isAdmin && <ManualEntry players={players} allRounds={rounds} yearRounds={yearRounds} saveRounds={saveRounds} nav={nav} pending={pending} removePendingRequest={removePendingRequest} photoIndex={photoIndex} />}
        {view==="manual" && !isAdmin && <PlayerPhotoUpload players={players} addPendingRequest={addPendingRequest} />}
        {view==="reglamento" && <Reglamento hcp2026={hcp2026} saveHcp2026={saveHcp2026} isAdmin={isAdmin} />}
        {view==="settings" && isAdmin && <Settings players={players} savePlayers={savePlayers} rounds={rounds} saveRounds={saveRounds} hcp2026={hcp2026} saveHcp2026={saveHcp2026} photoIndex={photoIndex} />}
        {view==="settings" && !isAdmin && <div style={S.empty}>🔒 Acceso restringido a administradores</div>}
      </main>
    </div>
  );
}

// ======== DASHBOARD ========
function Dashboard({rankings, rounds, nav, annual, players, year, hcp2026, isAdmin}) {
  const top5 = rankings.slice(0,5);
  const sortedRounds = [...rounds].sort((a,b) => new Date(b.date)-new Date(a.date));
  const months = year === 2025 ? ['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'] : null;
  // For 2026+, get month labels from rankings' netByMonth keys
  const dynamicMonths = year !== 2025 ? [...new Set(rankings.flatMap(p => Object.keys(p.netByMonth)))] : [];

  return (
    <div style={S.view}>
      <div style={S.hdr}><h1 style={S.title}>Campeonato Grosspi {year}</h1><p style={S.sub}>Stableford Neto · Mejores 7 Tarjetas · Las Lomas de La Dehesa</p></div>

      {/* Summary */}
      <div style={S.grid4}>
        <div style={S.kpi}><div style={S.kpiVal}>{players.length}</div><div style={S.kpiLbl}>Jugadores</div></div>
        <div style={S.kpi}><div style={S.kpiVal}>{rounds.length}</div><div style={S.kpiLbl}>Rondas {year}</div></div>
        <div style={S.kpi}><div style={{...S.kpiVal,color:"#b8860b"}}>{rankings[0]?.totalNet||0}</div><div style={S.kpiLbl}>Pts Líder (Best 7)</div></div>
        <div style={S.kpi}><div style={S.kpiVal}>{rankings[0]?.avgNet?.toFixed(1)||"-"}</div><div style={S.kpiLbl}>Mejor Prom/Tarjeta</div></div>
      </div>

      {rounds.length === 0 && year >= 2026 && (
        <div style={{...S.card,textAlign:"center",padding:40}}>
          <div style={{fontSize:48,marginBottom:12}}>⛳</div>
          <h2 style={{color:"#1a472a",margin:"0 0 8px"}}>Campeonato {year} aún sin rondas</h2>
          <p style={{color:"#6b7280",fontSize:14,marginBottom:16}}>Sube una foto de scorecard o ingresa datos manualmente para empezar.</p>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {isAdmin && <button style={{...S.btn,...S.btnP}} onClick={()=>nav("manual")}>📝 Cargar Ronda</button>}
          </div>
        </div>
      )}

      {/* Ranking */}
      <div style={S.card}>
        <div style={S.cardHdr}>
          <div>
            <h2 style={{...S.cardTitle,margin:0}}>🏆 Ranking Campeonato {year}</h2>
            <div style={{fontSize:11,color:"#6b7280",marginTop:3}}>
              {rankings.some(p=>p.tarjetas>=7)
                ? "Suma de mejores 7 tarjetas · jugadores con menos de 7 suman todas"
                : "Suma de todas las tarjetas jugadas (aún no hay jugadores con 7+)"}
            </div>
          </div>
          <button style={S.link} onClick={()=>nav("players")}>Ver todos →</button>
        </div>
        <div style={S.tblWrap}>
          <table style={S.tbl}><thead><tr>
            <th style={S.th}>#</th><th style={{...S.th,textAlign:"left"}}>Jugador</th>
            <th style={{...S.th,color:"#b8860b"}} title="HCP actual (última ronda jugada)">HCP ★</th>
            <th style={S.th}>Tarj.</th>
            {(months || dynamicMonths).map(m => <th key={m} style={{...S.th,fontSize:10}}>{m}</th>)}
            <th style={{...S.th,borderLeft:"2px solid #d1d5db"}}>PTS</th><th style={S.th}>Prom</th>
          </tr></thead>
          <tbody>
            {rankings.slice(0,21).map((p,i) => {
              const colMonths = months || dynamicMonths;
              const displayHcp = p.currentHcp ?? (year >= 2026 ? (hcp2026[p.id]?.inicial ?? p.handicap) : p.handicap);
              return (
                <tr key={p.id} style={{...S.tr,cursor:"pointer"}} onClick={()=>nav("player-detail",{pid:p.id})}>
                  <td style={S.td}><span style={{...S.rank,...(i<3?S["rank"+i]:{})}}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                  </span></td>
                  <td style={{...S.td,textAlign:"left",fontWeight:600,whiteSpace:"nowrap"}}>{p.name}</td>
                  <td style={{...S.td,fontWeight:700,color:"#b8860b"}}>{displayHcp}</td>
                  <td style={S.td}>{p.tarjetas}</td>
                  {colMonths.map(m => {
                    const val = p.netByMonth?.[m];
                    const isBest7 = val && p.best7Net.includes(val);
                    return <td key={m} style={{...S.td,fontSize:11,color:val?(isBest7?"#1a472a":"#9ca3af"):"#e5e7eb",fontWeight:isBest7?700:400,backgroundColor:isBest7?"#f0f7f0":"transparent"}}>{val||"-"}</td>;
                  })}
                  <td style={{...S.td,fontWeight:800,color:"#1a472a",fontSize:15,borderLeft:"2px solid #d1d5db"}}>{p.totalNet}</td>
                  <td style={{...S.td,fontWeight:600,color:"#4a6741"}}>{p.avgNet?.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody></table>
        </div>
        <div style={{fontSize:11,color:"#9ca3af",marginTop:8}}>★ HCP actual = calculado con la última ronda jugada (36 - pts gross)</div>
      </div>

      {/* Recent Rounds */}
      <div style={S.card}>
        <div style={S.cardHdr}><h2 style={S.cardTitle}>📅 Rondas</h2><button style={S.link} onClick={()=>nav("rounds")}>Ver todas →</button></div>
        {sortedRounds.slice(0,5).map(r => {
          const n = r.scores ? Object.keys(r.scores).length : 0;
          return (
            <div key={r.id} style={S.roundRow} onClick={()=>nav("round-detail",{rid:r.id})}>
              <div><div style={{fontWeight:600,color:"#1a472a"}}>{r.name}</div>
              <div style={{fontSize:12,color:"#6b7280"}}>{r.date ? new Date(r.date).toLocaleDateString("es-CL",{day:"numeric",month:"long",year:"numeric"}) : ""}</div></div>
              <div style={{fontSize:13,color:"#6b7280"}}>{n} jugadores →</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ======== ROUNDS ========
function Rounds({rounds, players, nav, year, hcp2026, isAdmin, saveRounds, allRounds}) {
  const sorted = [...rounds].sort((a,b) => new Date(a.date) - new Date(b.date));
  // Helper to get HCP for a player in a round
  const getHcp = (pid, r) => {
    if (year >= 2026) {
      const rIdx = sorted.indexOf(r);
      return calcDynamicHcp(pid, r.id, sorted, players, hcp2026);
    }
    const p = players.find(x=>x.id===pid);
    return p?.handicap || 18;
  };

  const handleDelete = (e, rid) => {
    e.stopPropagation();
    const r = rounds.find(x => x.id === rid);
    if (!confirm(`¿Eliminar la ronda "${r?.name}"? Esta acción no se puede deshacer.`)) return;
    saveRounds(allRounds.filter(x => x.id !== rid));
  };

  return (
    <div style={S.view}>
      <div style={S.hdr}><h1 style={S.title}>Rondas {year}</h1></div>
      {sorted.map(r => {
        const n = r.scores ? Object.keys(r.scores).length : 0;
        // Find top scorer
        let topName="", topPts=0;
        if (r.scores) {
          Object.entries(r.scores).forEach(([pid,holes]) => {
            const p = players.find(x=>x.id===pid);
            if (!p) return;
            let pts = 0;
            holes.forEach((s,i) => { pts += stablefordNet(s, COURSE.pars[i], getHcp(pid, r), COURSE.handicapIndex[i]); });
            if (pts > topPts) { topPts = pts; topName = p.name; }
          });
        }
        return (
          <div key={r.id} style={{...S.roundCard, alignItems:"center"}} onClick={()=>nav("round-detail",{rid:r.id})}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1a472a"}}>{r.name}</div>
              <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{r.date ? new Date(r.date).toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"}) : ""}</div>
              <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>{n} jugadores{topName ? ` · 🏆 ${topName} (${topPts} pts neto)`:""}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {isAdmin && (
                <button
                  onClick={(e) => handleDelete(e, r.id)}
                  style={{padding:"5px 10px",borderRadius:6,border:"1px solid #fca5a5",backgroundColor:"#fef2f2",color:"#dc2626",fontSize:13,cursor:"pointer",fontWeight:600,flexShrink:0}}
                >
                  🗑️
                </button>
              )}
              <div style={{fontSize:20,color:"#d1d5db"}}>→</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ======== EDITABLE SCORECARD ROW (proper component — no IIFE) ========
function EditableScorecard({ entry: e, isAdmin, round, rid, allRounds, saveRounds }) {
  const [editScores, setEditScores] = useState(null);
  const isEditing = editScores !== null;

  const startEdit = (ev) => { ev.stopPropagation(); setEditScores(e.details.map(d => d.strokes || 0)); };
  const cancelEdit = (ev) => { ev.stopPropagation(); setEditScores(null); };
  const saveEdit = (ev) => {
    ev.stopPropagation();
    const newScores = editScores.map(s => parseInt(s)||0);
    const updated = allRounds.map(r => r.id===rid ? {...r, scores:{...round.scores,[e.player.id]:newScores}} : r);
    saveRounds(updated);
    setEditScores(null);
  };
  const displayScores = isEditing ? editScores : e.details.map(d=>d.strokes);

  return (
    <tr>
      <td colSpan={isAdmin ? 7 : 6} style={{padding:"0 0 8px",backgroundColor:"#f8fdf8"}}>
        <div style={{overflowX:"auto",padding:"8px 4px"}}>
          <table style={{...S.tbl,fontSize:11}}>
            <thead><tr>
              <td style={{...S.tdS,fontWeight:700,color:"#6b7280",width:52}}>Hoyo</td>
              {COURSE.pars.map((_,j)=><td key={j} style={{...S.tdS,fontSize:10,color:"#9ca3af"}}>{j+1}</td>)}
              <td style={{...S.tdS,fontWeight:700}}>TOT</td>
              {isAdmin && <td style={S.tdS}></td>}
            </tr></thead>
            <tbody>
              <tr>
                <td style={{...S.tdS,fontWeight:600,color:"#6b7280"}}>Par</td>
                {COURSE.pars.map((par,j)=><td key={j} style={S.tdS}>{par}</td>)}
                <td style={{...S.tdS,fontWeight:700}}>{PAR_TOTAL}</td>
                {isAdmin && <td style={S.tdS}></td>}
              </tr>
              <tr>
                <td style={{...S.tdS,fontWeight:600,color:"#6b7280"}}>Golpes</td>
                {displayScores.map((s,j)=>(
                  <td key={j} style={{...S.tdS,padding:"3px 1px"}}>
                    {isEditing ? (
                      <input type="number" inputMode="numeric" min="1" max="15" value={s||""}
                        onClick={ev=>ev.stopPropagation()}
                        onChange={ev=>{ev.stopPropagation();const ns=[...editScores];ns[j]=ev.target.value;setEditScores(ns);}}
                        style={{width:28,textAlign:"center",fontSize:12,fontWeight:700,padding:"2px 1px",
                          border:"1px solid #1a472a",borderRadius:4,
                          color:scoreColor(parseInt(s)||0,COURSE.pars[j]),backgroundColor:"#fff"}}
                      />
                    ) : (
                      <span style={{color:scoreColor(s,COURSE.pars[j]),fontWeight:700,fontSize:12}}>{s||"-"}</span>
                    )}
                  </td>
                ))}
                <td style={{...S.tdS,fontWeight:700}}>
                  {isEditing ? editScores.reduce((sum,s)=>sum+(parseInt(s)||0),0) : e.totalStrokes}
                </td>
                {isAdmin && (
                  <td style={{...S.tdS,whiteSpace:"nowrap"}} onClick={ev=>ev.stopPropagation()}>
                    {isEditing ? (
                      <span style={{display:"flex",gap:4}}>
                        <button onClick={saveEdit} style={{padding:"2px 7px",borderRadius:4,border:"none",backgroundColor:"#1a472a",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer"}}>✓</button>
                        <button onClick={cancelEdit} style={{padding:"2px 7px",borderRadius:4,border:"1px solid #d1d5db",backgroundColor:"#fff",fontSize:10,cursor:"pointer"}}>✕</button>
                      </span>
                    ) : (
                      <button onClick={startEdit} style={{padding:"2px 7px",borderRadius:4,border:"1px solid #d1d5db",backgroundColor:"#fff",fontSize:10,cursor:"pointer",color:"#374151"}}>✏️</button>
                    )}
                  </td>
                )}
              </tr>
              <tr>
                <td style={{...S.tdS,fontWeight:600,color:"#6b7280"}}>Neto</td>
                {e.details.map((d,j)=>(
                  <td key={j} style={{...S.tdS,fontWeight:600,color:d.netPts>=2?"#1a472a":d.netPts===1?"#6b7280":"#9ca3af"}}>{d.netPts}</td>
                ))}
                <td style={{...S.tdS,fontWeight:800,color:"#1a472a"}}>{e.netPts}</td>
                {isAdmin && <td style={S.tdS}></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

// ======== ROUND DETAIL ========
function RoundDetail({rid, rounds, players, nav, year, hcp2026, allYearRounds, isAdmin, saveRounds, allRounds, photoIndex}) {
  // Las fotos de esta ronda se piden a Firebase sólo al abrirla, no al arrancar la app
  const [photos, setPhotos] = useState(null); // null = cargando
  const photoCount = Object.keys(photoIndex?.[rid] || {}).length;
  useEffect(() => {
    let alive = true;
    if (!photoCount) { setPhotos([]); return; }
    setPhotos(null);
    fbGetRoundPhotos(rid).then(ph => { if (alive) setPhotos(ph); });
    return () => { alive = false; };
  }, [rid, photoCount]);
  const round = rounds.find(r=>r.id===rid);
  if (!round) return <div style={S.empty}>Ronda no encontrada</div>;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(round.name || "");
  const [editDate, setEditDate] = useState(round.date || "");
  const [editingPlayedAt, setEditingPlayedAt] = useState(null); // pid being edited

  const handleSaveEdit = () => {
    const updated = allRounds.map(r => r.id === rid ? {...r, name: editName, date: editDate} : r);
    saveRounds(updated);
    setEditing(false);
  };

  const handleSavePlayedAt = (pid, newDate) => {
    const currentLog = round.scores_log?.[pid] || {};
    const updatedLog = {...(round.scores_log||{}), [pid]: {...currentLog, playedAt: newDate}};
    const updated = allRounds.map(r => r.id === rid ? {...r, scores_log: updatedLog} : r);
    saveRounds(updated);
    setEditingPlayedAt(null);
  };

  const handleDeleteRound = () => {
    if (!confirm(`¿Eliminar la ronda "${round.name}" completa? Esta acción no se puede deshacer.`)) return;
    saveRounds(allRounds.filter(r => r.id !== rid));
    // Also remove photos for this round
    fbDeleteRoundPhotos([rid]);
    nav("rounds");
  };

  const handleDeletePlayer = (pid) => {
    const p = players.find(x => x.id === pid);
    if (!confirm(`¿Eliminar el score de ${p?.name} de esta ronda?`)) return;
    const newScores = {...round.scores};
    delete newScores[pid];
    const updated = allRounds.map(r => r.id === rid ? {...r, scores: newScores} : r);
    saveRounds(updated);
    // Quitar al jugador de las fotos: la tarjeta se borra sólo si no queda nadie
    (async () => {
      const current = await fbGetRoundPhotos(rid);
      const updates = {};
      current.forEach(ph => {
        if (!ph.players.includes(pid)) return;
        const rest = ph.players.filter(x => x !== pid);
        if (rest.length === 0) {
          updates[`${DB.roundPhotos}/${rid}/${ph.key}`] = null;
          updates[`${DB.photoIndex}/${rid}/${ph.key}`] = null;
        } else {
          updates[`${DB.roundPhotos}/${rid}/${ph.key}`] = { src: ph.src, players: rest };
        }
      });
      if (Object.keys(updates).length) await fbMultiSet(updates);
      setPhotos(await fbGetRoundPhotos(rid));
    })();
  };

  const board = useMemo(() => {
    if (!round.scores) return [];
    return Object.entries(round.scores).map(([pid,holes]) => {
      const p = players.find(x=>x.id===pid);
      if (!p) return null;
      // Get correct HCP for this round
      let hcp = p.handicap || 18;
      if (year >= 2026 && allYearRounds) {
        const rIdx = allYearRounds.findIndex(r => r.id === rid);
        hcp = calcDynamicHcp(pid, rid, allYearRounds, players, hcp2026);
      }
      let netPts=0, grossPts=0, totalStrokes=0;
      const details = holes.map((s,i) => {
        const np = stablefordNet(s, COURSE.pars[i], hcp, COURSE.handicapIndex[i]);
        const gp = stablefordGross(s, COURSE.pars[i]);
        netPts += np; grossPts += gp; totalStrokes += (s||0);
        return {strokes:s, par:COURSE.pars[i], netPts:np, grossPts:gp};
      });
      return {player:p, hcp, netPts, grossPts, totalStrokes, details};
    }).filter(Boolean).sort((a,b) => b.netPts - a.netPts);
  }, [round, players, year, hcp2026, allYearRounds]);

  const [expandedPid, setExpandedPid] = useState(null);
  // Auto-expand winner on load
  useEffect(() => { if (board[0]) setExpandedPid(board[0].player.id); }, [rid]);

  return (
    <div style={S.view}>
      <button style={S.back} onClick={()=>nav("rounds")}>← Rondas</button>

      {/* Header with edit/delete for admin */}
      {editing ? (
        <div style={{...S.card, marginBottom:20}}>
          <h2 style={{...S.cardTitle, marginBottom:12}}>✏️ Editar Ronda</h2>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
            <div style={{flex:1,minWidth:180}}>
              <label style={S.label}>Nombre</label>
              <input style={S.input} value={editName} onChange={e=>setEditName(e.target.value)} />
            </div>
            <div style={{flex:1,minWidth:150}}>
              <label style={S.label}>Fecha</label>
              <input style={S.input} type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} />
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.btn,...S.btnP}} onClick={handleSaveEdit}>Guardar</button>
            <button style={{...S.btn,...S.btnS}} onClick={()=>setEditing(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={S.hdr}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <h1 style={S.title}>{round.name}</h1>
              <p style={S.sub}>{round.date ? new Date(round.date).toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : ""}</p>
              {isAdmin && round.scores_log && (() => {
                const logs = Object.values(round.scores_log);
                if (!logs.length) return null;
                const sorted = logs.map(l=>l.loadedAt).filter(Boolean).sort();
                const last = sorted[sorted.length-1];
                const total = Object.keys(round.scores||{}).length;
                const loaded = logs.length;
                return (
                  <p style={{fontSize:12,color:"#6b7280",marginTop:4}}>
                    📋 {loaded}/{total} scores cargados · último: {new Date(last).toLocaleDateString("es-CL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                  </p>
                );
              })()}
            </div>
            {isAdmin && (
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <button
                  onClick={() => { setEditName(round.name); setEditDate(round.date||""); setEditing(true); }}
                  style={{...S.btn,...S.btnS,fontSize:13,padding:"8px 14px"}}
                >✏️ Editar</button>
                <button
                  onClick={handleDeleteRound}
                  style={{padding:"8px 14px",borderRadius:8,border:"1px solid #fca5a5",backgroundColor:"#fef2f2",color:"#dc2626",fontWeight:600,fontSize:13,cursor:"pointer"}}
                >🗑️ Eliminar ronda</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard — click row to expand scorecard */}
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h2 style={{...S.cardTitle,margin:0}}>Leaderboard</h2>
          <span style={{fontSize:11,color:"#9ca3af"}}>Toca un jugador para ver su scorecard</span>
        </div>
        <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
          <th style={S.th}>#</th><th style={{...S.th,textAlign:"left"}}>Jugador</th><th style={S.th}>HCP</th><th style={S.th}>Golpes</th>
          <th style={{...S.th,color:"#4a6741"}}>Pts Neto</th><th style={S.th}>Pts Gross</th>
          <th style={{...S.th,fontSize:11,color:"#9ca3af"}}>Jugado</th>
          {isAdmin && <th style={{...S.th,fontSize:11,color:"#9ca3af"}}>Cargado</th>}
          {isAdmin && <th style={S.th}></th>}
        </tr></thead><tbody>
          {board.map((e,i) => {
            const isExpanded = expandedPid === e.player.id;
            return (
              <>
                <tr key={e.player.id}
                  style={{...S.tr, cursor:"pointer", backgroundColor: isExpanded ? "#f0f7f0" : "transparent"}}
                  onClick={() => setExpandedPid(isExpanded ? null : e.player.id)}
                >
                  <td style={S.td}><span style={{...S.rank,...(i<3?S["rank"+i]:{})}}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                  </span></td>
                  <td style={{...S.td,textAlign:"left",fontWeight:600,color:isExpanded?"#1a472a":"inherit"}}>
                    <span style={{marginRight:6}}>{isExpanded?"▼":"▶"}</span>{e.player.name}
                  </td>
                  <td style={S.td}>{e.hcp ?? e.player.handicap}</td>
                  <td style={S.td}>{e.totalStrokes}</td>
                  <td style={{...S.td,fontWeight:800,color:"#1a472a",fontSize:16}}>{e.netPts}</td>
                  <td style={S.td}>{e.grossPts}</td>
                  {(() => {
                    const log = round.scores_log?.[e.player.id];
                    const playedDate = log?.playedAt || round.date || null;
                    const isExact = !!log?.playedAt;
                    if (isAdmin && editingPlayedAt === e.player.id) {
                      return (
                        <td style={{...S.td}} onClick={ev => ev.stopPropagation()}>
                          <input
                            type="date"
                            defaultValue={playedDate || ""}
                            autoFocus
                            style={{fontSize:11,border:"1px solid #6b7280",borderRadius:4,padding:"2px 4px",width:120}}
                            onBlur={ev => handleSavePlayedAt(e.player.id, ev.target.value)}
                            onKeyDown={ev => {
                              if (ev.key === "Enter") handleSavePlayedAt(e.player.id, ev.target.value);
                              if (ev.key === "Escape") setEditingPlayedAt(null);
                            }}
                          />
                        </td>
                      );
                    }
                    return (
                      <td
                        style={{...S.td, fontSize:10, color: isExact ? "#6b7280" : "#9ca3af", whiteSpace:"nowrap", cursor: isAdmin ? "pointer" : "default"}}
                        onClick={isAdmin ? ev => { ev.stopPropagation(); setEditingPlayedAt(e.player.id); } : undefined}
                        title={isAdmin ? "Click para editar fecha de juego" : undefined}
                      >
                        {!playedDate ? (isAdmin ? <span style={{color:"#d1d5db"}}>— ✏️</span> : "—") : <>
                          {!isExact && <span title="Fecha de la ronda, no individual">~</span>}
                          {new Date(playedDate).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}
                          {isAdmin && <span style={{marginLeft:3,opacity:0.4,fontSize:9}}>✏️</span>}
                        </>}
                      </td>
                    );
                  })()}
                  {isAdmin && (() => {
                    const log = round.scores_log?.[e.player.id];
                    if (!log) return <td style={{...S.td,fontSize:10,color:"#d1d5db"}}>—</td>;
                    const d = new Date(log.loadedAt);
                    const label = d.toLocaleDateString("es-CL",{day:"numeric",month:"short"});
                    const icon = log.source === "pending" ? "📱" : "⌨️";
                    return <td style={{...S.td,fontSize:10,color:"#6b7280",whiteSpace:"nowrap"}}>{icon} {label}</td>;
                  })()}
                  {isAdmin && (
                    <td style={S.td}>
                      <button
                        onClick={ev => { ev.stopPropagation(); handleDeletePlayer(e.player.id); }}
                        style={{padding:"3px 8px",borderRadius:5,border:"1px solid #fca5a5",backgroundColor:"#fef2f2",color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:600}}
                      >✕</button>
                    </td>
                  )}
                </tr>
                {/* Inline expanded scorecard */}
                {isExpanded && (
                  <EditableScorecard
                    key={`sc-${e.player.id}`}
                    entry={e}
                    isAdmin={isAdmin}
                    round={round}
                    rid={rid}
                    allRounds={allRounds}
                    saveRounds={saveRounds}
                  />
                )}
              </>
            );
          })}
        </tbody></table></div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery photos={photos} loading={photos === null} count={photoCount} players={players} />
    </div>
  );
}

// ======== PHOTO GALLERY ========
function PhotoGallery({ photos, players, loading, count }) {
  const [lightbox, setLightbox] = useState(null); // { src, name }

  if (loading) return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>📷 Fotos de Respaldo{count ? ` (${count})` : ""}</h2>
      <div style={{textAlign:"center",padding:"24px 0",color:"#9ca3af",fontSize:13}}>
        Cargando fotos...
      </div>
    </div>
  );

  if (!photos || photos.length === 0) return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>📷 Fotos de Respaldo</h2>
      <div style={{textAlign:"center",padding:"24px 0",color:"#9ca3af",fontSize:13}}>
        No hay fotos cargadas para esta ronda
      </div>
    </div>
  );

  return (
    <>
      <div style={S.card}>
        <h2 style={S.cardTitle}>📷 Fotos de Respaldo ({photos.length})</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginTop:4}}>
          {photos.map((ph, i) => {
            const names = (ph.players || []).map(pid => players.find(p => p.id === pid)?.name || pid);
            const label = names.join(", ") || "Tarjeta";
            return (
              <div
                key={ph.key || i}
                style={{cursor:"pointer",borderRadius:8,overflow:"hidden",border:"1px solid #e5e7eb",transition:"transform 0.15s, box-shadow 0.15s"}}
                onClick={() => setLightbox({ src: ph.src, name: label })}
                onMouseEnter={e => { e.currentTarget.style.transform="scale(1.02)"; e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="none"; }}
              >
                <img
                  src={ph.src}
                  alt={`Tarjeta ${label}`}
                  loading="lazy"
                  style={{width:"100%",height:130,objectFit:"cover",display:"block"}}
                />
                <div title={label} style={{padding:"6px 8px",backgroundColor:"#f9fafb",fontSize:11,fontWeight:600,color:"#374151",textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>
                  {names.length > 1 && <span style={{color:"#4a6741"}}>👥 </span>}{label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.88)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={() => setLightbox(null)}
        >
          <div style={{position:"relative",maxWidth:"90vw",maxHeight:"90vh"}} onClick={e => e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{color:"#fff",fontWeight:600,fontSize:14}}>📷 {lightbox.name}</span>
              <button
                onClick={() => setLightbox(null)}
                style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:16,fontWeight:700}}
              >
                ✕
              </button>
            </div>
            <img
              src={lightbox.src}
              alt={lightbox.name}
              style={{maxWidth:"90vw",maxHeight:"80vh",objectFit:"contain",borderRadius:10,display:"block"}}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ======== PLAYERS ========
function Players({rankings, nav, year, hcp2026}) {
  return (
    <div style={S.view}>
      <div style={S.hdr}><h1 style={S.title}>Jugadores — {year}</h1></div>
      <div style={S.playerGrid}>
        {rankings.map((p,i) => (
          <div key={p.id} style={S.playerCard} onClick={()=>nav("player-detail",{pid:p.id})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
              <div style={S.avatar}>{p.name.charAt(0)}</div>
              <span style={{fontSize:12,color:"#9ca3af"}}>#{i+1}</span>
            </div>
            <div style={{fontWeight:700,marginTop:8,color:"#1a472a"}}>{p.name}</div>
            <div style={{display:"flex",gap:16,marginTop:8}}>
              <div><div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase"}}>HCP</div><div style={{fontWeight:700,color:"#4a6741"}}>{year >= 2026 ? (hcp2026[p.id]?.inicial ?? p.handicap) : p.handicap}</div></div>
              <div><div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase"}}>Tarjetas</div><div style={{fontWeight:700,color:"#4a6741"}}>{p.tarjetas}</div></div>
              <div><div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase"}}>Pts Neto</div><div style={{fontWeight:700,color:"#4a6741"}}>{p.totalNet}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======== HCP EVOLUTION CARD — always shows full history ========
function HcpEvolutionCard({ history, handicap }) {
  const availYears = [...new Set(history.map(h=>h.year))].sort();
  const lastHcp = history[history.length-1]?.hcp;

  return (
    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <h2 style={{...S.cardTitle,margin:0}}>📉 Evolución del Handicap</h2>
        {availYears.length > 1 && (
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {availYears.map(y => (
              <span key={y} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#6b7280"}}>
                <span style={{width:9,height:9,borderRadius:"50%",
                  backgroundColor:y===2025?"#1a472a":"#2563eb",display:"inline-block"}}/>
                {y}
              </span>
            ))}
          </div>
        )}
      </div>
      <HcpChart history={history} inicial={handicap} />
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:10,alignItems:"flex-end"}}>
        {history.map((h,i) => {
          const isLast = i===history.length-1;
          const is25 = h.year===2025;
          const isIni = h.isInicial || h.roundName?.includes("Inicial");
          return (
            <div key={i} style={{textAlign:"center",padding:"5px 9px",borderRadius:8,minWidth:50,
              backgroundColor: isLast?(is25?"#1a472a":"#1d4ed8"):isIni?"transparent":"#f9fafb",
              border: isLast?"none":isIni?`2px dashed ${is25?"#1a472a":"#2563eb"}`:`1px solid ${is25?"#d1fae5":"#dbeafe"}`}}>
              <div style={{fontSize:9,marginBottom:1,
                color:isLast?"rgba(255,255,255,0.7)":isIni?(is25?"#1a472a":"#2563eb"):(is25?"#6b7280":"#93c5fd"),
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:65}}>
                {isIni ? (h.roundName.includes("2026")?"Ini.2026":"Ini.2025") : h.roundName.split(" - ")[0]}
              </div>
              <div style={{fontSize:15,fontWeight:800,color:isLast?"#fff":isIni?(is25?"#1a472a":"#2563eb"):(is25?"#1a472a":"#1d4ed8")}}>{h.hcp}</div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:11,color:"#9ca3af",marginTop:8}}>
        ◇ HCP Inicial · ● HCP después de cada ronda
        {availYears.length > 1 && " · 🟢 2025 · 🔵 2026"}
        {" · ⭐ último = "}<b>{lastHcp}</b>
      </div>
    </div>
  );
}

// ======== ROUND HISTORY CARD (proper component — useState here, not in IIFE) ========
function RoundHistoryCard({ roundHistory, rounds, pid, p, year, players, hcp2026 }) {
  const [openRound, setOpenRound] = useState(null);
  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>📋 Detalle por Ronda</h2>
      {roundHistory.map((rh, ri) => {
        const r = rounds.find(x=>x.id===rh.rid);
        const holes = r?.scores?.[pid] || [];
        const hcp = year >= 2026 ? calcDynamicHcp(pid, rounds[ri]?.id ?? rounds[0]?.id, rounds, players, hcp2026) : (p.handicap||18);
        const details = holes.map((s,i)=>({
          strokes:s, par:COURSE.pars[i],
          netPts: stablefordNet(s,COURSE.pars[i],hcp,COURSE.handicapIndex[i])
        }));
        const isOpen = openRound === rh.rid;
        const isBest = p.best7Net.includes(rh.netPts);
        return (
          <div key={rh.rid} style={{borderBottom:"1px solid #f3f4f6"}}>
            <div style={{display:"flex",alignItems:"center",padding:"10px 4px",cursor:"pointer",gap:8}}
              onClick={()=>setOpenRound(isOpen?null:rh.rid)}>
              <span style={{fontSize:12,color:"#9ca3af",width:14}}>{isOpen?"▼":"▶"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,color:"#1a472a"}}>{rh.name}</div>
                {(rh.playedAt || rh.loadedAt) && (
                  <div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>
                    {rh.playedAt && <>{!rh.playedExact && <span title="Fecha de la ronda, no individual">~</span>}🗓 jugado {new Date(rh.playedAt).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}</>}
                    {rh.playedAt && rh.loadedAt && <span style={{margin:"0 4px"}}>·</span>}
                    {rh.loadedAt && <>{rh.loadSource==="pending"?"📱":"⌨️"} cargado {new Date(rh.loadedAt).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}</>}
                  </div>
                )}
              </div>
              {isBest && <span style={{fontSize:10,padding:"1px 6px",borderRadius:8,backgroundColor:"#f0f7f0",color:"#1a472a",fontWeight:700}}>⭐ Best</span>}
              <span style={{fontSize:12,color:"#6b7280"}}>{rh.strokes} golpes</span>
              <span style={{fontWeight:800,fontSize:15,color:"#1a472a",minWidth:28,textAlign:"right"}}>{rh.netPts} pts</span>
            </div>
            {isOpen && holes.length > 0 && (
              <div style={{overflowX:"auto",paddingBottom:10,backgroundColor:"#f8fdf8",borderRadius:6,margin:"0 0 4px"}}>
                <table style={{...S.tbl,fontSize:10,minWidth:500}}>
                  <thead><tr>
                    <td style={{...S.tdS,fontWeight:700,color:"#6b7280",width:48,fontSize:10}}>Hoyo</td>
                    {COURSE.pars.map((_,j)=><td key={j} style={{...S.tdS,fontSize:10,color:"#9ca3af"}}>{j+1}</td>)}
                    <td style={{...S.tdS,fontWeight:700,fontSize:10}}>TOT</td>
                  </tr></thead>
                  <tbody>
                    <tr>
                      <td style={{...S.tdS,fontWeight:600,color:"#6b7280",fontSize:10}}>Par</td>
                      {COURSE.pars.map((par,j)=><td key={j} style={{...S.tdS,fontSize:10}}>{par}</td>)}
                      <td style={{...S.tdS,fontWeight:700,fontSize:10}}>{PAR_TOTAL}</td>
                    </tr>
                    <tr>
                      <td style={{...S.tdS,fontWeight:600,color:"#6b7280",fontSize:10}}>Golpes</td>
                      {details.map((d,j)=>(
                        <td key={j} style={{...S.tdS,color:scoreColor(d.strokes,d.par),fontWeight:700,fontSize:11}}>{d.strokes||"-"}</td>
                      ))}
                      <td style={{...S.tdS,fontWeight:700,fontSize:10}}>{rh.strokes}</td>
                    </tr>
                    <tr>
                      <td style={{...S.tdS,fontWeight:600,color:"#6b7280",fontSize:10}}>Neto</td>
                      {details.map((d,j)=>(
                        <td key={j} style={{...S.tdS,fontSize:10,fontWeight:600,
                          color:d.netPts>=2?"#1a472a":d.netPts===1?"#6b7280":"#9ca3af"}}>{d.netPts}</td>
                      ))}
                      <td style={{...S.tdS,fontWeight:800,color:"#1a472a",fontSize:11}}>{rh.netPts}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ======== PLAYER DETAIL ========
function PlayerDetail({pid, rankings, rounds, allRounds, nav, year, hcp2026, players}) {
  const p = rankings.find(x=>x.id===pid);
  if (!p) return <div style={S.empty}>Jugador no encontrado</div>;
  const hcpInicial = year >= 2026 ? (hcp2026[pid]?.inicial ?? p.handicap) : p.handicap;

  // All rounds sorted chronologically across all years
  const allSorted = useMemo(() =>
    [...(allRounds||rounds)].sort((a,b) => new Date(a.date||0)-new Date(b.date||0)),
  [allRounds, rounds]);

  // monthMap helper for 2025 HCP — always uses INIT_DATA (independent of menu year)
  const monthMap = {"Marzo":"Mar","Abril":"Abr","Mayo":"May","Junio":"Jun","Julio":"Jul","Agosto":"Ago","Septiembre":"Sep","Octubre":"Oct","Noviembre":"Nov","Diciembre":"Dic","Adicional 1":"Adic 1","Adicional 2":"Adic 2"};
  const get2025HcpLocal = (roundName) => {
    // Always use hardcoded 2025 data — not affected by menu year selection
    const gb = ANNUAL_2025[pid]?.grossPts || {};
    if (gb[roundName] != null) return 36 - gb[roundName];
    for (const [full,abbr] of Object.entries(monthMap)) {
      if (roundName.includes(full)||roundName.includes(abbr)) { if(gb[abbr]!=null) return 36-gb[abbr]; }
    }
    if (roundName.includes("Adic")) { const n=roundName.includes("2")?"Adic 2":"Adic 1"; if(gb[n]!=null) return 36-gb[n]; }
    return null;
  };

  // Full HCP history across ALL years
  // Full HCP history across ALL years — shows HCP AFTER each round
  const fullHcpHistory = useMemo(() => {
    const history = [];
    const rounds2025 = allSorted.filter(r => roundYear(r) === 2025 && r.scores?.[pid]);
    const rounds2026plus = allSorted.filter(r => roundYear(r) >= 2026);

    // 2025: get2025HcpLocal returns 36-grossPts = HCP AFTER each round ✓
    rounds2025.forEach(r => {
      const hcp = get2025HcpLocal(r.name);
      if (hcp !== null) history.push({ roundName: r.name, hcp, date: r.date, year: 2025 });
    });

    // Add HCP Inicial 2026 as anchor — this is the HCP carried into the 2026 season
    const hcp2026Inicial = hcp2026[pid]?.inicial ?? p.handicap;
    history.push({ roundName: "HCP Inicial 2026", hcp: hcp2026Inicial, date: "2026-01-01", year: 2026, isInicial: true });

    // 2026+: use rIdx+1 to get HCP AFTER each round
    rounds2026plus.forEach((r, rIdx) => {
      if (!r.scores?.[pid]) return;
      const _pd2 = r.scores_log?.[pid]?.playedAt || r.date;
          const _ad2 = new Date(new Date(_pd2).getTime()+86400000).toISOString().slice(0,10);
          const hcp = calcDynamicHcp(pid, "__after__"+_ad2, rounds2026plus, players, hcp2026);
      history.push({ roundName: r.name, hcp, date: r.date, year: roundYear(r) });
    });
    return history;
  }, [allSorted, pid, p, hcp2026, players]);

  // Compute hole-by-hole stats from year rounds
  const stats = useMemo(() => {
    let birdies=0, pars=0, bogeys=0, doubles=0, eagles=0, holesPlayed=0;
    const holeAvg = Array(18).fill(0);
    const holeCounts = Array(18).fill(0);
    const roundHistory = [];
    rounds.forEach((r, rIdx) => {
      if (!r.scores?.[pid]) return;
      const holes = r.scores[pid];
      const hcp = year >= 2026 ? calcDynamicHcp(pid, r.id, rounds, players, hcp2026) : (p.handicap || 18);
      let rNet=0, rGross=0, rStrokes=0;
      holes.forEach((s,i) => {
        if (s > 0) {
          rNet += stablefordNet(s, COURSE.pars[i], hcp, COURSE.handicapIndex[i]);
          rGross += stablefordGross(s, COURSE.pars[i]);
          rStrokes += s; holesPlayed++;
          holeAvg[i] += s; holeCounts[i]++;
          const d = s - COURSE.pars[i];
          if (d <= -2) eagles++;
          else if (d === -1) birdies++;
          else if (d === 0) pars++;
          else if (d === 1) bogeys++;
          else doubles++;
        }
      });
      roundHistory.push({date:r.date, name:r.name, netPts:rNet, grossPts:rGross, strokes:rStrokes, rid:r.id, playedAt:r.scores_log?.[pid]?.playedAt || r.date, playedExact:!!r.scores_log?.[pid]?.playedAt, loadedAt:r.scores_log?.[pid]?.loadedAt, loadSource:r.scores_log?.[pid]?.source});
    });
    // Sort by individual played date so Adicional appears in correct chronological position
    roundHistory.sort((a, b) => new Date(a.playedAt) - new Date(b.playedAt));
    return {birdies, pars, bogeys, doubles, eagles, holesPlayed,
      holeAverages: holeAvg.map((s,i) => holeCounts[i] ? s/holeCounts[i] : 0),
      roundHistory};
  }, [pid, p, rounds]);

  const months = Object.keys(p.netByMonth || {});
  const maxAvg = Math.max(...stats.holeAverages.filter(Boolean), 1);

  return (
    <div style={S.view}>
      <button style={S.back} onClick={()=>nav("players")}>← Jugadores</button>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
        <div style={{...S.avatar,width:56,height:56,fontSize:24}}>{p.name.charAt(0)}</div>
        <div>
          <h1 style={{...S.title,margin:0}}>{p.name}</h1>
          <p style={{...S.sub,margin:"4px 0 0"}}>
            HCP Inicial {hcpInicial}
            {p.currentHcp != null && p.currentHcp !== hcpInicial && (
              <span style={{marginLeft:8,padding:"2px 8px",borderRadius:10,backgroundColor:"#fef3c7",color:"#92400e",fontWeight:700,fontSize:12}}>
                HCP Actual ★ {p.currentHcp}
              </span>
            )}
            {p.currentHcp != null && p.currentHcp === hcpInicial && (
              <span style={{marginLeft:8,padding:"2px 8px",borderRadius:10,backgroundColor:"#f0f7f0",color:"#1a472a",fontWeight:700,fontSize:12}}>
                HCP Actual ★ {p.currentHcp}
              </span>
            )}
            {" · "}{p.tarjetas} tarjetas · Ranking #{rankings.indexOf(p)+1}
          </p>
        </div>
      </div>

      <div style={S.grid4}>
        <div style={S.kpi}><div style={S.kpiVal}>{p.totalNet}</div><div style={S.kpiLbl}>{p.tarjetas >= 7 ? "Best 7 Neto" : "Total Neto"}</div></div>
        <div style={S.kpi}><div style={S.kpiVal}>{p.totalGross}</div><div style={S.kpiLbl}>{p.tarjetas >= 7 ? "Best 7 Gross" : "Total Gross"}</div></div>
        <div style={S.kpi}><div style={S.kpiVal}>{p.avgNet?.toFixed(1)}</div><div style={S.kpiLbl}>Prom Neto</div></div>
        <div style={S.kpi}><div style={{...S.kpiVal,color:"#b8860b"}}>{p.currentHcp ?? hcpInicial}</div><div style={S.kpiLbl}>HCP Actual ★</div></div>
      </div>

      {/* HCP Evolution — proper subcomponent to avoid hooks-in-IIFE bug */}
      {fullHcpHistory.length > 0 && (
        <HcpEvolutionCard history={fullHcpHistory} handicap={p.handicap} />
      )}

      {/* Monthly breakdown */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Puntos por Mes</h2>
        <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
          <th style={{...S.th,textAlign:"left"}}>Mes</th><th style={S.th}>Golpes</th><th style={S.th}>Gross</th><th style={{...S.th,color:"#1a472a"}}>Neto</th>
        </tr></thead><tbody>
          {months.map(m => {
            const s = p.strokesByMonth[m];
            const g = p.grossByMonth[m];
            const n = p.netByMonth[m];
            if (!s && !g && !n) return null;
            const isBest = n && p.best7Net.includes(n);
            return (
              <tr key={m} style={{...S.tr, backgroundColor: isBest ? "#f0f7f0" : "transparent"}}>
                <td style={{...S.td,textAlign:"left",fontWeight:500}}>{m} {isBest ? "⭐" : ""}</td>
                <td style={S.td}>{s||"-"}</td>
                <td style={S.td}>{g||"-"}</td>
                <td style={{...S.td,fontWeight:isBest?800:500,color:isBest?"#1a472a":"#4a6741"}}>{n||"-"}</td>
              </tr>
            );
          }).filter(Boolean)}
          <tr style={{...S.tr,fontWeight:700,backgroundColor:"#e8f5e8"}}>
            <td style={{...S.td,textAlign:"left"}}>BEST 7</td>
            <td style={S.td}>-</td>
            <td style={S.td}>{p.totalGross}</td>
            <td style={{...S.td,color:"#1a472a",fontSize:16}}>{p.totalNet}</td>
          </tr>
          <tr style={{...S.tr,fontWeight:600}}>
            <td style={{...S.td,textAlign:"left",color:"#6b7280"}}>Total ({p.tarjetas} tarj.)</td>
            <td style={{...S.td,color:"#6b7280"}}>{Object.values(p.strokesByMonth).reduce((a,b)=>a+b,0)}</td>
            <td style={{...S.td,color:"#6b7280"}}>{p.totalGrossAll}</td>
            <td style={{...S.td,color:"#6b7280"}}>{p.totalNetAll}</td>
          </tr>
        </tbody></table></div>
      </div>

      {/* Round by Round detail */}
      {stats.roundHistory.length > 0 && (
        <RoundHistoryCard roundHistory={stats.roundHistory} rounds={rounds} pid={pid} p={p} year={year} players={players} hcp2026={hcp2026} />
      )}

      {/* Score Distribution */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Distribución de Scores</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          {[{l:"Eagle+",c:stats.eagles,clr:"#eab308"},{l:"Birdie",c:stats.birdies,clr:"#22c55e"},{l:"Par",c:stats.pars,clr:"#94a3b8"},{l:"Bogey",c:stats.bogeys,clr:"#3b82f6"},{l:"Dbl+",c:stats.doubles,clr:"#ef4444"}].map(x=>(
            <div key={x.l} style={{textAlign:"center",padding:"12px 16px",minWidth:65,backgroundColor:"#f9fafb",borderRadius:10}}>
              <div style={{width:12,height:12,borderRadius:"50%",backgroundColor:x.clr,margin:"0 auto 6px"}}></div>
              <div style={{fontSize:22,fontWeight:800}}>{x.c}</div>
              <div style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{x.l}</div>
              <div style={{fontSize:10,color:"#9ca3af"}}>{stats.holesPlayed?((x.c/stats.holesPlayed)*100).toFixed(0)+"%":"-"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hole Averages */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Promedio por Hoyo (Golpes)</h2>
        <div style={{display:"flex",gap:3,alignItems:"flex-end",height:140}}>
          {stats.holeAverages.map((avg,i) => (
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end"}}>
              <div style={{fontSize:9,color:"#6b7280",marginBottom:3,fontWeight:600}}>{avg>0?avg.toFixed(1):"-"}</div>
              <div style={{width:"100%",maxWidth:24,borderRadius:"3px 3px 0 0",backgroundColor:scoreColor(Math.round(avg),COURSE.pars[i]),height:avg>0?`${(avg/(maxAvg+1))*100}%`:"0%",minHeight:2,transition:"height 0.3s"}}></div>
              <div style={{fontSize:10,fontWeight:700,marginTop:4,color:"#374151"}}>{i+1}</div>
              <div style={{fontSize:8,color:"#9ca3af"}}>P{COURSE.pars[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ======== COMPARE ========
function Compare({rankings, cmpIds, setCmpIds, rounds, allRounds, players, hcp2026}) {
  const colors = ["#22c55e","#3b82f6","#eab308","#ef4444"];
  const toggle = pid => {
    if (cmpIds.includes(pid)) setCmpIds(cmpIds.filter(x=>x!==pid));
    else if (cmpIds.length < 4) setCmpIds([...cmpIds, pid]);
  };

  // Sorted rounds for charts
  const sortedRounds = useMemo(() =>
    [...rounds].sort((a,b) => new Date(a.date||0)-new Date(b.date||0)),
  [rounds]);

  // All rounds sorted for full HCP history
  const allSorted = useMemo(() =>
    [...(allRounds||rounds)].sort((a,b) => new Date(a.date||0)-new Date(b.date||0)),
  [allRounds, rounds]);

  const monthMap = {"Marzo":"Mar","Abril":"Abr","Mayo":"May","Junio":"Jun","Julio":"Jul","Agosto":"Ago","Septiembre":"Sep","Octubre":"Oct","Noviembre":"Nov","Diciembre":"Dic","Adicional 1":"Adic 1","Adicional 2":"Adic 2"};

  const compared = useMemo(() => cmpIds.map((pid,ci) => {
    const p = rankings.find(x=>x.id===pid);
    if (!p) return null;
    // Hole averages
    const holeAvg = Array(18).fill(0);
    const holeCounts = Array(18).fill(0);
    rounds.forEach(r => {
      if (!r.scores?.[pid]) return;
      r.scores[pid].forEach((s,i) => { if (s>0) { holeAvg[i]+=s; holeCounts[i]++; } });
    });

    // Accumulated net points per round (chronological)
    let cumPts = 0;
    const ptsPerRound = sortedRounds
      .filter(r => r.scores?.[pid])
      .map(r => {
        let net = 0;
        const rIdx = sortedRounds.indexOf(r);
        const hcp = roundYear(r) >= 2026
          ? calcDynamicHcp(pid, r.id, sortedRounds.filter(x=>roundYear(x)>=2026), players, hcp2026)
          : (p.handicap||18);
        r.scores[pid].forEach((s,i) => { net += stablefordNet(s, COURSE.pars[i], hcp, COURSE.handicapIndex[i]); });
        cumPts += net;
        return { roundName: r.name, pts: net, cumPts };
      });

    // Full HCP history across all years
    const hcpHistory = [];
    const r2025 = allSorted.filter(r => roundYear(r)===2025 && r.scores?.[pid]);
    const r2026 = allSorted.filter(r => roundYear(r)>=2026);
    r2025.forEach(r => {
      const gb = p.grossByMonth||{};
      let hcp = null;
      if (gb[r.name]!=null) hcp = 36-gb[r.name];
      else for (const [full,abbr] of Object.entries(monthMap)) {
        if ((r.name.includes(full)||r.name.includes(abbr)) && gb[abbr]!=null) { hcp=36-gb[abbr]; break; }
      }
      if (hcp!==null) hcpHistory.push({roundName:r.name, hcp});
    });
    r2026.forEach((r,rIdx) => {
      if (!r.scores?.[pid]) return;
      hcpHistory.push({roundName:r.name, hcp:calcDynamicHcp(pid,r.id,r2026,players,hcp2026)});
    });

    return {...p, color:colors[ci], holeAverages:holeAvg.map((s,i)=>holeCounts[i]?s/holeCounts[i]:0), ptsPerRound, hcpHistory};
  }).filter(Boolean), [cmpIds, rankings, rounds, sortedRounds, allSorted, players, hcp2026]);

  // All round labels for points chart
  const allRoundLabels = useMemo(() =>
    sortedRounds.map(r => r.name.split(" - ")[0]),
  [sortedRounds]);

  // SVG points chart
  const PointsChart = () => {
    if (!compared.length || !sortedRounds.length) return null;
    const W=500, H=120, PAD=10;
    const maxPts = Math.max(...compared.flatMap(c=>c.ptsPerRound.map(x=>x.cumPts)), 1);
    const xStep = (W-PAD*2) / Math.max(sortedRounds.length-1, 1);
    const yScale = v => PAD + ((maxPts-v)/(maxPts||1))*(H-PAD*2);
    return (
      <div style={{overflowX:"auto"}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",minWidth:320,height:H}}>
          {compared.map(c => {
            const pts = c.ptsPerRound;
            if (!pts.length) return null;
            const points = pts.map(({roundName, cumPts}) => {
              const rIdx = sortedRounds.findIndex(r=>r.name===roundName);
              return `${PAD+rIdx*xStep},${yScale(cumPts)}`;
            }).join(" ");
            return (
              <g key={c.id}>
                <polyline points={points} fill="none" stroke={c.color} strokeWidth="2" strokeLinejoin="round" />
                {pts.map(({roundName,cumPts},i) => {
                  const rIdx = sortedRounds.findIndex(r=>r.name===roundName);
                  const isLast = i===pts.length-1;
                  return (
                    <g key={i}>
                      <circle cx={PAD+rIdx*xStep} cy={yScale(cumPts)} r={isLast?5:3} fill={c.color} stroke="#fff" strokeWidth="1.5"/>
                      {isLast && <text x={PAD+rIdx*xStep+6} y={yScale(cumPts)+4} fontSize="9" fill={c.color} fontWeight="bold">{cumPts}</text>}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {/* X axis labels */}
          {sortedRounds.map((r,i) => (
            <text key={i} x={PAD+i*xStep} y={H-1} textAnchor="middle" fontSize="8" fill="#9ca3af">
              {r.name.split(" - ")[0]}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  // SVG HCP chart for compare
  const HcpCompareChart = () => {
    if (!compared.length) return null;
    const allHcps = compared.flatMap(c=>c.hcpHistory.map(h=>h.hcp));
    if (!allHcps.length) return null;
    const W=500, H=100, PAD=10;
    const allLabels = [...new Set(compared.flatMap(c=>c.hcpHistory.map(h=>h.roundName)))];
    const min=Math.max(0,Math.min(...allHcps)-2), max=Math.max(...allHcps)+2;
    const xStep=(W-PAD*2)/Math.max(allLabels.length-1,1);
    const yScale=v=>PAD+((max-v)/(max-min||1))*(H-PAD*2);
    return (
      <div style={{overflowX:"auto"}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",minWidth:320,height:H}}>
          {compared.map(c => {
            if (!c.hcpHistory.length) return null;
            const pts = c.hcpHistory.map(({roundName,hcp})=>{
              const idx=allLabels.indexOf(roundName);
              return `${PAD+idx*xStep},${yScale(hcp)}`;
            }).join(" ");
            return (
              <g key={c.id}>
                <polyline points={pts} fill="none" stroke={c.color} strokeWidth="2" strokeLinejoin="round"/>
                {c.hcpHistory.map(({roundName,hcp},i)=>{
                  const idx=allLabels.indexOf(roundName);
                  const isLast=i===c.hcpHistory.length-1;
                  return (
                    <g key={i}>
                      <circle cx={PAD+idx*xStep} cy={yScale(hcp)} r={isLast?5:3} fill={c.color} stroke="#fff" strokeWidth="1.5"/>
                      {isLast && <text x={PAD+idx*xStep+6} y={yScale(hcp)+4} fontSize="9" fill={c.color} fontWeight="bold">{hcp}</text>}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {allLabels.map((l,i)=>(
            <text key={i} x={PAD+i*xStep} y={H-1} textAnchor="middle" fontSize="8" fill="#9ca3af">
              {l.split(" - ")[0]}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div style={S.view}>
      <div style={S.hdr}><h1 style={S.title}>Comparar Jugadores</h1><p style={S.sub}>Selecciona hasta 4</p></div>
      <div style={S.card}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {rankings.map(p => {
            const idx = cmpIds.indexOf(p.id);
            const sel = idx >= 0;
            return <button key={p.id} style={{...S.chip,...(sel?{backgroundColor:colors[idx],color:"#fff",borderColor:colors[idx]}:{})}} onClick={()=>toggle(p.id)}>{p.name}</button>;
          })}
        </div>
      </div>

      {compared.length >= 2 && (
        <>
          {/* Points accumulated per round */}
          <div style={S.card}>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
              <h2 style={{...S.cardTitle,margin:0}}>📈 Puntos Netos Acumulados por Ronda</h2>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {compared.map(c=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}>
                    <div style={{width:12,height:3,borderRadius:2,backgroundColor:c.color}}/>
                    <span style={{color:c.color,fontWeight:600}}>{c.name.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            <PointsChart />
          </div>

          {/* HCP evolution comparison */}
          <div style={S.card}>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
              <h2 style={{...S.cardTitle,margin:0}}>📉 Evolución HCP</h2>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {compared.map(c=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}>
                    <div style={{width:12,height:3,borderRadius:2,backgroundColor:c.color}}/>
                    <span style={{color:c.color,fontWeight:600}}>{c.name.split(" ")[0]}: {c.hcpHistory[c.hcpHistory.length-1]?.hcp ?? c.handicap}</span>
                  </div>
                ))}
              </div>
            </div>
            <HcpCompareChart />
          </div>

          {/* Stats table */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>Estadísticas</h2>
            <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
              <th style={{...S.th,textAlign:"left"}}>Métrica</th>
              {compared.map(c=><th key={c.id} style={{...S.th,color:c.color}}>{c.name.split(" ")[0]}</th>)}
            </tr></thead><tbody>
              {[
                {l:"HCP Actual★",f:c=>c.currentHcp??c.handicap},
                {l:"Tarjetas",f:c=>c.tarjetas},
                {l:"Pts Ranking",f:c=>c.totalNet},
                {l:"Prom Neto",f:c=>c.avgNet?.toFixed(1)},
                {l:"Prom Gross",f:c=>c.avgGross?.toFixed(1)},
              ].map(row=>(
                <tr key={row.l} style={S.tr}><td style={{...S.td,textAlign:"left",fontWeight:600}}>{row.l}</td>{compared.map(c=><td key={c.id} style={S.td}>{row.f(c)}</td>)}</tr>
              ))}
            </tbody></table></div>
          </div>

          {/* Hole averages table */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>Promedio por Hoyo</h2>
            <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
              <th style={S.thS}>Hoyo</th><th style={S.thS}>Par</th>
              {compared.map(c=><th key={c.id} style={{...S.thS,color:c.color}}>{c.name.split(" ")[0]}</th>)}
            </tr></thead><tbody>
              {Array.from({length:18},(_,i)=>(
                <tr key={i} style={S.tr}>
                  <td style={{...S.tdS,fontWeight:600}}>{i+1}</td>
                  <td style={S.tdS}>{COURSE.pars[i]}</td>
                  {compared.map(c=><td key={c.id} style={{...S.tdS,fontWeight:600,color:scoreColor(Math.round(c.holeAverages[i]),COURSE.pars[i])}}>{c.holeAverages[i]>0?c.holeAverages[i].toFixed(1):"-"}</td>)}
                </tr>
              ))}
            </tbody></table></div>
          </div>
        </>
      )}
    </div>
  );
}

// ======== UPLOAD ========
// Compress photo for DISPLAY (preview while entering scores)
function compressPhoto(file, maxDim = 900, quality = 0.65) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Compress photo for FIREBASE STORAGE — legible scorecard, ~120-150KB
function compressPhotoForDB(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = dataUrl;
  });
}

// ======== PLAYER PHOTO UPLOAD (jugadores) ========
function PlayerPhotoUpload({ players, addPendingRequest }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], name: "", playerId: "" });
  const [photo, setPhoto] = useState(null);
  const [sent, setSent] = useState(false);

  const handlePhoto = async f => {
    if (!f?.type?.startsWith("image/")) return;
    const compressed = await compressPhoto(f);
    setPhoto(compressed);
  };

  const submit = async () => {
    if (!form.playerId || !form.name || !form.date || !photo) return;
    // Compress further for Firebase storage (~10-20KB)
    const photoForDB = await compressPhotoForDB(photo);
    const newEntry = {
      id: "req" + Date.now(),
      roundName: form.name,
      date: form.date,
      playerId: form.playerId,
      playerName: players.find(p => p.id === form.playerId)?.name || form.playerId,
      photo: photoForDB,
      submittedAt: new Date().toISOString(),
      status: "pending"
    };
    await addPendingRequest(newEntry);
    setSent(true);
    setForm({ date: new Date().toISOString().split("T")[0], name: "", playerId: "" });
    setPhoto(null);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div style={S.view}>
      <div style={S.hdr}>
        <h1 style={S.title}>Subir Foto de Tarjeta</h1>
        <p style={S.sub}>Sube una foto de tu scorecard — el admin validará e ingresará los datos</p>
      </div>

      {sent && (
        <div style={{backgroundColor:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"14px 18px",marginBottom:16,textAlign:"center"}}>
          <span style={{color:"#065f46",fontWeight:600,fontSize:14}}>✅ Foto enviada correctamente — el admin la revisará pronto</span>
        </div>
      )}

      <div style={S.card}>
        <h2 style={S.cardTitle}>Datos de la Ronda</h2>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          <div style={{flex:1,minWidth:180}}>
            <label style={S.label}>Ronda</label>
            <select style={S.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}>
              <option value="">Seleccionar ronda...</option>
              {ROUND_NAMES.map(rn => <option key={rn} value={rn}>{rn}</option>)}
            </select>
          </div>
          <div style={{flex:1,minWidth:150}}>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
          </div>
          <div style={{flex:1,minWidth:180}}>
            <label style={S.label}>Jugador</label>
            <select style={S.input} value={form.playerId} onChange={e=>setForm({...form,playerId:e.target.value})}>
              <option value="">Seleccionar...</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.cardTitle}>📷 Foto de la Tarjeta <span style={{color:"#ef4444",fontSize:12}}>*obligatoria</span></h2>
        {photo ? (
          <div style={{textAlign:"center"}}>
            <img src={photo} alt="Tarjeta" style={{maxWidth:"100%",maxHeight:300,borderRadius:10,border:"1px solid #e5e7eb"}} />
            <button style={{...S.btn,...S.btnS,marginTop:10,fontSize:12,padding:"8px 16px"}} onClick={()=>setPhoto(null)}>✕ Quitar foto</button>
          </div>
        ) : (
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <label style={{flex:1,minWidth:130,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"20px 12px",borderRadius:10,border:"2px dashed #86efac",backgroundColor:"#f0fdf4",cursor:"pointer",textAlign:"center"}}>
              <span style={{fontSize:32}}>📷</span>
              <span style={{fontSize:13,fontWeight:600,color:"#1a472a"}}>Sacar foto</span>
              <span style={{fontSize:11,color:"#6b7280"}}>Cámara del celular</span>
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handlePhoto(e.target.files[0])} />
            </label>
            <label style={{flex:1,minWidth:130,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"20px 12px",borderRadius:10,border:"2px dashed #d1d5db",backgroundColor:"#f9fafb",cursor:"pointer",textAlign:"center"}}>
              <span style={{fontSize:32}}>🖼️</span>
              <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>Desde galería</span>
              <span style={{fontSize:11,color:"#6b7280"}}>Elegir archivo</span>
              <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handlePhoto(e.target.files[0])} />
            </label>
          </div>
        )}
      </div>

      <button
        style={{...S.btn,...S.btnP,width:"100%",padding:"14px 24px",fontSize:15,
          opacity:(!form.name||!form.playerId||!form.date||!photo)?0.4:1}}
        onClick={submit}
        disabled={!form.name||!form.playerId||!form.date||!photo}
      >
        📤 Enviar al Admin
      </button>
    </div>
  );
}

// ======== CARGAR RONDA ========
const ROUND_NAMES = [
  "T1 - Marzo","T2 - Abril","T3 - Mayo","T4 - Junio","T5 - Julio",
  "T6 - Agosto","T7 - Septiembre","T8 - Octubre","T9 - Noviembre","T10 - Diciembre",
  "Adicional 1","Adicional 2"
];

function ManualEntry({players, allRounds, yearRounds, saveRounds, nav, pending, removePendingRequest, photoIndex}) {
  const [meta, setMeta] = useState({date: new Date().toISOString().split("T")[0], name: ""});
  const [selected, setSelected] = useState([]);          // playerIds en la tarjeta, en orden
  const [grid, setGrid] = useState({});                  // { [playerId]: string[18] }
  const [photo, setPhoto] = useState(null);
  const [overwriteOk, setOverwriteOk] = useState({});    // { [playerId]: true } sobrescritura confirmada
  const [saved, setSaved] = useState(null);              // texto de confirmación
  const [saving, setSaving] = useState(false);
  const [previewReq, setPreviewReq] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [activeReqId, setActiveReqId] = useState(null);

  const emptyScores = () => Array(18).fill("");

  const togglePlayer = (pid) => {
    setSelected(prev => {
      if (prev.includes(pid)) {
        setGrid(g => { const {[pid]:_, ...rest} = g; return rest; });
        setOverwriteOk(o => { const {[pid]:_, ...rest} = o; return rest; });
        return prev.filter(x => x !== pid);
      }
      setGrid(g => ({...g, [pid]: emptyScores()}));
      return [...prev, pid];
    });
  };

  const setCell = (pid, hole, val) => {
    setGrid(g => {
      const row = [...(g[pid] || emptyScores())];
      row[hole] = val;
      return {...g, [pid]: row};
    });
  };

  const approveRequest = (req) => {
    // Pre-llena la tarjeta pero NO saca la solicitud de pendientes hasta guardar
    setMeta({ date: req.date, name: req.roundName });
    setSelected([req.playerId]);
    setGrid({ [req.playerId]: emptyScores() });
    setOverwriteOk({});
    setPhoto(req.photo);
    setActiveReqId(req.id);
    setPreviewReq(null);
    window.scrollTo(0, 0);
  };

  const rejectRequest = (req) => {
    if (!confirm(`¿Rechazar la solicitud de ${req.playerName} para ${req.roundName}?`)) return;
    removePendingRequest(req.id);
    if (previewReq?.id === req.id) setPreviewReq(null);
    if (activeReqId === req.id) { setActiveReqId(null); setPhoto(null); }
  };

  // Jugadores ya cargados por ronda (del año en curso)
  const roundPlayerCounts = useMemo(() => {
    const counts = {};
    yearRounds.forEach(r => { if (r.scores) counts[r.name] = Object.keys(r.scores).length; });
    return counts;
  }, [yearRounds]);

  const currentRound = useMemo(() => yearRounds.find(r => r.name === meta.name), [yearRounds, meta.name]);
  const playersInRound = useMemo(() => currentRound?.scores ? Object.keys(currentRound.scores) : [], [currentRound]);

  // ===== DETECCIÓN DE DUPLICADOS =====
  // (a) el jugador ya tiene tarjeta en ESTA ronda → sobrescribiría sus datos
  const dupInRound = useMemo(() => selected.filter(pid => playersInRound.includes(pid)), [selected, playersInRound]);

  // (b) el jugador ya tiene una tarjeta cargada con esta MISMA fecha en otra ronda
  const dupSameDate = useMemo(() => {
    if (!meta.date) return [];
    return selected.filter(pid => allRounds.some(r =>
      r.name !== meta.name &&
      r.scores?.[pid] &&
      ((r.scores_log?.[pid]?.playedAt || r.date) === meta.date)
    ));
  }, [selected, allRounds, meta.date, meta.name]);

  // Slots "Adicional" libres para TODOS los duplicados
  const freeAdicional = useMemo(() => {
    return ROUND_NAMES.filter(rn => rn.startsWith("Adicional")).filter(rn => {
      const r = yearRounds.find(x => x.name === rn);
      const taken = r?.scores ? Object.keys(r.scores) : [];
      return !dupInRound.some(pid => taken.includes(pid));
    });
  }, [yearRounds, dupInRound]);

  const blockingDupes = dupInRound.filter(pid => !overwriteOk[pid]);
  const nameOf = (pid) => players.find(p => p.id === pid)?.name || pid;

  const handlePhoto = async f => {
    if (!f?.type?.startsWith("image/")) return;
    const compressed = await compressPhoto(f);
    setPhoto(compressed);
  };

  // Jugadores con al menos un score ingresado
  const filledPlayers = selected.filter(pid => (grid[pid] || []).some(v => v !== "" && parseInt(v) > 0));

  const canSave = !!meta.name && !!meta.date && filledPlayers.length > 0 && blockingDupes.length === 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const loadedAt = new Date().toISOString();
      const logEntry = { playedAt: meta.date, loadedAt, source: activeReqId ? "pending" : "admin" };

      const newScores = {};
      const newLogs = {};
      filledPlayers.forEach(pid => {
        newScores[pid] = (grid[pid] || emptyScores()).map(v => parseInt(v) || 0);
        newLogs[pid] = logEntry;
      });

      let roundId;
      let updatedRounds;
      const existing = yearRounds.find(r => r.name === meta.name);
      if (existing) {
        roundId = existing.id;
        updatedRounds = allRounds.map(r => r.id === existing.id ? {
          ...r,
          date: meta.date,
          scores: {...r.scores, ...newScores},
          scores_log: {...(r.scores_log || {}), ...newLogs},
        } : r);
      } else {
        roundId = "r" + Date.now();
        updatedRounds = [...allRounds, {
          id: roundId, name: meta.name, date: meta.date,
          scores: newScores, scores_log: newLogs,
        }];
      }

      await saveRounds(updatedRounds);

      // Una sola foto para toda la tarjeta — no se duplica la imagen por jugador
      if (photo) {
        const photoForDB = await compressPhotoForDB(photo);
        await fbSaveCardPhoto(roundId, filledPlayers, photoForDB);
      }

      if (activeReqId) { await removePendingRequest(activeReqId); setActiveReqId(null); }

      setSaved(`${filledPlayers.length} jugador${filledPlayers.length > 1 ? "es" : ""} guardado${filledPlayers.length > 1 ? "s" : ""} en ${meta.name}`);
      setTimeout(() => setSaved(null), 3500);
      setSelected([]); setGrid({}); setOverwriteOk({}); setPhoto(null);
    } finally {
      setSaving(false);
    }
  };

  const colTotal = (pid) => (grid[pid] || []).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
  const colGross = (pid) => (grid[pid] || []).reduce((sum, v, i) => sum + stablefordGross(parseInt(v) || 0, COURSE.pars[i]), 0);
  const colVsPar = (pid) => (grid[pid] || []).reduce((sum, v, i) => sum + (v ? (parseInt(v) - COURSE.pars[i]) : 0), 0);

  return (
    <div style={S.view}>
      {lightboxSrc && (
        <div onClick={()=>setLightboxSrc(null)}
          style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.92)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,cursor:"zoom-out"}}>
          <img src={lightboxSrc} alt="Tarjeta" style={{maxWidth:"100%",maxHeight:"92vh",borderRadius:8,boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}} />
          <button onClick={()=>setLightboxSrc(null)} style={{position:"absolute",top:16,right:20,background:"none",border:"none",color:"#fff",fontSize:28,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>
      )}

      <div style={S.hdr}>
        <h1 style={S.title}>Cargar Ronda</h1>
        <p style={S.sub}>Selecciona todos los jugadores de la tarjeta e ingresa sus scores de una vez</p>
      </div>

      {/* Solicitudes pendientes */}
      {pending.length > 0 && (
        <div style={{...S.card,borderLeft:"4px solid #ef4444",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h2 style={{...S.cardTitle,margin:0,color:"#dc2626"}}>📬 Solicitudes Pendientes ({pending.length})</h2>
            <span style={{fontSize:11,color:"#6b7280"}}>Toca una para ver la foto y cargar la ronda</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {pending.map(req => (
              <div key={req.id} style={{
                padding:"12px 14px",borderRadius:8,border: activeReqId===req.id ? "2px solid #1a472a" : "1px solid #fca5a5",
                backgroundColor: activeReqId===req.id ? "#f0f7f0" : previewReq?.id===req.id?"#fef2f2":"#fff", cursor:"pointer"
              }} onClick={()=>setPreviewReq(previewReq?.id===req.id?null:req)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div>
                    {activeReqId===req.id && <span style={{fontSize:10,padding:"1px 7px",borderRadius:8,backgroundColor:"#1a472a",color:"#fff",fontWeight:700,marginRight:6}}>✏️ En curso</span>}
                    <span style={{fontWeight:700,color:"#1a472a",fontSize:14}}>{req.playerName}</span>
                    <span style={{color:"#6b7280",fontSize:12,marginLeft:8}}>{req.roundName}</span>
                    <span style={{color:"#9ca3af",fontSize:11,marginLeft:8}}>{req.date ? new Date(req.date).toLocaleDateString("es-CL",{day:"numeric",month:"short"}) : ""}</span>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={e=>{e.stopPropagation();approveRequest(req);}}
                      style={{padding:"5px 12px",borderRadius:6,border:"none",backgroundColor:"#1a472a",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Cargar</button>
                    <button onClick={e=>{e.stopPropagation();rejectRequest(req);}}
                      style={{padding:"5px 10px",borderRadius:6,border:"1px solid #fca5a5",backgroundColor:"#fef2f2",color:"#dc2626",fontSize:12,cursor:"pointer"}}>✕</button>
                  </div>
                </div>
                {previewReq?.id===req.id && req.photo && (
                  <div style={{marginTop:10,textAlign:"center"}}>
                    <img src={req.photo} alt="Tarjeta" onClick={e=>{e.stopPropagation();setLightboxSrc(req.photo);}}
                      style={{maxWidth:"100%",maxHeight:320,borderRadius:8,border:"1px solid #e5e7eb",cursor:"zoom-in"}} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {saved && (
        <div style={{backgroundColor:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"12px 16px",marginBottom:16,textAlign:"center"}}>
          <span style={{color:"#065f46",fontWeight:600}}>✅ {saved}</span>
        </div>
      )}

      {/* Ronda + fecha */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Datos de la Ronda</h2>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          <div style={{flex:1,minWidth:200}}>
            <label style={S.label}>Ronda</label>
            <select style={S.input} value={meta.name} onChange={e=>setMeta({...meta,name:e.target.value})}>
              <option value="">Seleccionar ronda...</option>
              {ROUND_NAMES.map(rn => {
                const count = roundPlayerCounts[rn] || 0;
                return <option key={rn} value={rn}>{rn}{count > 0 ? ` (${count} jugadores)` : ""}</option>;
              })}
            </select>
          </div>
          <div style={{flex:1,minWidth:160}}>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={meta.date} onChange={e=>setMeta({...meta,date:e.target.value})} />
          </div>
        </div>

        {meta.name && playersInRound.length > 0 && (
          <div style={{padding:"10px 14px",backgroundColor:"#f0f7f0",borderRadius:8,fontSize:12}}>
            <span style={{fontWeight:600,color:"#1a472a"}}>Ya cargados en {meta.name}:</span>{" "}
            {playersInRound.map(pid => nameOf(pid)).join(", ")}
          </div>
        )}
      </div>

      {/* Selección de jugadores */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Jugadores de la tarjeta {selected.length > 0 && <span style={{color:"#4a6741",fontWeight:600,fontSize:13}}>· {selected.length} seleccionado{selected.length>1?"s":""}</span>}</h2>
        <p style={{...S.sub,marginTop:0,marginBottom:10,fontSize:12}}>Toca los jugadores que comparten esta tarjeta. Se cargan todos juntos.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {players.map(p => {
            const isSel = selected.includes(p.id);
            const already = playersInRound.includes(p.id);
            return (
              <button key={p.id} onClick={()=>togglePlayer(p.id)}
                style={{
                  padding:"7px 12px",borderRadius:16,fontSize:12,cursor:"pointer",minHeight:36,
                  fontWeight: isSel ? 700 : 500,
                  border: isSel ? "2px solid #1a472a" : already ? "1px solid #fbbf24" : "1px solid #d1d5db",
                  backgroundColor: isSel ? "#1a472a" : already ? "#fffbeb" : "#fff",
                  color: isSel ? "#fff" : already ? "#92400e" : "#374151",
                }}>
                {isSel ? "✓ " : ""}{p.name}{already ? " ⚠️" : ""}
              </button>
            );
          })}
        </div>
        {meta.name && playersInRound.length > 0 && (
          <div style={{fontSize:11,color:"#92400e",marginTop:10}}>⚠️ = ya tiene tarjeta cargada en {meta.name}</div>
        )}
      </div>

      {/* WARNING DE DUPLICADOS */}
      {dupInRound.length > 0 && (
        <div style={{...S.card,borderLeft:"4px solid #dc2626",backgroundColor:"#fef2f2"}}>
          <h2 style={{...S.cardTitle,color:"#991b1b"}}>⚠️ Jugador duplicado en {meta.name}</h2>
          <p style={{fontSize:13,color:"#7f1d1d",marginTop:0}}>
            {dupInRound.length === 1
              ? <><b>{nameOf(dupInRound[0])}</b> ya tiene una tarjeta cargada en esta ronda.</>
              : <><b>{dupInRound.map(nameOf).join(", ")}</b> ya tienen tarjeta cargada en esta ronda.</>}
            {" "}Si es una fecha adicional, cárgala como <b>Adicional</b> para no perder el score anterior.
          </p>

          {freeAdicional.length > 0 && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {freeAdicional.map(rn => (
                <button key={rn} onClick={()=>{setMeta({...meta,name:rn}); setOverwriteOk({});}}
                  style={{...S.btn,...S.btnP,fontSize:13,padding:"9px 16px"}}>
                  ↪ Cargar como {rn}
                </button>
              ))}
            </div>
          )}
          {freeAdicional.length === 0 && (
            <div style={{fontSize:12,color:"#7f1d1d",marginBottom:12,fontWeight:600}}>
              No quedan slots "Adicional" libres para {dupInRound.length === 1 ? "este jugador" : "estos jugadores"} — el reglamento permite máximo 2 adicionales al año.
            </div>
          )}

          <div style={{borderTop:"1px solid #fecaca",paddingTop:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#991b1b",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:8}}>
              O sobrescribir el score existente (se pierde el anterior)
            </div>
            {dupInRound.map(pid => (
              <label key={pid} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#7f1d1d",marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" checked={!!overwriteOk[pid]} style={{width:18,height:18,cursor:"pointer"}}
                  onChange={e=>setOverwriteOk(o => ({...o, [pid]: e.target.checked}))} />
                Sobrescribir la tarjeta de <b>{nameOf(pid)}</b>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Aviso secundario: misma fecha en otra ronda */}
      {dupSameDate.length > 0 && (
        <div style={{...S.card,borderLeft:"4px solid #f59e0b",backgroundColor:"#fffbeb"}}>
          <div style={{fontSize:13,color:"#92400e"}}>
            📅 <b>{dupSameDate.map(nameOf).join(", ")}</b> ya {dupSameDate.length===1?"tiene":"tienen"} una tarjeta cargada con fecha {new Date(meta.date+"T12:00:00").toLocaleDateString("es-CL",{day:"numeric",month:"long"})} en otra ronda. Verifica que la fecha sea correcta.
          </div>
        </div>
      )}

      {/* GRILLA TIPO TARJETA */}
      {selected.length > 0 && (
        <div style={S.card}>
          <h2 style={S.cardTitle}>Scores — 18 Hoyos</h2>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{borderCollapse:"separate",borderSpacing:0,width:"100%",minWidth: 120 + selected.length*86}}>
              <thead>
                <tr>
                  <th style={{position:"sticky",left:0,zIndex:2,backgroundColor:"#f9fafb",padding:"8px 6px",fontSize:11,fontWeight:700,color:"#6b7280",textAlign:"left",borderBottom:"2px solid #e5e7eb",minWidth:64}}>Hoyo</th>
                  <th style={{padding:"8px 4px",fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"2px solid #e5e7eb",minWidth:34}}>Par</th>
                  {selected.map(pid => (
                    <th key={pid} style={{padding:"8px 4px",fontSize:11,fontWeight:700,color:"#1a472a",borderBottom:"2px solid #e5e7eb",minWidth:82,maxWidth:96}}>
                      <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={nameOf(pid)}>
                        {nameOf(pid).split(" ")[0]}
                      </div>
                      <div style={{fontSize:10,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {nameOf(pid).split(" ").slice(1).join(" ")}
                      </div>
                      <button onClick={()=>togglePlayer(pid)} style={{marginTop:2,border:"none",background:"none",color:"#dc2626",fontSize:11,cursor:"pointer",padding:0}}>✕ quitar</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({length:18},(_,h) => (
                  <tr key={h} style={h===8?{borderBottom:"2px solid #d1d5db"}:{}}>
                    <td style={{position:"sticky",left:0,zIndex:1,backgroundColor:"#fff",padding:"3px 6px",fontSize:12,fontWeight:700,color:"#374151",borderBottom:"1px solid #f3f4f6"}}>
                      H{h+1}
                    </td>
                    <td style={{padding:"3px 4px",fontSize:11,color:"#9ca3af",textAlign:"center",borderBottom:"1px solid #f3f4f6"}}>{COURSE.pars[h]}</td>
                    {selected.map(pid => (
                      <td key={pid} style={{padding:"3px 3px",borderBottom:"1px solid #f3f4f6"}}>
                        <input
                          type="number" inputMode="numeric" min="1" max="15"
                          value={(grid[pid] || [])[h] || ""}
                          onChange={e=>setCell(pid, h, e.target.value)}
                          placeholder="-"
                          style={{width:"100%",boxSizing:"border-box",padding:"8px 2px",textAlign:"center",fontSize:16,fontWeight:700,
                            border:"1px solid #d1d5db",borderRadius:6,minHeight:40,
                            color: (grid[pid]||[])[h] ? scoreColor(parseInt((grid[pid]||[])[h]), COURSE.pars[h]) : "#9ca3af"}}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr style={{backgroundColor:"#f9fafb"}}>
                  <td style={{position:"sticky",left:0,zIndex:1,backgroundColor:"#f9fafb",padding:"8px 6px",fontSize:12,fontWeight:700,color:"#374151"}}>Golpes</td>
                  <td style={{padding:"8px 4px",fontSize:12,fontWeight:700,color:"#6b7280",textAlign:"center"}}>{PAR_TOTAL}</td>
                  {selected.map(pid => <td key={pid} style={{padding:"8px 4px",textAlign:"center",fontSize:15,fontWeight:700,color:"#1a472a"}}>{colTotal(pid) || "-"}</td>)}
                </tr>
                <tr style={{backgroundColor:"#f9fafb"}}>
                  <td style={{position:"sticky",left:0,zIndex:1,backgroundColor:"#f9fafb",padding:"6px 6px",fontSize:11,color:"#6b7280"}}>vs Par</td>
                  <td />
                  {selected.map(pid => {
                    const v = colVsPar(pid);
                    return <td key={pid} style={{padding:"6px 4px",textAlign:"center",fontSize:12,fontWeight:700,color: v > 0 ? "#ef4444" : "#22c55e"}}>{v > 0 ? "+" : ""}{v}</td>;
                  })}
                </tr>
                <tr style={{backgroundColor:"#f9fafb"}}>
                  <td style={{position:"sticky",left:0,zIndex:1,backgroundColor:"#f9fafb",padding:"6px 6px",fontSize:11,color:"#6b7280"}}>Gross</td>
                  <td />
                  {selected.map(pid => <td key={pid} style={{padding:"6px 4px",textAlign:"center",fontSize:12,fontWeight:700,color:"#4a6741"}}>{colGross(pid)} pts</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{fontSize:11,color:"#9ca3af",marginTop:8}}>💡 En el celular puedes deslizar la tabla hacia el lado para ver todas las columnas</div>
        </div>
      )}

      {/* Foto de respaldo */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>📷 Foto de Respaldo (opcional)</h2>
        {selected.length > 1 && <p style={{fontSize:12,color:"#6b7280",marginTop:0}}>Una sola foto queda asociada a los {selected.length} jugadores de la tarjeta.</p>}
        {photo ? (
          <div style={{textAlign:"center"}}>
            <img src={photo} alt="Tarjeta" onClick={()=>setLightboxSrc(photo)}
              style={{maxWidth:"100%",maxHeight:240,borderRadius:10,border:"1px solid #e5e7eb",cursor:"zoom-in"}} />
            <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>🔍 Toca para ver en grande</div>
            <button style={{...S.btn,...S.btnS,marginTop:8,fontSize:12,padding:"8px 16px"}} onClick={()=>setPhoto(null)}>✕ Quitar foto</button>
          </div>
        ) : (
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <label style={{flex:1,minWidth:130,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"18px 12px",borderRadius:10,border:"2px dashed #86efac",backgroundColor:"#f0fdf4",cursor:"pointer",textAlign:"center"}}>
              <span style={{fontSize:28}}>📷</span>
              <span style={{fontSize:12,fontWeight:600,color:"#1a472a"}}>Sacar foto</span>
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handlePhoto(e.target.files[0])} />
            </label>
            <label style={{flex:1,minWidth:130,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"18px 12px",borderRadius:10,border:"2px dashed #d1d5db",backgroundColor:"#f9fafb",cursor:"pointer",textAlign:"center"}}>
              <span style={{fontSize:28}}>🖼️</span>
              <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>Galería</span>
              <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handlePhoto(e.target.files[0])} />
            </label>
          </div>
        )}
      </div>

      {/* Guardar */}
      {blockingDupes.length > 0 && (
        <div style={{backgroundColor:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"12px 16px",marginBottom:12,textAlign:"center",fontSize:13,color:"#991b1b",fontWeight:600}}>
          🔒 Guardado bloqueado: resuelve el duplicado de {blockingDupes.map(nameOf).join(", ")}
        </div>
      )}
      <button style={{...S.btn,...S.btnP,width:"100%",padding:"14px 24px",fontSize:15,opacity: canSave ? 1 : 0.4}}
        onClick={save} disabled={!canSave}>
        {saving ? "Guardando..." : filledPlayers.length > 1 ? `Guardar ${filledPlayers.length} jugadores` : "Guardar Score"}
      </button>
    </div>
  );
}


// ======== HCP CHART (SVG sparkline — year-aware) ========
function HcpChart({ history, inicial }) {
  if (!history || history.length === 0) return null;
  const vals = history.map(h => h.hcp);
  const years = history.map(h => h.year || 2025);
  const allVals = [inicial, ...vals];
  const min = Math.max(0, Math.min(...allVals) - 2);
  const max = Math.max(...allVals) + 2;
  const W = 520, H = 90, PAD = 14, RIGHT = 30;
  const n = vals.length;
  const xStep = (W - PAD - RIGHT) / Math.max(n - 1, 1);
  const yScale = v => PAD + ((max - v) / Math.max(max - min, 1)) * (H - PAD * 2);

  // Find where year changes (for separator)
  const yearChanges = [];
  for (let i = 1; i < years.length; i++) {
    if (years[i] !== years[i-1]) yearChanges.push(i);
  }

  // Color per dot: 2025 = green, 2026 = blue
  const dotColor = (yr, isLast) => {
    if (isLast) return "#b8860b";
    return yr === 2025 ? "#1a472a" : "#2563eb";
  };
  const lineColor = (yr) => yr === 2025 ? "#1a472a" : "#2563eb";

  // Build segments per year (separate polylines)
  const segments = [];
  let segStart = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || years[i] !== years[segStart]) {
      const pts = vals.slice(segStart, i).map((v, j) =>
        `${PAD + (segStart + j) * xStep},${yScale(v)}`).join(" ");
      segments.push({ pts, yr: years[segStart] });
      segStart = i;
    }
  }

  const lastIdx = n - 1;

  return (
    <div style={{overflowX:"auto"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",minWidth:300,height:H}} xmlns="http://www.w3.org/2000/svg">
        {/* Reference line: inicial */}
        <line x1={PAD} y1={yScale(inicial)} x2={W-RIGHT} y2={yScale(inicial)}
          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3" />
        <text x={W-RIGHT+2} y={yScale(inicial)+4} fontSize="9" fill="#9ca3af">{inicial}</text>

        {/* Year separator lines */}
        {yearChanges.map(i => {
          const x = PAD + i * xStep;
          return (
            <g key={i}>
              <line x1={x} y1={PAD-4} x2={x} y2={H-PAD+4}
                stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="3,2" />
              <text x={x+3} y={PAD+2} fontSize="8" fill="#6b7280" fontWeight="600">
                {years[i]}
              </text>
            </g>
          );
        })}

        {/* Year label at start */}
        {n > 0 && (
          <text x={PAD} y={H-2} fontSize="8" fill="#9ca3af">{years[0]}</text>
        )}

        {/* Polyline segments per year */}
        {segments.map((seg, si) => (
          <polyline key={si} points={seg.pts} fill="none"
            stroke={lineColor(seg.yr)} strokeWidth="2" strokeLinejoin="round" />
        ))}

        {/* Dots */}
        {vals.map((v, i) => {
          const yr = years[i];
          const isLast = i === lastIdx;
          const isInicial = history[i]?.isInicial || history[i]?.roundName?.includes("Inicial");
          const showLabel = i === 0 || isLast || n <= 8 || yearChanges.includes(i) || isInicial;
          const cx = PAD + i * xStep;
          const cy = yScale(v);
          const iniLabel = history[i]?.roundName?.includes("2026") ? "Ini.26" : "Ini.";
          return (
            <g key={i}>
              {isInicial ? (
                // Open diamond for inicial points
                <polygon
                  points={`${cx},${cy-6} ${cx+6},${cy} ${cx},${cy+6} ${cx-6},${cy}`}
                  fill="#fff" stroke={yr===2025?"#1a472a":"#2563eb"} strokeWidth="2"
                />
              ) : (
                <circle cx={cx} cy={cy} r={isLast ? 5 : 3}
                  fill={dotColor(yr, isLast)} stroke="#fff" strokeWidth="1.5" />
              )}
              {showLabel && (
                <text x={cx} y={cy - (isInicial ? 9 : 7)} textAnchor="middle"
                  fontSize="9" fontWeight={isLast || isInicial ? "bold" : "normal"}
                  fill={isLast ? "#92400e" : isInicial ? (yr===2025?"#1a472a":"#1d4ed8") : yr === 2025 ? "#374151" : "#1d4ed8"}>
                  {v}
                </text>
              )}
              {isInicial && (
                <text x={cx} y={cy + 16} textAnchor="middle" fontSize="8"
                  fill={yr===2025?"#1a472a":"#2563eb"} fontWeight="600">
                  {iniLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ======== STATS ========
function Stats({ allRounds, players, rankings, year, hcp2026, availableYears }) {
  const [tab, setTab] = useState("hcp");
  const [selPlayer, setSelPlayer] = useState("all");
  const [perfPlayer, setPerfPlayer] = useState("all");
  const [statsYear, setStatsYear] = useState("all"); // default all years for HCP evolution

  // Filter rounds by selected statsYear
  const rounds = useMemo(() => {
    if (statsYear === "all") return allRounds;
    return allRounds.filter(r => roundYear(r) === parseInt(statsYear));
  }, [allRounds, statsYear]);

  // Compute rankings based on statsYear (independent of menu year)
  const effectiveRankings = useMemo(() => {
    // Helper: compute last HCP for a player across all rounds up to now
    const getLastHcp = (pid) => {
      // Last 2026 round played? Use calcDynamicHcp
      const rounds2026 = allRounds.filter(r => roundYear(r) >= 2026).sort((a,b) => new Date(a.date||0)-new Date(b.date||0));
      const played2026 = rounds2026.filter(r => r.scores?.[pid]);
      if (played2026.length > 0) {
        const lastIdx = rounds2026.findIndex(r => r.id === played2026[played2026.length-1].id);
        const _lastR = rounds2026[lastIdx];
          const _lpDate = _lastR.scores_log?.[pid]?.playedAt || _lastR.date;
          const _lafterDate = new Date(new Date(_lpDate).getTime()+86400000).toISOString().slice(0,10);
          return calcDynamicHcp(pid, "__after__"+_lafterDate, rounds2026, players, hcp2026);
      }
      // No 2026 rounds — use HCP inicial 2026 if set
      if (hcp2026[pid]?.inicial != null) return hcp2026[pid].inicial;
      // Fall back to last 2025 gross-based HCP
      const gb = ANNUAL_2025[pid]?.grossPts || {};
      const grossVals = Object.values(gb);
      if (grossVals.length > 0) return 36 - grossVals[grossVals.length - 1];
      return null;
    };

    if (statsYear === "all") {
      // Combine 2025 net points + 2026 net points, correct lastHcp
      return players.map(p => {
        // 2025 data
        const a = ANNUAL_2025[p.id];
        const net2025 = a?.netPts ? Object.values(a.netPts) : [];
        // 2026 data
        const rounds2026 = allRounds.filter(r => roundYear(r) >= 2026).sort((a,b) => new Date(a.date||0)-new Date(b.date||0));
        let net2026 = [], tarj2026 = 0;
        rounds2026.forEach((r, rIdx) => {
          if (!r.scores?.[p.id]) return;
          const hcp = calcDynamicHcp(p.id, r.id, rounds2026, players, hcp2026);
          let net = 0;
          r.scores[p.id].forEach((s, i) => { net += stablefordNet(s, COURSE.pars[i], hcp, COURSE.handicapIndex[i]); });
          net2026.push(net);
          tarj2026++;
        });
        const netVals = [...net2025, ...net2026];
        const { total: totalNet, best7: best7Net } = rankingScore(netVals);
        const tarjetas = (a?.numTarjetas || 0) + tarj2026;
        return {
          ...p,
          totalNet,
          totalNetAll: netVals.reduce((s,v)=>s+v,0),
          tarjetas,
          best7Net,
          avgNet: best7Net.length > 0 ? totalNet / best7Net.length : 0,
          currentHcp: getLastHcp(p.id),
        };
      }).sort(tiebreaker);
    }

    const yr = parseInt(statsYear);
    if (yr === 2025) {
      return players.map(p => {
        const a = ANNUAL_2025[p.id];
        const netVals = a?.netPts ? Object.values(a.netPts) : [];
        const grossVals = a?.grossPts ? Object.values(a.grossPts) : [];
        const { total: totalNet, best7: best7Net } = rankingScore(netVals);
        const { total: totalGross, best7: best7Gross } = rankingScore(grossVals);
        // Last HCP for 2025 = 36 - last grossPts entry
        const grossArr = Object.values(a?.grossPts || {});
        const lastHcp2025 = grossArr.length > 0 ? 36 - grossArr[grossArr.length - 1] : null;
        return {
          ...p,
          totalNet, totalGross,
          totalNetAll: a?.totalNet || 0,
          totalGrossAll: a?.totalGross || 0,
          tarjetas: a?.numTarjetas || 0,
          best7Net, best7Gross,
          avgNet: best7Net.length > 0 ? totalNet / best7Net.length : 0,
          avgGross: best7Gross.length > 0 ? totalGross / best7Gross.length : 0,
          netByMonth: a?.netPts || {},
          grossByMonth: a?.grossPts || {},
          strokesByMonth: a?.strokes || {},
          hcpHistory: [],
          currentHcp: lastHcp2025,
        };
      }).sort(tiebreaker);
    }
    // 2026+
    const yearRounds = allRounds.filter(r => roundYear(r) === yr);
    return computeRankingsFromRounds(players, yearRounds, yr, hcp2026);
  }, [statsYear, allRounds, players, hcp2026, availableYears]);

  // Build HCP history per round (sorted by date)
  const sortedRounds = useMemo(() =>
    [...rounds].sort((a,b) => new Date(a.date||0) - new Date(b.date||0)),
  [rounds]);

  // Helper: get gross HCP for a player in a 2025 round — always from INIT_DATA
  const get2025Hcp = (pid, roundName) => {
    const gb = ANNUAL_2025[pid]?.grossPts || {};
    if (gb[roundName] != null) return 36 - gb[roundName];
    const monthMap = {"Marzo":"Mar","Abril":"Abr","Mayo":"May","Junio":"Jun","Julio":"Jul","Agosto":"Ago","Septiembre":"Sep","Octubre":"Oct","Noviembre":"Nov","Diciembre":"Dic","Adicional 1":"Adic 1","Adicional 2":"Adic 2"};
    for (const [full,abbr] of Object.entries(monthMap)) {
      if ((roundName.includes(full)||roundName.includes(abbr)) && gb[abbr]!=null) return 36-gb[abbr];
    }
    if (roundName.includes("Adic")) { const n=roundName.includes("2")?"Adic 2":"Adic 1"; if(gb[n]!=null) return 36-gb[n]; }
    return null;
  };
  // Determine if a round belongs to 2025 (for HCP calc mode)
  const isRound2025 = (r) => roundYear(r) === 2025;

  // For HCP chart: collect hcp per player per round
  const hcpData = useMemo(() => {
    const data = {};
    players.forEach(p => {
      data[p.id] = [];
      // Add HCP Inicial anchor
      const h0 = isRound2025(sortedRounds[0]) ? (ANNUAL_2025[p.id] ? p.handicap : null) : (hcp2026[p.id]?.inicial ?? p.handicap);
      if (h0 != null) data[p.id].push({ roundName: "HCP Inicial", hcp: h0, isInicial: true });
      sortedRounds.forEach((r, rIdx) => {
        if (!r.scores?.[p.id]) return;
        let hcp;
        if (isRound2025(r)) {
          // 2025: get2025Hcp = 36-grossPts = HCP after that round ✓
          hcp = get2025Hcp(p.id, r.name);
          if (hcp === null) return;
        } else {
          // 2026: rIdx+1 = HCP after this round
          const _pd3 = r.scores_log?.[p.id]?.playedAt || r.date;
              const _ad3 = new Date(new Date(_pd3).getTime()+86400000).toISOString().slice(0,10);
              hcp = calcDynamicHcp(p.id, "__after__"+_ad3, sortedRounds, players, hcp2026);
        }
        data[p.id].push({ roundName: r.name, hcp, date: r.date });
      });
    });
    return data;
  }, [sortedRounds, players, hcp2026, effectiveRankings]);

  // Average HCP per round — HCP after each round
  const avgHcpPerRound = useMemo(() => {
    return sortedRounds.map((r, rIdx) => {
      const hcps = players
        .filter(p => r.scores?.[p.id])
        .map(p => {
          if (isRound2025(r)) return get2025Hcp(p.id, r.name);
          const _pd4 = r.scores_log?.[p.id]?.playedAt || r.date;
              const _ad4 = new Date(new Date(_pd4).getTime()+86400000).toISOString().slice(0,10);
              return calcDynamicHcp(p.id, "__after__"+_ad4, sortedRounds, players, hcp2026);
        })
        .filter(h => h !== null);
      return {
        roundName: r.name,
        avg: hcps.length ? Math.round(hcps.reduce((s,v)=>s+v,0)/hcps.length) : null
      };
    }).filter(x => x.avg !== null);
  }, [sortedRounds, players, hcp2026, effectiveRankings]);

  // Performance: hole avg — filterable by player
  const holePerf = useMemo(() => {
    const sums = Array(18).fill(0);
    const counts = Array(18).fill(0);
    sortedRounds.forEach(r => {
      if (!r.scores) return;
      const entries = perfPlayer === "all"
        ? Object.entries(r.scores)
        : Object.entries(r.scores).filter(([pid]) => pid === perfPlayer);
      entries.forEach(([, holes]) => {
        holes.forEach((s,i) => { if (s > 0) { sums[i]+=s; counts[i]++; } });
      });
    });
    return sums.map((s,i) => ({
      hole: i+1, par: COURSE.pars[i],
      avg: counts[i] ? s/counts[i] : null,
      count: counts[i]
    }));
  }, [sortedRounds, perfPlayer]);

  // Selected player data for HCP chart
  const selectedPlayerData = selPlayer === "all"
    ? avgHcpPerRound.map(x => ({ roundName: x.roundName, hcp: x.avg }))
    : (hcpData[selPlayer] || []);

  const selectedPlayerInicial = selPlayer === "all"
    ? (avgHcpPerRound[0]?.avg ?? 20)
    : (year >= 2026 ? (hcp2026[selPlayer]?.inicial ?? players.find(p=>p.id===selPlayer)?.handicap ?? 20)
       : (players.find(p=>p.id===selPlayer)?.handicap ?? 20));

  const holeColor = (avg, par) => {
    if (!avg) return "#e5e7eb";
    const d = avg - par;
    if (d <= 1) return "#22c55e";       // par o mejor / bogey → verde
    if (d <= 2) return "#3b82f6";       // doble bogey → azul
    return "#ef4444";                   // más que doble bogey → rojo
  };

  const holeLabel = (avg, par) => {
    if (!avg) return "-";
    const d = avg - par;
    if (d <= 0) return "≤Par";
    if (d <= 1) return "Bogey";
    if (d <= 2) return "D.Bogey";
    return "+"+Math.round(d);
  };

  const tabs = [
    { id:"hcp", label:"HCP Medio" },
    { id:"perf", label:"Performance" },
    { id:"ranking", label:"Ranking" },
  ];

  return (
    <div style={S.view}>
      <div style={{marginBottom:20}}>
        <h1 style={S.title}>Estadísticas</h1>
        <p style={S.sub}>{statsYear === "all" ? "Todas las temporadas" : `Temporada ${statsYear}`}</p>
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {tabs.map(t => (
          <button key={t.id} style={{...S.chip,...(tab===t.id?{backgroundColor:"#374151",color:"#fff",borderColor:"#374151"}:{})}}
            onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Year selector — all tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        <button
          style={{...S.chip,fontSize:12,...(statsYear==="all"?{backgroundColor:"#1a472a",color:"#fff",borderColor:"#1a472a"}:{})}}
          onClick={()=>setStatsYear("all")}
        >Todas</button>
        {availableYears.map(y => (
          <button key={y}
            style={{...S.chip,fontSize:12,...(statsYear===String(y)?{backgroundColor:"#1a472a",color:"#fff",borderColor:"#1a472a"}:{})}}
            onClick={()=>setStatsYear(String(y))}
          >{y}</button>
        ))}
      </div>

      {/* ── HCP Medio ── */}
      {tab==="hcp" && (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div>
              <h2 style={{...S.cardTitle,margin:0}}>📉 Evolución del Handicap</h2>
              <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>HCP mostrado = resultado <b>después</b> de cada ronda jugada · primer punto = HCP Inicial</div>
            </div>
            <select style={{...S.input,width:"auto",minWidth:160}}
              value={selPlayer} onChange={e=>setSelPlayer(e.target.value)}>
              <option value="all">Promedio todos</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {selectedPlayerData.length === 0 ? (
            <div style={{textAlign:"center",color:"#9ca3af",padding:24}}>Sin datos de rondas para este año</div>
          ) : (
            <>
              <HcpChart history={selectedPlayerData} inicial={selectedPlayerInicial} />
              {/* Timeline with year separators */}
              {(() => {
                const chipYears = selectedPlayerData.map(h => h.year || 2025);
                const changes = [];
                for (let i=1; i<chipYears.length; i++) { if (chipYears[i]!==chipYears[i-1]) changes.push(i); }
                return (
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:10,alignItems:"center"}}>
                    {selectedPlayerData.map((h,i) => {
                      const isLast = i===selectedPlayerData.length-1;
                      const isNewYear = changes.includes(i);
                      const is25 = (h.year||2025)===2025;
                      const isInicial = h.roundName === "Inicial 2026";
                      return (
                        <React.Fragment key={i}>
                          {isNewYear && (
                            <div style={{display:"flex",alignItems:"center",gap:3}}>
                              <div style={{width:1,height:36,backgroundColor:"#d1d5db"}}/>
                              <span style={{fontSize:9,color:"#6b7280",fontWeight:700}}>{h.year}</span>
                            </div>
                          )}
                          <div style={{textAlign:"center",padding:"5px 8px",borderRadius:8,minWidth:50,
                            backgroundColor: isLast?(is25?"#1a472a":"#1d4ed8"):isInicial?"#dbeafe":"#f9fafb",
                            border: isLast?"none":isInicial?"2px dashed #2563eb":`1px solid ${is25?"#e5e7eb":"#dbeafe"}`}}>
                            <div style={{fontSize:9,marginBottom:1,
                              color:isLast?"rgba(255,255,255,0.7)":isInicial?"#1d4ed8":(is25?"#9ca3af":"#93c5fd"),
                              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:58}}>
                              {h.roundName.split(" - ")[0]}
                            </div>
                            <div style={{fontSize:15,fontWeight:800,
                              color:isLast?"#fff":isInicial?"#1d4ed8":(is25?"#1a472a":"#1d4ed8")}}>
                              {h.hcp}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()}
              {selPlayer==="all" && (
                <p style={{fontSize:11,color:"#9ca3af",marginTop:8}}>Promedio del HCP de todos los jugadores que participaron en cada ronda</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Performance por hoyo ── */}
      {tab==="perf" && (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <h2 style={{...S.cardTitle,margin:0}}>🏌️ Performance por Hoyo</h2>
            <select style={{...S.input,width:"auto",minWidth:160}}
              value={perfPlayer} onChange={e=>setPerfPlayer(e.target.value)}>
              <option value="all">Todos los jugadores</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:12}}>
            {perfPlayer==="all"
              ? "Promedio de todos los jugadores en todas las rondas"
              : `Promedio de ${players.find(p=>p.id===perfPlayer)?.name} en todas sus rondas`}
          </div>
          <div style={{display:"flex",gap:3,alignItems:"flex-end",height:160,marginBottom:16}}>
            {holePerf.map(({hole,par,avg,count},i) => {
              const maxAvg = Math.max(...holePerf.map(h=>h.avg||0), 1);
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end"}}>
                  <div style={{fontSize:9,color:"#6b7280",marginBottom:2,fontWeight:600}}>{avg?avg.toFixed(1):"-"}</div>
                  <div style={{width:"100%",maxWidth:30,borderRadius:"3px 3px 0 0",
                    backgroundColor:holeColor(avg,par),
                    height:avg?`${(avg/(maxAvg+0.5))*100}%`:"2px",
                    minHeight:4,transition:"height 0.3s",opacity:0.85}} />
                  <div style={{fontSize:10,fontWeight:700,marginTop:4,color:"#374151"}}>{hole}</div>
                  <div style={{fontSize:8,color:"#9ca3af"}}>P{par}</div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
            {[{c:"#22c55e",l:"Par o Bogey"},
              {c:"#3b82f6",l:"Doble Bogey"},
              {c:"#ef4444",l:"Más que Doble"}
            ].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#6b7280"}}>
                <div style={{width:12,height:12,borderRadius:3,backgroundColor:x.c}}/>
                {x.l}
              </div>
            ))}
          </div>
          {/* Table */}
          <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
            <th style={S.th}>Hoyo</th><th style={S.th}>Par</th>
            <th style={S.th}>Prom Golpes</th><th style={S.th}>vs Par</th>
            <th style={S.th}>Categoría</th><th style={S.th}>Rondas</th>
          </tr></thead><tbody>
            {holePerf.map(({hole,par,avg,count}) => (
              <tr key={hole} style={S.tr}>
                <td style={{...S.td,fontWeight:700}}>H{hole}</td>
                <td style={S.td}>{par}</td>
                <td style={{...S.td,fontWeight:600}}>{avg?avg.toFixed(2):"-"}</td>
                <td style={{...S.td,fontWeight:600,color:avg&&avg-par>0?"#dc2626":"#16a34a"}}>
                  {avg?(avg-par>0?"+":""+(avg-par).toFixed(2)):"-"}
                </td>
                <td style={S.td}>
                  <span style={{padding:"2px 8px",borderRadius:10,backgroundColor:holeColor(avg,par),
                    color:"#fff",fontSize:10,fontWeight:600}}>
                    {holeLabel(avg,par)}
                  </span>
                </td>
                <td style={{...S.td,color:"#9ca3af"}}>{count}</td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      )}

      {/* ── Ranking completo ── */}
      {tab==="ranking" && (
        <div style={S.card}>
          <h2 style={S.cardTitle}>🏆 Ranking {statsYear === "all" ? "Completo" : statsYear}</h2>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:10}}>
            Jugadores con menos de 7 rondas: suma de todas · Con 7 o más: suma de las mejores 7
          </div>
          <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
            <th style={S.th}>#</th>
            <th style={{...S.th,textAlign:"left"}}>Jugador</th>
            <th style={{...S.th,color:"#b8860b"}}>HCP★</th>
            <th style={S.th}>Tarj.</th>
            <th style={{...S.th,color:"#1a472a"}}>PTS</th>
            <th style={S.th}>Prom</th>
            <th style={S.th}>Modo</th>
          </tr></thead><tbody>
            {effectiveRankings.filter(p=>p.tarjetas>0).map((p,i) => (
              <tr key={p.id} style={S.tr}>
                <td style={S.td}><span style={{...S.rank,...(i<3?S["rank"+i]:{})}}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                </span></td>
                <td style={{...S.td,textAlign:"left",fontWeight:600}}>{p.name}</td>
                <td style={{...S.td,fontWeight:700,color:"#b8860b"}}>{p.currentHcp ?? p.handicap}</td>
                <td style={S.td}>{p.tarjetas}</td>
                <td style={{...S.td,fontWeight:800,color:"#1a472a",fontSize:15}}>{p.totalNet}</td>
                <td style={{...S.td,color:"#6b7280"}}>{p.avgNet?.toFixed(1)}</td>
                <td style={S.td}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:8,
                    backgroundColor:p.tarjetas>=7?"#f0f7f0":"#fef3c7",
                    color:p.tarjetas>=7?"#1a472a":"#92400e",fontWeight:600}}>
                    {p.tarjetas>=7?"Best 7":"Suma"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      )}
    </div>
  );
}

// ======== SETTINGS ========
// ======== PANEL DE LIMPIEZA DE FOTOS POR AÑO ========
function PhotoCleanup({ rounds, photoIndex }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const roundById = useMemo(() => {
    const m = {};
    rounds.forEach(r => { m[r.id] = r; });
    return m;
  }, [rounds]);

  // Agrupa el índice de fotos por año calendario de la ronda
  const byYear = useMemo(() => {
    const acc = {};
    Object.entries(photoIndex || {}).forEach(([rid, entry]) => {
      const r = roundById[rid];
      const y = r ? roundYear(r) : "Sin ronda";
      const items = Object.values(entry || {});
      if (!items.length) return;
      if (!acc[y]) acc[y] = { year: y, roundIds: [], photos: 0, bytes: 0 };
      acc[y].roundIds.push(rid);
      acc[y].photos += items.length;
      acc[y].bytes += items.reduce((s, b) => s + (typeof b === "number" ? b : 0), 0);
    });
    return Object.values(acc).sort((a, b) => String(b.year).localeCompare(String(a.year)));
  }, [photoIndex, roundById]);

  const currentYear = new Date().getFullYear();
  const totalBytes = byYear.reduce((s, g) => s + g.bytes, 0);
  const mb = (b) => (b / 1048576).toFixed(1);

  const purgeYear = async (g) => {
    const label = g.year === "Sin ronda" ? "rondas eliminadas" : g.year;
    if (!confirm(`¿Borrar las ${g.photos} fotos de ${label} (≈${mb(g.bytes)} MB)?\n\nLos scores NO se tocan — sólo se elimina el respaldo fotográfico. Esta acción no se puede deshacer.`)) return;
    setBusy(true); setMsg(null);
    try {
      await fbDeleteRoundPhotos(g.roundIds);
      setMsg(`✅ ${g.photos} fotos de ${label} eliminadas (≈${mb(g.bytes)} MB liberados)`);
    } catch (e) {
      setMsg("❌ Error al borrar: " + e.message);
    } finally { setBusy(false); }
  };

  const rebuild = async () => {
    setBusy(true); setMsg(null);
    try {
      const n = await fbRebuildPhotoIndex();
      setMsg(`✅ Índice reconstruido: ${n} fotos encontradas`);
    } catch (e) {
      setMsg("❌ Error: " + e.message);
    } finally { setBusy(false); }
  };

  return (
    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:8}}>
        <h2 style={{...S.cardTitle,margin:0}}>📷 Respaldo de Tarjetas</h2>
        <button style={{...S.btn,...S.btnS,fontSize:11,padding:"4px 10px"}} onClick={rebuild} disabled={busy}>
          🔄 Reconstruir índice
        </button>
      </div>
      <p style={{fontSize:12,color:"#6b7280",marginBottom:12}}>
        Las fotos de años cerrados ya no son necesarias y son lo que más pesa en la base de datos.
        Borrarlas <b>no afecta los scores ni el ranking</b>.
        {totalBytes > 0 && <> Total actual: <b>≈{mb(totalBytes)} MB</b>.</>}
      </p>

      {msg && (
        <div style={{padding:"10px 14px",borderRadius:8,marginBottom:12,fontSize:13,fontWeight:600,
          backgroundColor: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
          color: msg.startsWith("✅") ? "#065f46" : "#991b1b"}}>{msg}</div>
      )}

      {byYear.length === 0 ? (
        <div style={{fontSize:13,color:"#9ca3af",padding:"12px 0"}}>
          No hay fotos indexadas. Si sabes que existen fotos cargadas antes de esta versión, usa "Reconstruir índice".
        </div>
      ) : (
        <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
          <th style={{...S.th,textAlign:"left"}}>Año</th>
          <th style={S.th}>Rondas</th>
          <th style={S.th}>Fotos</th>
          <th style={S.th}>Peso aprox.</th>
          <th style={S.th}></th>
        </tr></thead><tbody>
          {byYear.map(g => {
            const isCurrent = g.year === currentYear;
            return (
              <tr key={g.year} style={S.tr}>
                <td style={{...S.td,textAlign:"left",fontWeight:700,fontSize:13}}>
                  {g.year}{isCurrent && <span style={{fontSize:10,color:"#4a6741",fontWeight:600,marginLeft:6}}>en curso</span>}
                </td>
                <td style={{...S.td,fontSize:12,color:"#6b7280"}}>{g.roundIds.length}</td>
                <td style={{...S.td,fontSize:12,color:"#6b7280"}}>{g.photos}</td>
                <td style={{...S.td,fontSize:12,fontWeight:600,color:"#374151"}}>≈{mb(g.bytes)} MB</td>
                <td style={S.td}>
                  <button
                    onClick={() => purgeYear(g)}
                    disabled={busy}
                    style={{padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:600,cursor: busy ? "wait" : "pointer",
                      border: isCurrent ? "1px solid #d1d5db" : "1px solid #fca5a5",
                      backgroundColor: isCurrent ? "#f9fafb" : "#fef2f2",
                      color: isCurrent ? "#6b7280" : "#991b1b"}}>
                    🗑️ Borrar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody></table></div>
      )}
    </div>
  );
}

function Settings({players, savePlayers, rounds, saveRounds, hcp2026, saveHcp2026, photoIndex}) {
  const resetToDefault = async () => {
    if (!confirm("¿Restaurar datos originales del Excel 2025?")) return;
    await loadHistoric2025(); // el histórico vive fuera del bundle
    savePlayers(INIT_PLAYERS);
    saveRounds(ROUNDS_2025);
  };
  const resetHcp = () => {
    if (confirm("¿Restaurar HCP iniciales 2026 del reglamento?")) {
      saveHcp2026(HCP_2026_DEFAULT);
    }
  };
  const clearAll = () => { if (confirm("⚠️ ¿Borrar TODO?")) { savePlayers([]); saveRounds([]); } };

  // ===== Gestión de Jugadores =====
  const [newPlayer, setNewPlayer] = useState({name:"", inicial:"", fed:""});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({name:"", inicial:"", fed:""});

  const nextPlayerId = () => {
    const nums = players.map(p => parseInt((p.id||"").replace(/\D/g,""), 10)).filter(n => !isNaN(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return "p" + String(next).padStart(2, "0");
  };

  const addPlayer = async () => {
    const name = (newPlayer.name || "").trim();
    const inicial = parseInt(newPlayer.inicial, 10);
    const fed = newPlayer.fed === "" ? inicial : parseInt(newPlayer.fed, 10);
    if (!name) { alert("Ingresa el nombre del jugador"); return; }
    if (isNaN(inicial) || inicial < 0 || inicial > 54) { alert("HCP inicial inválido (0-54)"); return; }
    if (players.some(p => p.name.trim().toLowerCase() === name.toLowerCase())) {
      if (!confirm(`Ya existe un jugador con nombre similar. ¿Agregar de todas formas?`)) return;
    }
    const id = nextPlayerId();
    const newP = {id, name, handicap: inicial};
    const updatedPlayers = [...players, newP];
    const updatedHcp = {...hcp2026, [id]: {gp2025: inicial, fed: isNaN(fed) ? inicial : fed, inicial}};
    await savePlayers(updatedPlayers);
    await saveHcp2026(updatedHcp);
    setNewPlayer({name:"", inicial:"", fed:""});
    alert(`✅ Jugador "${name}" agregado (${id})`);
  };

  const startEdit = (p) => {
    const h = hcp2026[p.id] || {gp2025:20, fed:20, inicial:20};
    setEditingId(p.id);
    setEditForm({name: p.name, inicial: String(h.inicial), fed: String(h.fed)});
  };

  const saveEdit = async () => {
    const name = (editForm.name || "").trim();
    const inicial = parseInt(editForm.inicial, 10);
    const fed = parseInt(editForm.fed, 10);
    if (!name) { alert("Nombre no puede estar vacío"); return; }
    if (isNaN(inicial) || inicial < 0 || inicial > 54) { alert("HCP inicial inválido (0-54)"); return; }
    const updatedPlayers = players.map(p => p.id === editingId ? {...p, name, handicap: inicial} : p);
    const currentH = hcp2026[editingId] || {gp2025: inicial, fed: isNaN(fed) ? inicial : fed, inicial};
    const updatedHcp = {...hcp2026, [editingId]: {...currentH, fed: isNaN(fed) ? currentH.fed : fed, inicial}};
    await savePlayers(updatedPlayers);
    await saveHcp2026(updatedHcp);
    setEditingId(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({name:"", inicial:"", fed:""}); };

  const deletePlayer = async (p) => {
    // Chequear si tiene rondas cargadas
    const playedRounds = rounds.filter(r => r.scores && r.scores[p.id]);
    let msg = `¿Eliminar a "${p.name}" (${p.id})?`;
    if (playedRounds.length > 0) {
      msg = `⚠️ "${p.name}" tiene ${playedRounds.length} ronda(s) cargada(s). Al eliminarlo, sus scores se PERDERÁN.\n\n¿Continuar?`;
    }
    if (!confirm(msg)) return;
    const updatedPlayers = players.filter(x => x.id !== p.id);
    const updatedHcp = {...hcp2026};
    delete updatedHcp[p.id];
    // Limpiar scores de rondas
    const updatedRounds = rounds.map(r => {
      if (!r.scores || !r.scores[p.id]) return r;
      const {[p.id]: _, ...restScores} = r.scores;
      return {...r, scores: restScores};
    });
    await savePlayers(updatedPlayers);
    await saveHcp2026(updatedHcp);
    await saveRounds(updatedRounds);
    alert(`Jugador "${p.name}" eliminado`);
  };

  return (
    <div style={S.view}>
      <div style={S.hdr}><h1 style={S.title}>Configuración</h1></div>
      <div style={S.card}>
        <h2 style={S.cardTitle}>Cancha</h2>
        <p style={{color:"#6b7280",fontSize:13}}>Las Lomas de La Dehesa · Par {PAR_TOTAL}</p>
        <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
          <th style={S.thS}>Hoyo</th>{COURSE.pars.map((_,i)=><th key={i} style={S.thS}>{i+1}</th>)}
        </tr></thead><tbody>
          <tr><td style={{...S.tdS,fontWeight:600}}>Par</td>{COURSE.pars.map((p,i)=><td key={i} style={S.tdS}>{p}</td>)}</tr>
          <tr><td style={{...S.tdS,fontWeight:600}}>HCP</td>{COURSE.handicapIndex.map((h,i)=><td key={i} style={S.tdS}>{h}</td>)}</tr>
        </tbody></table></div>
      </div>

      {/* Gestión de Jugadores */}
      <div style={S.card}>
        <div style={S.cardHdr}>
          <h2 style={{...S.cardTitle,margin:0}}>👥 Jugadores ({players.length})</h2>
        </div>
        <p style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Agrega nuevos jugadores o edita los existentes. Los cambios se sincronizan con Firebase.</p>

        {/* Formulario para agregar */}
        <div style={{backgroundColor:"#f0f7f0",padding:12,borderRadius:8,marginBottom:14,border:"1px solid #d1e7dd"}}>
          <div style={{fontSize:12,fontWeight:600,color:"#1a472a",marginBottom:8}}>➕ Agregar jugador nuevo</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,alignItems:"end"}}>
            <div>
              <label style={{fontSize:11,color:"#6b7280"}}>Nombre completo</label>
              <input style={S.input} type="text" placeholder="Ej: Juan Pérez" value={newPlayer.name}
                onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
            </div>
            <div>
              <label style={{fontSize:11,color:"#6b7280"}}>HCP Inicial</label>
              <input style={S.input} type="number" min={0} max={54} placeholder="18" value={newPlayer.inicial}
                onChange={e => setNewPlayer({...newPlayer, inicial: e.target.value})} />
            </div>
            <div>
              <label style={{fontSize:11,color:"#6b7280"}}>HCP Fed (opc.)</label>
              <input style={S.input} type="number" min={0} max={54} placeholder="Fed" value={newPlayer.fed}
                onChange={e => setNewPlayer({...newPlayer, fed: e.target.value})} />
            </div>
            <button style={{...S.btn,...S.btnP,padding:"9px 14px",fontSize:12}} onClick={addPlayer}>Agregar</button>
          </div>
        </div>

        {/* Tabla de edición */}
        <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
          <th style={{...S.th,textAlign:"left",width:60}}>ID</th>
          <th style={{...S.th,textAlign:"left"}}>Nombre</th>
          <th style={S.th}>Inicial</th>
          <th style={S.th}>Fed</th>
          <th style={{...S.th,width:150}}>Acciones</th>
        </tr></thead><tbody>
          {players.map(p => {
            const h = hcp2026[p.id] || HCP_2026_DEFAULT[p.id] || {gp2025:20,fed:20,inicial:20};
            const isEditing = editingId === p.id;
            return (
              <tr key={p.id} style={S.tr}>
                <td style={{...S.td,textAlign:"left",fontSize:11,color:"#6b7280",fontFamily:"monospace"}}>{p.id}</td>
                <td style={{...S.td,textAlign:"left",fontSize:12}}>
                  {isEditing
                    ? <input style={{...S.input,padding:"4px 6px",fontSize:12}} type="text" value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})} />
                    : <span style={{fontWeight:500}}>{p.name}</span>}
                </td>
                <td style={S.td}>
                  {isEditing
                    ? <input style={{...S.input,width:55,textAlign:"center",padding:"4px",fontSize:12}} type="number" min={0} max={54} value={editForm.inicial}
                        onChange={e => setEditForm({...editForm, inicial: e.target.value})} />
                    : <span style={{fontWeight:700,color:"#1a472a"}}>{h.inicial}</span>}
                </td>
                <td style={S.td}>
                  {isEditing
                    ? <input style={{...S.input,width:55,textAlign:"center",padding:"4px",fontSize:12}} type="number" min={0} max={54} value={editForm.fed}
                        onChange={e => setEditForm({...editForm, fed: e.target.value})} />
                    : <span style={{color:"#6b7280"}}>{h.fed}</span>}
                </td>
                <td style={S.td}>
                  <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                    {isEditing ? <>
                      <button style={{...S.btn,padding:"4px 8px",fontSize:11,borderRadius:5,border:"none",backgroundColor:"#1a472a",color:"#fff",fontWeight:600}} onClick={saveEdit}>✓ Guardar</button>
                      <button style={{...S.btn,padding:"4px 8px",fontSize:11,borderRadius:5,border:"1px solid #d1d5db",backgroundColor:"#fff"}} onClick={cancelEdit}>Cancelar</button>
                    </> : <>
                      <button style={{...S.btn,padding:"4px 8px",fontSize:11,borderRadius:5,border:"1px solid #d1d5db",backgroundColor:"#fff"}} onClick={()=>startEdit(p)}>✏️ Editar</button>
                      <button style={{...S.btn,padding:"4px 8px",fontSize:11,borderRadius:5,border:"1px solid #fca5a5",backgroundColor:"#fef2f2",color:"#991b1b"}} onClick={()=>deletePlayer(p)}>🗑️</button>
                    </>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody></table></div>
      </div>

      {/* HCP Inicial 2026 - Editable */}
      <div style={S.card}>
        <div style={S.cardHdr}>
          <h2 style={{...S.cardTitle,margin:0}}>HCP Inicial 2026</h2>
          <button style={{...S.btn,...S.btnS,fontSize:11,padding:"4px 10px"}} onClick={resetHcp}>🔄 Restaurar</button>
        </div>
        <p style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Art. 15: Menor entre GP 2025 y Federación. Edita si necesitas ajustar.</p>
        <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
          <th style={{...S.th,textAlign:"left"}}>Jugador</th>
          <th style={S.th}>GP 2025</th>
          <th style={S.th}>Fed</th>
          <th style={{...S.th,color:"#1a472a"}}>Inicial 2026</th>
        </tr></thead><tbody>
          {players.map(p => {
            const h = hcp2026[p.id] || HCP_2026_DEFAULT[p.id] || {gp2025:20,fed:20,inicial:20};
            return (
              <tr key={p.id} style={S.tr}>
                <td style={{...S.td,textAlign:"left",fontWeight:500,fontSize:12}}>{p.name}</td>
                <td style={{...S.td,fontSize:12,color:"#6b7280"}}>{h.gp2025}</td>
                <td style={{...S.td,fontSize:12,color:"#6b7280"}}>{h.fed}</td>
                <td style={S.td}>
                  <input style={{...S.input,width:55,textAlign:"center",fontWeight:700,color:"#1a472a",padding:"4px"}} type="number" min={0} max={36}
                    value={h.inicial}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      saveHcp2026({...hcp2026, [p.id]: {...h, inicial: val}});
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody></table></div>
      </div>

      <PhotoCleanup rounds={rounds} photoIndex={photoIndex} />

      <div style={S.card}>
        <h2 style={S.cardTitle}>Datos</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button style={{...S.btn,...S.btnS}} onClick={resetToDefault}>🔄 Restaurar datos Excel 2025</button>
          <button style={{...S.btn,padding:"10px 20px",borderRadius:8,border:"1px solid #fca5a5",backgroundColor:"#fef2f2",color:"#991b1b",fontWeight:600,fontSize:13,cursor:"pointer"}} onClick={clearAll}>🗑️ Borrar Todo</button>
        </div>
      </div>
    </div>
  );
}


// ======== REGLAMENTO ========
function Reglamento({hcp2026, saveHcp2026, isAdmin}) {
  const [section, setSection] = useState("general");
  const sections = [
    {id:"general",label:"General"},
    {id:"competencia",label:"Competencia"},
    {id:"handicap",label:"Handicap"},
    {id:"empates",label:"Empates"},
    {id:"cuotas",label:"Cuotas"},
    {id:"hcp2026",label:"HCP 2026"},
  ];
  return (
    <div style={S.view}>
      <div style={S.hdr}><h1 style={S.title}>Reglamento Copa Grosspi 2026</h1></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {sections.map(s => (
          <button key={s.id} style={{...S.chip,...(section===s.id?{backgroundColor:"#1a472a",color:"#fff",borderColor:"#1a472a"}:{})}} onClick={()=>setSection(s.id)}>{s.label}</button>
        ))}
      </div>

      {section==="general" && <div style={S.card}>
        <h2 style={S.cardTitle}>Capítulo I: Socios</h2>
        <div style={S.regText}>
          <p><b>Art. 1:</b> La Copa Grosspi es un campeonato entre socios del Club de Golf Lomas de La Dehesa. Su propósito es <b>cultivar la amistad y la camaradería</b>. Cualquier discusión deberá resolverse antes de llegar al hoyo 19.</p>
          <p><b>Art. 2:</b> El socio deberá tener índice de la Federación Chilena de Golf vigente.</p>
          <p><b>Art. 3:</b> Campeonato del 3 de marzo al 7 de diciembre 2026. Premiación: jueves 12 de diciembre.</p>
          <p><b>Art. 4 - Comité Organizador:</b></p>
          <p>🏌️ Jaime Gutiérrez - Presidente<br/>💰 Ricardo Marín - Tesorero<br/>📊 Sergio Beckdorf - Estadísticas<br/>🎉 Agustín Larraín - Diversión</p>
          <p><b>Art. 5:</b> Nuevos socios requieren presentación por 4 integrantes, 3 juegos con diferentes jugadores, informe favorable, y HCP máximo 26 en Federación.</p>
          <p><b>Art. 7:</b> La falta de caballerosidad será sancionada con eliminación del registro.</p>
        </div>
      </div>}

      {section==="competencia" && <div style={S.card}>
        <h2 style={S.cardTitle}>Capítulo II: Competencia</h2>
        <div style={S.regText}>
          <p><b>Art. 8:</b> Acumulación de puntajes. <b>12 fechas</b>: 10 mensuales + 2 adicionales (a elección, máx 1 adicional por mes). En noviembre se puede jugar la fecha de diciembre.</p>
          <p style={{backgroundColor:"#f0f7f0",padding:12,borderRadius:8,fontWeight:600}}>Se consideran las <b>7 mejores tarjetas</b> jugadas en el campeonato anual. Se eliminan hasta 5 de las peores.</p>
          <p>Tarjeta válida: mínimo <b>3 jugadores Grosspi</b> presentes. Avisar antes de la salida vía chat oficial.</p>
          <p><b>Art. 9:</b> 18 hoyos, <b>Stableford Neto</b>, competencia individual por fecha.</p>
          <p><b>Art. 10 - Excepciones:</b></p>
          <p>✅ Mulligan en hoyo 1 (no elegible)<br/>✅ Lie mejorado según estado de cancha (definido por Comité)<br/>❌ No hay "dada" — la pelota debe entrar al hoyo</p>
          <p><b>Art. 11:</b> Ranking anual = suma de puntos Stableford de las 7 mejores tarjetas (score neto).</p>
          <p><b>Art. 13:</b> Premios para 1°, 2° y 3° lugar.</p>
          <p><b>Copa del Picado:</b> Se juega el día de la premiación. Mejor neto gana (no puede ser top 3 del campeonato).</p>
        </div>
      </div>}

      {section==="handicap" && <div style={S.card}>
        <h2 style={S.cardTitle}>Capítulo IV: Reglamento del Handicap</h2>
        <div style={S.regText}>
          <p><b>Art. 15:</b> HCP Grosspi = <b>36 - Puntos Gross</b> obtenidos en la fecha.</p>
          <p>Ejemplo: 14 pts gross → HCP = 36 - 14 = 22</p>
          <div style={{overflowX:"auto"}}><table style={{...S.tbl,fontSize:12,marginTop:12}}>
            <thead><tr><th style={{...S.th,textAlign:"left"}}>Fecha</th><th style={{...S.th,textAlign:"left"}}>Cálculo del HCP</th></tr></thead>
            <tbody>
              <tr style={S.tr}><td style={{...S.td,textAlign:"left",fontWeight:600}}>T1</td><td style={{...S.td,textAlign:"left"}}>HCP Inicial (menor entre GP 2025 y Federación)</td></tr>
              <tr style={S.tr}><td style={{...S.td,textAlign:"left",fontWeight:600}}>T2</td><td style={{...S.td,textAlign:"left"}}>Promedio(Inicial, T1), con tope de +2 si sube</td></tr>
              <tr style={S.tr}><td style={{...S.td,textAlign:"left",fontWeight:600}}>T3</td><td style={{...S.td,textAlign:"left"}}>Promedio(Inicial, T1, T2)</td></tr>
              <tr style={S.tr}><td style={{...S.td,textAlign:"left",fontWeight:600}}>T4</td><td style={{...S.td,textAlign:"left"}}>Promedio de las 3 mejores (incluido Inicial)</td></tr>
              <tr style={S.tr}><td style={{...S.td,textAlign:"left",fontWeight:600}}>T5</td><td style={{...S.td,textAlign:"left"}}>Promedio de las 3 mejores de las últimas 4 jugadas</td></tr>
              <tr style={S.tr}><td style={{...S.td,textAlign:"left",fontWeight:600}}>T6+</td><td style={{...S.td,textAlign:"left"}}>Promedio de las 3 mejores de las últimas 5 jugadas</td></tr>
            </tbody>
          </table></div>
          <p style={{marginTop:12}}>Jugadores nuevos (sin HCP Grosspi): parten con <b>Federación al 80%</b> en T1.</p>
        </div>
      </div>}

      {section==="empates" && <div style={S.card}>
        <h2 style={S.cardTitle}>Capítulo V: Empates</h2>
        <div style={S.regText}>
          <p><b>Art. 16:</b> Los empates se dirimen por:</p>
          <p>1️⃣ Suma de las <b>mejores 3 tarjetas</b><br/>2️⃣ Si persiste, las <b>mejores 2 tarjetas</b><br/>3️⃣ Luego las <b>mejor tarjeta</b><br/>🪙 Si persiste aún, se define por moneda al aire.</p>
        </div>
      </div>}

      {section==="cuotas" && <div style={S.card}>
        <h2 style={S.cardTitle}>Capítulo III: Cuotas</h2>
        <div style={S.regText}>
          <p><b>Art. 14:</b> Cuota anual 2026: <b>$100.000</b></p>
          <p>Destinos: compra de premios, comida anual, regalos/rifas.</p>
          <p>Todos pagan sin excepciones, independiente de si participan o asisten a la comida.</p>
          <p><b>Art. 18:</b> Fondo extraprogramático: máx $300.000 para actividades con al menos 10 integrantes.</p>
          <p style={{marginTop:12,backgroundColor:"#f9fafb",padding:12,borderRadius:8}}>
            <b>Rendición 2025:</b> Ingresos $3.439.648 · Gastos $2.890.392<br/>
            <b>Saldo Caja 2025: $549.256</b>
          </p>
        </div>
      </div>}

      {section==="hcp2026" && <div style={S.card}>
        <h2 style={S.cardTitle}>Handicaps Iniciales 2026</h2>
        <p style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Menor entre GP 2025 y Federación Marzo 2026</p>
        <div style={S.tblWrap}><table style={S.tbl}><thead><tr>
          <th style={S.th}>#</th><th style={{...S.th,textAlign:"left"}}>Jugador</th>
          <th style={S.th}>GP 2025</th><th style={S.th}>Fed 03/26</th>
          <th style={{...S.th,color:"#1a472a"}}>Inicial 2026</th>
        </tr></thead><tbody>
          {Object.entries(hcp2026).sort((a,b) => a[1].inicial - b[1].inicial).map(([pid, h], i) => {
            const p = INIT_PLAYERS.find(x => x.id === pid);
            return p ? (
              <tr key={pid} style={S.tr}>
                <td style={S.td}>{i+1}</td>
                <td style={{...S.td,textAlign:"left",fontWeight:500}}>{p.name}</td>
                <td style={S.td}>{h.gp2025}</td>
                <td style={S.td}>{h.fed}</td>
                <td style={{...S.td,fontWeight:700,color:"#1a472a"}}>{h.inicial}</td>
              </tr>
            ) : null;
          })}
        </tbody></table></div>
      </div>}
    </div>
  );
}

// ======== STYLES ========
const S = {
  app:{display:"flex",minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",backgroundColor:"#f5f7f3",color:"#1a2e1a"},
  hamburger:{position:"fixed",top:10,left:10,zIndex:1001,width:38,height:38,borderRadius:8,border:"1px solid #d1d5db",backgroundColor:"#fff",fontSize:18,cursor:"pointer",display:"none",alignItems:"center",justifyContent:"center"},
  sidebar:{width:230,backgroundColor:"#1a2e1a",color:"#e8f0e8",display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:1000,transition:"transform 0.3s"},
  sidebarOpen:{transform:"translateX(0)"},
  logoWrap:{padding:"16px 20px",borderBottom:"1px solid #2d4a2d",display:"flex",justifyContent:"center"},
  logoImg:{width:100,borderRadius:8},
  navList:{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:1},
  navBtn:{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:7,border:"none",backgroundColor:"transparent",color:"#b0c8b0",fontSize:13,fontWeight:500,cursor:"pointer",textAlign:"left",width:"100%",transition:"all 0.15s"},
  navActive:{backgroundColor:"#2d4a2d",color:"#fff"},
  sideFooter:{padding:"12px 16px",borderTop:"1px solid #2d4a2d"},
  yearSelector:{display:"flex",gap:4,padding:"8px 10px",borderBottom:"1px solid #2d4a2d"},
  yearBtn:{flex:1,padding:"6px 8px",borderRadius:6,border:"1px solid #3d5a3d",backgroundColor:"transparent",color:"#7a9a7a",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center",transition:"all 0.15s"},
  yearBtnActive:{backgroundColor:"#4a7a4a",color:"#fff",borderColor:"#4a7a4a"},
  footLabel:{fontSize:11,color:"#7a9a7a"},
  main:{flex:1,marginLeft:230,padding:"20px 28px",maxWidth:1100},
  view:{maxWidth:960},
  hdr:{marginBottom:20},
  title:{fontSize:24,fontWeight:800,letterSpacing:"-0.03em",color:"#0f1f0f",margin:0},
  sub:{fontSize:13,color:"#6b7280",marginTop:4},
  grid4:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:20},
  kpi:{backgroundColor:"#fff",borderRadius:10,padding:"16px 12px",textAlign:"center",border:"1px solid #e5e7eb",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"},
  kpiVal:{fontSize:26,fontWeight:800,color:"#1a472a",letterSpacing:"-0.02em"},
  kpiLbl:{fontSize:11,color:"#6b7280",marginTop:2,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.04em"},
  card:{backgroundColor:"#fff",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #e5e7eb",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"},
  cardHdr:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  cardTitle:{fontSize:14,fontWeight:700,color:"#0f1f0f",margin:"0 0 12px"},
  tblWrap:{overflowX:"auto",margin:"0 -4px",padding:"0 4px"},
  tbl:{width:"100%",borderCollapse:"collapse",fontSize:13},
  th:{padding:"8px 6px",textAlign:"center",fontWeight:600,color:"#6b7280",borderBottom:"2px solid #e5e7eb",fontSize:11,textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"},
  thS:{padding:"5px 3px",textAlign:"center",fontWeight:600,color:"#6b7280",borderBottom:"2px solid #e5e7eb",fontSize:10,whiteSpace:"nowrap"},
  tr:{borderBottom:"1px solid #f3f4f6",transition:"background-color 0.1s"},
  td:{padding:"8px 6px",textAlign:"center",whiteSpace:"nowrap"},
  tdS:{padding:"5px 3px",textAlign:"center",fontSize:11,whiteSpace:"nowrap"},
  rank:{display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,borderRadius:"50%",fontSize:11,fontWeight:700,backgroundColor:"#f3f4f6",color:"#6b7280"},
  rank0:{backgroundColor:"transparent",fontSize:16},
  rank1:{backgroundColor:"transparent",fontSize:16},
  rank2:{backgroundColor:"transparent",fontSize:16},
  link:{border:"none",backgroundColor:"transparent",color:"#1a472a",fontWeight:600,fontSize:12,cursor:"pointer"},
  back:{border:"none",backgroundColor:"transparent",color:"#1a472a",fontWeight:600,fontSize:13,cursor:"pointer",padding:"0 0 12px"},
  roundRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",transition:"background-color 0.1s"},
  roundCard:{display:"flex",alignItems:"center",padding:"14px 16px",backgroundColor:"#fff",borderRadius:8,border:"1px solid #e5e7eb",marginBottom:6,cursor:"pointer",transition:"all 0.15s"},
  playerGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10},
  playerCard:{backgroundColor:"#fff",borderRadius:10,padding:14,border:"1px solid #e5e7eb",cursor:"pointer",transition:"all 0.15s"},
  avatar:{width:38,height:38,borderRadius:"50%",backgroundColor:"#d1fae5",color:"#1a472a",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16},
  chip:{padding:"6px 12px",borderRadius:18,border:"1px solid #d1d5db",backgroundColor:"#fff",fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"},
  dropZone:{border:"2px dashed #d1d5db",borderRadius:14,padding:28,textAlign:"center",cursor:"pointer",transition:"all 0.2s",backgroundColor:"#fff",minHeight:180,display:"flex",alignItems:"center",justifyContent:"center"},
  btn:{cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"},
  btnP:{padding:"10px 18px",borderRadius:8,border:"none",backgroundColor:"#1a472a",color:"#fff",fontWeight:600,fontSize:13},
  btnS:{padding:"10px 18px",borderRadius:8,border:"1px solid #d1d5db",backgroundColor:"#fff",color:"#374151",fontWeight:500,fontSize:13},
  label:{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.04em"},
  input:{width:"100%",padding:"8px 10px",borderRadius:7,border:"1px solid #d1d5db",fontSize:13,outline:"none",boxSizing:"border-box"},
  empty:{textAlign:"center",padding:"60px 20px",color:"#6b7280"},
  regText:{fontSize:13,lineHeight:1.7,color:"#374151"},
  loadScreen:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh"},
};

// CSS injected via layout - no DOM manipulation needed in Next.js
if (typeof document !== "undefined") {
  const styleId = "grosspi-styles";
  if (!document.getElementById(styleId)) {
    const css = document.createElement("style");
    css.id = styleId;
    css.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }

  /* ── Desktop ── */
  .grosspi-hamburger { display: none !important; }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .grosspi-hamburger { display: flex !important; }
    .grosspi-nav { transform: translateX(-100%); }
    .grosspi-nav.open { transform: translateX(0); }
    .mob-overlay { display: block !important; }
    main { margin-left: 0 !important; padding: 56px 12px 24px !important; }
  }

  button:hover { opacity: 0.88; }
  tr:hover { background-color: #f9fafb; }
  input:focus, select:focus { border-color: #1a472a; box-shadow: 0 0 0 2px rgba(26,71,42,0.1); }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }

  /* Prevent zoom on input focus iOS */
  @media (max-width: 768px) {
    input[type="number"], input[type="text"], input[type="date"], select {
      font-size: 16px !important;
    }
  }
`;
    document.head.appendChild(css);
  }
}
