# Finanzas CHC 💰

Aplicación **PWA** de finanzas personales para controlar ingresos y gastos del día a día, con sincronización en tiempo real, soporte offline y exportación a PDF.

## ✨ Funcionalidades

- 🔐 Login con **Google** (cada usuario ve solo sus propios datos)
- ➕ Registro rápido de **ingresos** y **gastos**
- 🏷️ Etiquetas de acceso rápido personalizables
- 📅 Vista por **día** o por **mes**
- 📊 Gráfico circular de balance (gastos vs ingresos)
- 🔎 Búsqueda por detalle
- 🗂️ Historial agrupado por fecha
- 🧾 Exportación de reporte a **PDF** (con totales por día y del mes)
- 📡 **Offline**: los movimientos se guardan en caché local y sincronizan al recuperar conexión
- 📱 Instalable como PWA (service worker + manifest)

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 7 |
| Backend / Base de datos | Firebase (Firestore + Auth) |
| Exportación | jsPDF + jspdf-autotable |
| Tests | Vitest + React Testing Library |
| Despliegue | Firebase Hosting / Vercel |

## 📁 Estructura del proyecto

```
src/
├── components/        # Componentes de UI (cada uno con su CSS)
│   ├── Header.jsx
│   ├── DashboardCard.jsx
│   ├── TransactionForm.jsx
│   ├── HistoryList.jsx
│   ├── ConfirmModal.jsx
│   ├── TagEditorModal.jsx
│   └── Toast.jsx
├── hooks/             # Lógica de estado reutilizable
│   ├── useAuth.js
│   ├── useMovimientos.js
│   ├── useTags.js
│   └── useToast.js
├── utils/             # Funciones puras y cálculo
│   ├── constants.js
│   ├── format.js
│   ├── stats.js
│   └── pdf.js
├── App.jsx            # Orquestador principal
├── firebase.js        # Config de Firebase
└── main.jsx           # Punto de entrada + registro SW
```

## 🚀 Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa los valores desde la consola de Firebase:

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

> Las credenciales son públicas por diseño en una SPA; la seguridad real la dan las **reglas de Firestore** (ver más abajo).

### 3. Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Previsualizar el build
npm run lint         # Lint (ESLint)
npm run test         # Tests (Vitest)
npm run test:watch   # Tests en modo watch
```

## 🔒 Seguridad (reglas de Firestore)

Las reglas están versionadas en `firestore.rules` y garantizan que cada usuario solo pueda **leer, crear, actualizar y eliminar sus propios movimientos** y su propia configuración.

Despliegue de las reglas (una sola vez, o cada vez que cambien):

```bash
firebase deploy --only firestore:rules
```

También puedes revisarlas/copiarlas manualmente en la consola: **Firestore → Reglas**.

## 🚢 Despliegue

### Firebase Hosting

```bash
npm run build
firebase deploy
```

### Vercel

```bash
vercel --prod
```

Ambas opciones sirven el SPA con rewrites a `index.html`. El service worker usa estrategia **network-first** para navegación, así que los nuevos deploys se ven al instante sin necesidad de borrar caché.

## 🧪 Tests

Los tests cubren la lógica pura (`calcularStats`, utilidades de formato) y componentes clave (`TransactionForm`, `TagEditorModal`).

```bash
npm run test
```

## 📦 Scripts útiles

- `firebase login` — autenticarte en Firebase CLI
- `firebase deploy --only firestore:rules` — actualizar reglas de seguridad
