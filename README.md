# 🏌️ Grosspi Championship App

App para trackear scores de golf con sincronización en tiempo real entre jugadores.

## ⚡ Quick Start

### Requisitos
- Node.js 18+ (solo si quieres correr localmente)
- Cuenta Google
- Cuenta GitHub (recomendado)

### Pasos rápidos

1. **Firebase**: 
   - Crea proyecto en [console.firebase.google.com](https://console.firebase.google.com)
   - Realtime Database con reglas de seguridad (ver GUIA_COMPLETA.md)
   - Copia credenciales

2. **GitHub**:
   - Sube código a un repo privado
   - Rama `main` debe tener todos los archivos

3. **Vercel**:
   - Importa repo desde [vercel.com](https://vercel.com)
   - Agrega Environment Variables (tus credenciales Firebase)
   - Deploy automático
   - ¡Listo! 🎉

## 📖 Documentación completa

Ver `GUIA_COMPLETA.md` para:
- Instrucciones paso a paso Firebase
- Setup de seguridad
- Deploy en Vercel
- Troubleshooting

## 🎯 Características

✅ Acceso con código  
✅ Sincronización en tiempo real (Firebase)  
✅ Ranking automático (best 7 net/gross)  
✅ Sin instalación (webapp)  
✅ Datos persistentes entre días  
✅ Acceso simultáneo múltiples usuarios  

## 🔧 Dev local

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

## 🚀 Environment Variables

Ver `.env.local.example` para template completo.

**Necesitas estos 7 valores de Firebase**:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 🔐 Seguridad

- Código de acceso (editable en `app/page.jsx`)
- Firebase reglas de lectura/escritura
- Variables de entorno nunca expostas en cliente

## ❓ Problemas?

Ver sección "Troubleshooting" en GUIA_COMPLETA.md

---

**Código de acceso default**: `GROSSPI2026`

Cambiar en `app/page.jsx` línea 7
