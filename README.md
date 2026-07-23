# HikCoach 2026 – HCP Practical Assessment

React app para evaluación práctica HCP. Se despliega en **Netlify** con **Supabase** como base de datos.

---

## 🗄️ Paso 1 — Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto gratis.
2. En el panel, ve a **SQL Editor** y pega el contenido de `supabase_setup.sql`. Ejecuta.
3. Ve a **Project Settings → API** y copia:
   - `Project URL`  →  `REACT_APP_SUPABASE_URL`
   - `anon public key`  →  `REACT_APP_SUPABASE_ANON_KEY`

---

## 💻 Paso 2 — Correr localmente

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de variables de entorno
cp .env.example .env
# Edita .env y pega tus claves de Supabase

# 3. Correr en desarrollo
npm start
```

---

## 🚀 Paso 3 — Desplegar en Netlify

### Opción A: Drag & Drop (más fácil)
```bash
npm run build
```
Luego arrastra la carpeta `build/` a [app.netlify.com/drop](https://app.netlify.com/drop).

### Opción B: GitHub + Netlify (recomendado)
1. Sube el proyecto a un repositorio de GitHub.
2. En Netlify → **Add new site → Import from Git**.
3. Selecciona tu repo. Netlify detecta automáticamente la config de `netlify.toml`.
4. En **Site settings → Environment variables**, agrega:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
5. Haz deploy.

---

## 📁 Estructura del proyecto

```
HikCoach/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx          ← toda la lógica de la app
│   ├── supabaseClient.js
│   └── index.js
├── .env.example         ← copia a .env y llena tus claves
├── .gitignore
├── netlify.toml         ← configuración de Netlify
├── package.json
├── supabase_setup.sql   ← ejecuta esto en Supabase una sola vez
└── README.md
```

---

## 🔑 Acceso de instructor

PIN por defecto: **2026**  
Para cambiarlo, edita la línea `const PIN = "2026"` en `src/App.jsx`.
