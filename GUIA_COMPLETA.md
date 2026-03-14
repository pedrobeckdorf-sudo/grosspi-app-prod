# 🏌️ GUÍA COMPLETA: Publicar Grosspi App

## 📋 Índice
1. [Crear proyecto Firebase](#firebase)
2. [Configurar base de datos en Firebase](#database)
3. [Obtener credenciales Firebase](#credentials)
4. [Subir a GitHub](#github)
5. [Desplegar en Vercel](#vercel)
6. [Compartir con los amigos](#share)

---

## 1. Crear Proyecto Firebase {#firebase}

### Paso 1: Entrar a Firebase Console
1. Abre [https://console.firebase.google.com](https://console.firebase.google.com)
2. Inicia sesión con tu cuenta Google
3. Haz click en **"Crear un proyecto"**

### Paso 2: Configurar proyecto
- **Nombre del proyecto**: `Grosspi` (o el que prefieras)
- **ID del proyecto**: Auto-generado está bien
- **Deshabilita Google Analytics** (no lo necesitamos) 
- Click **"Crear proyecto"**
- Espera 1-2 minutos hasta que se cree

### Paso 3: Seleccionar Firebase Realtime Database
Una vez creado el proyecto:
1. En el menú izquierdo, ve a **"Realtime Database"**
2. Click en **"Crear base de datos"**
3. Selecciona región: **us-east-1** (está bien)
4. Reglas de seguridad: Elige **"Iniciar en modo de prueba"**
   - ⚠️ **Importante**: Después vamos a cambiar las reglas
5. Click **"Habilitar"**

---

## 2. Configurar Reglas de Seguridad {#security}

Una vez creada la BD:

1. Haz click en la pestaña **"Reglas"**
2. Reemplaza todo el contenido con esto:

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

3. Click en **"Publicar"**

---

## 3. Obtener Credenciales Firebase {#credentials}

1. En Firebase Console, haz click en el ⚙️ **(Configuración del proyecto)** en la esquina superior izquierda
2. Ve a la pestaña **"General"**
3. Desplázate hasta **"Tus apps"**
4. Si no hay apps, haz click en **"Agregar app"** → selecciona ícono `</>`  (Web)
5. Dale un nombre (ej: "Grosspi App")
6. **COPIA ESTE BLOQUE** (aparecerá en la pantalla):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "grosspi.firebaseapp.com",
  databaseURL: "https://grosspi.firebaseio.com",
  projectId: "grosspi-xyz",
  storageBucket: "grosspi-xyz.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123456:web:abc123..."
};
```

**ESTOS VALORES SON TU CONTRASEÑA** - Guárdalos en un lugar seguro.

---

## 4. Subir código a GitHub {#github}

### Opción A: Si usas GitHub (recomendado)

1. Crea una cuenta en [github.com](https://github.com) si no tienes
2. Crea un nuevo repositorio:
   - Nombre: `grosspi-app`
   - Privado o público (ambos funcionan)
3. En tu computadora, copia todos los archivos en una carpeta llamada `grosspi-app`
4. Abre terminal/PowerShell en esa carpeta y ejecuta:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tuusuario/grosspi-app.git
git push -u origin main
```

### Opción B: Sin GitHub

Si no quieres usar GitHub, saltate a la sección "Deploy directo en Vercel"

---

## 5. Deploy en Vercel {#vercel}

### Opción A: Desde GitHub (2 minutos)

1. Abre [vercel.com](https://vercel.com) 
2. Haz click en **"Sign Up"** - crea cuenta o usa GitHub
3. Cuando te pida conectar repo, elige GitHub
4. Busca tu repo `grosspi-app`
5. Haz click en **"Import"**
6. **Vercel te pedirá "Environment Variables"**:
   - En "Environment Variables", llena estos campos:
     - `NEXT_PUBLIC_FIREBASE_API_KEY` = `AIzaSyD...` (de tu credencial)
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `grosspi.firebaseapp.com`
     - `NEXT_PUBLIC_FIREBASE_DATABASE_URL` = `https://grosspi.firebaseio.com`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `grosspi-xyz`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `grosspi-xyz.appspot.com`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = `123456`
     - `NEXT_PUBLIC_FIREBASE_APP_ID` = `1:123456:web:abc123...`

7. Click en **"Deploy"**
8. Espera 2-3 minutos (te mostrará el progreso)
9. ¡Listo! Vercel te dará una URL como: **https://grosspi-app.vercel.app**

### Opción B: Drag-and-Drop directo en Vercel

1. Abre [vercel.com](https://vercel.com)
2. Crea cuenta
3. En el dashboard, haz drag-and-drop de la carpeta `grosspi-app`
4. Sigue los mismos pasos de "Environment Variables"

---

## 6. Compartir con los amigos {#share}

Una vez deployado, tienes una URL como:
```
https://grosspi-app.vercel.app
```

**Cómo compartir:**

1. Envía el link a tu papá y amigos por WhatsApp, email, etc.
2. Todos abren el link en el navegador (sin instalar nada)
3. **Primera vez**: Ingresan el código `GROSSPI2026`
4. ¡Listo! Ven todos los datos sincronizados

**Si quieres cambiar el código:**
- En el archivo `app/page.jsx`, cambia esta línea:
  ```javascript
  const ACCESS_CODE = "GROSSPI2026"; // Cambia aquí
  ```
- Luego haz `git push` en GitHub y Vercel auto-redeploya

---

## 7. Estructuras de carpetas

Tu proyecto debería verse así:

```
grosspi-app/
├── app/
│   ├── page.jsx          (Tu app principal)
│   └── layout.jsx        (Layout de Next.js)
├── package.json
├── next.config.js
├── .env.local.example
└── .env.local            (Local - NO subir a GitHub)
```

---

## 8. Cómo manejar datos

### Agregar una nueva ronda:

En Firebase Console:
1. Ve a **Realtime Database**
2. Haz click en el botón **"+"** al lado de `rounds`
3. Agrega un objeto con esta estructura:

```json
{
  "id": "r2026-01",
  "name": "T1 - Marzo",
  "date": "2026-03-15",
  "scores": {
    "p01": [4, 5, 3, 4, 5, 3, 4, 5, 5, 4, 5, 4, 5, 4, 3, 4, 3, 4],
    "p02": [4, 6, 3, 5, 6, 4, 5, 6, 6, 5, 6, 5, 6, 5, 4, 5, 4, 5],
    ...
  }
}
```

### Actualizar un score:
1. En Firebase Console, navega a `rounds > [id_ronda] > scores > [id_jugador]`
2. Haz click en el número a cambiar
3. Edita y listo - **se sincroniza al instante en todos los navegadores**

---

## 9. Troubleshooting

### Problema: "Error de conexión a Firebase"
**Causa**: Environment variables incorrectas  
**Solución**: En Vercel → Settings → Environment Variables, verifica cada valor esté exacto

### Problema: "Base de datos vacía"
**Causa**: Firebase se creó pero sin datos  
**Solución**: 
1. En Firebase Console, ve a Realtime Database
2. Haz click en el **"+"** en la raíz
3. Agrega manualmente tus datos

### Problema: "Mensaje de acceso denegado"
**Causa**: Alguien entró un código incorrecto  
**Solución**: Pregunta cuál es el código (es `GROSSPI2026` por defecto)

---

## 10. Próximos pasos

Cuando tengas todo funcionando:

1. **Cargar datos históricos de 2025**:
   - En Firebase Console, bajo `rounds`, agrega todas las rondas de 2025
   - El app automáticamente mostrará 2025 y 2026

2. **Personalizar**:
   - Cambiar color: busca `#4a6741` en `page.jsx` y reemplaza
   - Cambiar código de acceso: modifica `ACCESS_CODE`
   - Cambiar nombre: modifica "Grosspi Championship"

3. **Hacer editable**:
   - Actualmente es solo lectura desde Firebase Console
   - Para que sea editable desde la app, necesito agregar más código
   - ¿Quieres que lo haga?

---

## ❓ Preguntas frecuentes

**P: ¿Es gratis?**  
R: Sí. Firebase tiene tier gratis generoso. Vercel también es gratis para hobby projects.

**P: ¿Los datos se pierden si pago menos?**  
R: No. Si superas límites, Vercel simplemente te pedirá que pagues (pero tardaría MUCHO con golf).

**P: ¿Puedo editar datos desde la app?**  
R: Por ahora solo desde Firebase Console. Si lo necesitas, puedo agregar un panel de edición.

**P: ¿Qué pasa si alguien entra con el código?**  
R: Pueden ver y editar datos. Si quieres más seguridad, puedo agregar autenticación.

---

## 📞 Si tienes problemas

1. Verifica cada valor en `.env.local` está **exactamente** igual al de Firebase Console
2. Revisa que la base de datos en Firebase esté creada (no solo el proyecto)
3. Comprueba que las reglas de seguridad estén publicadas

¡Si algo sigue sin funcionar, muéstrame la url de error y la arreglamos juntos!
