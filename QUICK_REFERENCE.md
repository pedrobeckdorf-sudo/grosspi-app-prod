# 🏃 QUICK REFERENCE - Setup en 3 pasos

## 1️⃣ FIREBASE (10 min)

```
https://console.firebase.google.com
  → Crear proyecto "Grosspi"
  → Realtime Database
  → Copiar 7 credenciales
  → Cambiar reglas de seguridad
```

### 🔑 7 Credenciales que necesitas:

```
1. NEXT_PUBLIC_FIREBASE_API_KEY           = AIzaSy...
2. NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN       = grosspi.firebaseapp.com
3. NEXT_PUBLIC_FIREBASE_DATABASE_URL      = https://grosspi.firebaseio.com
4. NEXT_PUBLIC_FIREBASE_PROJECT_ID        = grosspi-xyz
5. NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET    = grosspi-xyz.appspot.com
6. NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER  = 123456
7. NEXT_PUBLIC_FIREBASE_APP_ID            = 1:123456:web:abc...
```

### 📋 Reglas de seguridad (copiar exacto):

```json
{
  "rules": {
    "rounds": {
      ".read": true,
      ".write": true,
      ".validate": true
    },
    "hcp2026": {
      ".read": true,
      ".write": true,
      ".validate": true
    }
  }
}
```

---

## 2️⃣ GITHUB (5 min)

```
https://github.com
  → New repository
  → Nombre: grosspi-app
  → Crear repo
  → Subir archivos
  → Copiar URL repo
```

```bash
# En terminal, carpeta grosspi-app:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tuusuario/grosspi-app.git
git push -u origin main
```

**URL resultado**: `https://github.com/tuusuario/grosspi-app`

---

## 3️⃣ VERCEL (15 min)

```
https://vercel.com
  → Sign Up (con GitHub)
  → Import Project
  → Seleccionar grosspi-app
  → Environment Variables ← PEGA LAS 7 CREDENCIALES
  → Deploy
```

### 🎯 Pega en Environment Variables:

```
Key: NEXT_PUBLIC_FIREBASE_API_KEY
Value: AIzaSy... (del paso 1)

Key: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Value: grosspi.firebaseapp.com

Key: NEXT_PUBLIC_FIREBASE_DATABASE_URL
Value: https://grosspi.firebaseio.com

Key: NEXT_PUBLIC_FIREBASE_PROJECT_ID
Value: grosspi-xyz

Key: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Value: grosspi-xyz.appspot.com

Key: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Value: 123456

Key: NEXT_PUBLIC_FIREBASE_APP_ID
Value: 1:123456:web:abc123...
```

**Resultado**: URL como `https://grosspi-app.vercel.app`

---

## ✅ VERIFY

- [ ] Firebase: Datos aparecen en Console
- [ ] GitHub: Repo público con archivos
- [ ] Vercel: Deploy completado (sin errores)
- [ ] App abre sin errores
- [ ] Código de acceso funciona: `GROSSPI2026`
- [ ] Puedes ver ranking

---

## 🚀 COMPARTIR

Copia URL de Vercel y envía a todos:

```
https://grosspi-app.vercel.app
Código: GROSSPI2026
```

---

## ⚠️ ERRORES COMUNES

| Problema | Causa | Solución |
|----------|-------|----------|
| "Connection error" | Credenciales mal | Copy-paste exacto en Vercel |
| "Empty database" | Firebase sin datos | Agregar en Firebase Console |
| "Wrong code" | Código incorrecto | Es `GROSSPI2026` |
| "502 Bad Gateway" | Deploy fallido | Esperar o re-deploy en Vercel |
| "Blank page" | Env vars no cargadas | Hard refresh (Ctrl+Shift+Del) |

---

## 💻 CREDENCIALES TEMPLATE

**Guárdalas aquí mientras copias:**

```
FIREBASE_API_KEY:
FIREBASE_AUTH_DOMAIN:
FIREBASE_DATABASE_URL:
FIREBASE_PROJECT_ID:
FIREBASE_STORAGE_BUCKET:
FIREBASE_MESSAGING_SENDER:
FIREBASE_APP_ID:
```

---

## 📞 IF STUCK

1. Abre **GUIA_COMPLETA.md** → Sección "Troubleshooting"
2. Verifica credenciales son **EXACTAS**
3. Comprueba Firebase DB está creada
4. Intenta logout/login en navegador
5. Hard refresh: Ctrl+Shift+Del (o Cmd+Shift+Del en Mac)

---

## 🎯 CHECKLIST FINAL

```
FIREBASE:
 [ ] Proyecto creado
 [ ] DB Realtime creada
 [ ] 7 credenciales guardadas
 [ ] Reglas publicadas
 [ ] Datos iniciales cargados (opcional)

GITHUB:
 [ ] Repo creado
 [ ] Archivos subidos
 [ ] URL repo copiada

VERCEL:
 [ ] Importado de GitHub
 [ ] 7 env vars pegadas
 [ ] Deploy completado
 [ ] URL accesible
 [ ] Code de acceso funciona

ANTES DE COMPARTIR:
 [ ] Prueba agregar score en Firebase
 [ ] Verifica aparece en navegador
 [ ] Prueba en 2+ navegadores/dispositivos
 [ ] Código de acceso funciona
```

---

## 🎉 LISTO!

Cuando todo esté checked:

**URL para compartir**: `https://grosspi-app.vercel.app`  
**Código acceso**: `GROSSPI2026`  
**Sin instalación**: Solo navegador  
**Costo**: $0/mes  
**Datos**: Permanentes en Firebase  

---

*Guarda este archivo para referencia rápida* 📌
