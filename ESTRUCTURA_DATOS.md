# 📊 ESTRUCTURA DE DATOS FIREBASE

## Cómo se ven los datos en Firebase Console

```
REALTIME DATABASE
├── rounds/
│   ├── r2026-01 (Ronda 1)
│   │   ├── id: "r2026-01"
│   │   ├── name: "T1 - Marzo"
│   │   ├── date: "2026-03-15"
│   │   └── scores/
│   │       ├── p01: [4, 5, 3, 4, 5, 3, 4, 5, 5, 4, 5, 4, 5, 4, 3, 4, 3, 4]
│   │       ├── p02: [4, 6, 3, 5, 6, 4, 5, 6, 6, 5, 6, 5, 6, 5, 4, 5, 4, 5]
│   │       ├── p03: [5, 6, 5, 7, 5, 4, 5, 7, 6, 8, 9, 5, 7, 6, 3, 5, 5, 5]
│   │       └── ... (más jugadores)
│   │
│   └── r2026-02 (Ronda 2)
│       ├── id: "r2026-02"
│       ├── name: "T2 - Abril"
│       ├── date: "2026-04-12"
│       └── scores/
│           └── ... (misma estructura)
│
├── hcp2026/
│   ├── p01: {gp2025: 19, fed: 19, inicial: 19}
│   ├── p02: {gp2025: 19, fed: 19, inicial: 19}
│   ├── p03: {gp2025: 27, fed: 27, inicial: 27}
│   └── ... (más jugadores)
```

---

## 📋 EJEMPLO COMPLETO DE UNA RONDA

Esto es lo que debes pegar en Firebase Console:

```json
{
  "id": "r2026-01",
  "name": "T1 - Marzo 2026",
  "date": "2026-03-15",
  "scores": {
    "p01": [4, 5, 3, 4, 5, 3, 4, 5, 5, 4, 5, 4, 5, 4, 3, 4, 3, 4],
    "p02": [4, 6, 3, 5, 6, 4, 5, 6, 6, 5, 6, 5, 6, 5, 4, 5, 4, 5],
    "p03": [5, 6, 5, 7, 5, 4, 5, 7, 6, 8, 9, 5, 7, 6, 3, 5, 5, 5],
    "p04": [4, 5, 4, 5, 6, 3, 6, 7, 7, 5, 7, 5, 5, 5, 3, 5, 4, 5],
    "p05": [4, 6, 4, 6, 5, 4, 6, 8, 6, 6, 7, 4, 6, 6, 5, 8, 6, 7],
    "p06": [5, 7, 4, 6, 5, 4, 5, 6, 8, 6, 6, 5, 7, 7, 4, 7, 4, 7],
    "p07": [5, 7, 3, 7, 5, 4, 4, 6, 7, 5, 8, 4, 7, 3, 5, 7, 5, 7],
    "p08": [5, 7, 3, 5, 4, 4, 4, 6, 7, 3, 6, 5, 6, 4, 5, 5, 3, 4]
  }
}
```

---

## 👤 ESTRUCTURA DE JUGADORES

La app trae jugadores del código (no los carga de Firebase), pero aquí está la lista:

```javascript
[
  {id: "p01", name: "Agustín Larraín", handicap: 19},
  {id: "p02", name: "Carlos Gana", handicap: 19},
  {id: "p03", name: "Carlos Pucci", handicap: 27},
  {id: "p04", name: "Gonzalo Errázuriz", handicap: 21},
  {id: "p05", name: "Jaime Gutiérrez", handicap: 21},
  {id: "p06", name: "Jaime Silva", handicap: 15},
  {id: "p07", name: "Jorge Labra", handicap: 18},
  {id: "p08", name: "Jorge Mandiola", handicap: 15},
  {id: "p09", name: "Jorge Méndez", handicap: 23},
  {id: "p10", name: "José Ignacio Amenábar", handicap: 20},
  {id: "p11", name: "José Manuel Donoso", handicap: 17},
  {id: "p12", name: "Juan A. Ruiz-Tagle", handicap: 14},
  {id: "p13", name: "Mario Hanckes", handicap: 17},
  {id: "p14", name: "Ricardo Delaño", handicap: 20},
  {id: "p15", name: "Ricardo Marín", handicap: 18},
  {id: "p16", name: "Rodrigo Alarcón", handicap: 22},
  {id: "p17", name: "Rodrigo López", handicap: 28},
  {id: "p18", name: "Rony Obach", handicap: 20},
  {id: "p19", name: "Sergio Beckdorf", handicap: 17},
  {id: "p20", name: "Sergio Mangelsdorff", handicap: 31},
  {id: "p21", name: "Sergio Urzúa", handicap: 12}
]
```

---

## ⛳ ESTRUCTURA DEL CAMPO

```javascript
{
  name: "Las Lomas de La Dehesa",
  pars: [4, 4, 3, 4, 4, 3, 4, 5, 5, 4, 5, 4, 5, 4, 3, 4, 3, 4],
  handicapIndex: [15, 3, 17, 5, 11, 13, 7, 1, 9, 10, 6, 14, 4, 16, 8, 2, 18, 12]
}

// Par total: 72 (4+4+3+4+4+3+4+5+5+4+5+4+5+4+3+4+3+4)
// Hoyos: 18 (índices 0-17)
```

---

## 🎯 CÓMO AGREGAR UNA RONDA EN FIREBASE CONSOLE

### Paso 1: Ve a Realtime Database
```
https://console.firebase.google.com
→ Tu proyecto Grosspi
→ Realtime Database
```

### Paso 2: Haz click en el botón "+" al lado de `rounds`

### Paso 3: Llena la estructura

**Campo: `id`**
```
Valor: r2026-02 (o r2026-03, etc.)
Tipo: String
```

**Campo: `name`**
```
Valor: T2 - Abril
Tipo: String
```

**Campo: `date`**
```
Valor: 2026-04-12
Tipo: String
```

**Campo: `scores`** (esto es complicado en UI, mejor en JSON)
```
Valor: {"p01": [4,5,3,...], "p02": [4,6,3,...], ...}
Tipo: Object
```

---

## 📝 CÓMO EDITAR UN SCORE YA CARGADO

### Opción 1: En Firebase Console (fácil)
1. Ve a `rounds` → [id_ronda] → `scores` → [id_jugador] → [índice_hoyo]
2. Haz click en el número
3. Edita y guarda
4. **Al instante aparece en todos los navegadores**

### Opción 2: Desde app (pronto)
- Cuando implemente panel de edición

---

## 📊 DATOS DE 2025 (Histórico)

Si quieres cargar datos de 2025, necesitas:
1. Convertir Excel a JSON
2. Crear rondas con `date: "2025-03-21"`, etc.
3. Pegar en Firebase

**Formato ejemplo 2025:**
```json
{
  "id": "r2025-01",
  "name": "T1 - Marzo",
  "date": "2025-03-21",
  "scores": {
    "p01": [5, 6, 3, 6, 7, 4, 4, 6, 6, 6, 6, 7, 7, 8, 5, 7, 4, 4],
    "p02": [4, 6, 6, 4, 7, 6, 6, 6, 7, 7, 8, 7, 6, 6, 5, 6, 5, 6],
    ...
  }
}
```

El año se detecta automáticamente del `date`.

---

## 🔄 HANDICAP DINÁMICO 2026

Estructura en `hcp2026`:
```json
{
  "p01": {
    "gp2025": 19,        // Handicap 2025 inicial
    "fed": 19,           // Handicap federado
    "inicial": 19        // Handicap inicial 2026
  },
  "p02": {
    "gp2025": 19,
    "fed": 19,
    "inicial": 19
  },
  ...
}
```

**Para 2026**, la app calcula el handicap dinámico basado en:
- Promedio de strokes en rondas pasadas
- Ajusta automáticamente para cada ronda

---

## ✏️ EDITAR CAMPOS INDIVIDUALES

### Para cambiar UN hoyo:
1. Firebase Console
2. `rounds` → `r2026-01` → `scores` → `p01`
3. Vas al índice [4] (5to hoyo, contando desde 0)
4. Cambias el número
5. Listo

### Para cambiar UNA ronda completa:
1. Borra la ronda y crea nueva
2. O edita cada score uno por uno

### Para agregar UN jugador a una ronda existente:
1. Navega a `rounds` → [id_ronda] → `scores`
2. Haz click en `+` para agregar campo
3. Campo: `p99` (nuevo jugador)
4. Valor: `[4,5,3,4,5,3,4,5,5,4,5,4,5,4,3,4,3,4]`

---

## 🚀 INICIALIZACIÓN RÁPIDA

Si quieres cargar todo de una vez (JSON bulk):

1. En Firebase Console, ve a **Realtime Database**
2. Haz click en los 3 puntos (...) en la raíz
3. Selecciona **"Importar JSON"**
4. Pega esto:

```json
{
  "rounds": {
    "r2026-01": {
      "id": "r2026-01",
      "name": "T1 - Marzo",
      "date": "2026-03-15",
      "scores": {
        "p01": [4, 5, 3, 4, 5, 3, 4, 5, 5, 4, 5, 4, 5, 4, 3, 4, 3, 4]
      }
    }
  },
  "hcp2026": {
    "p01": {"gp2025": 19, "fed": 19, "inicial": 19}
  }
}
```

5. Click en "Importar"

---

## 📌 NOTAS IMPORTANTES

- **Hoyos**: Siempre 18 (índices 0-17)
- **Par total**: 72
- **Scores**: Deben ser números enteros
- **Fecha**: Formato YYYY-MM-DD
- **Jugador ausente**: No incluir en `scores`
- **Handicap**: Automático para 2026 si hay datos previos

---

## 🔗 RELACIÓN DATOS - INTERFAZ

```
Firebase (fuente de verdad)
    ↓
App React recibe en tiempo real
    ↓
Calcula Stableford (net/gross)
    ↓
Ranking ordenado (best 7)
    ↓
Muestra en navegador
    ↓
Todo sincronizado entre usuarios
```

---

## ❓ PREGUNTAS COMUNES

**P: ¿Qué pasa si un jugador no juega una ronda?**
R: No lo incluyas en `scores` de esa ronda. Automáticamente no aparece.

**P: ¿Puedo editar fecha después?**
R: Sí. En Firebase, ve a `rounds` → [id] → `date` y cambias.

**P: ¿Los scores deben ser 18 siempre?**
R: Sí, la app asume 18 hoyos. Si alguien jugó 9, pones "0" en los otros 9.

**P: ¿Puedo agregar un jugador nuevo?**
R: Sí, pero requiere cambiar el código de `app/page.jsx`. Mejor consultar.

---

*Guarda esta estructura para referencia cuando cargues datos* 📌
