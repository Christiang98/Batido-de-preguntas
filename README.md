# 🏕️ Exploradores App — Batallón Pablo César Barton

App para actividades de conocimiento grupal con grupos aleatorios y dinámicas.

---

## 🚀 Deploy en Vercel + Firebase

### 1. Crear proyecto en Firebase

1. Andá a [console.firebase.google.com](https://console.firebase.google.com)
2. Creá un nuevo proyecto (ej: `batallon-pcb`)
3. En el menú lateral → **Realtime Database** → Crear base de datos
4. Elegí modo **test** por ahora (después podés ajustar las reglas)
5. En **Configuración del proyecto** → **Tus apps** → agregá una app Web
6. Copiá las credenciales que te da Firebase

### 2. Clonar y configurar

```bash
git clone <este-repo>
cd exploradores-app
npm install

# Copiá el archivo de ejemplo y completá con tus credenciales
cp .env.example .env.local
```

Editá `.env.local` con los valores de tu proyecto Firebase.

### 3. Correr localmente

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

### 4. Deploy en Vercel

1. Subí el proyecto a GitHub
2. Andá a [vercel.com](https://vercel.com) → **New Project** → importá el repo
3. En **Environment Variables** cargá todas las variables de `.env.example` con tus valores reales
4. Deploy! 🎉

---

## 🎮 Cómo usar la app

### Como participante
1. Entrá al link de la app desde el celular
2. Ponés tu nombre → **Unirse**
3. Esperás en la sala hasta que el animador arranque
4. Cuando se generan los grupos, ves tu grupo y la dinámica asignada
5. El timer empieza a correr

### Como animador
1. Entrá al link y tocás **"Entrar como animador"**
2. Contraseña por defecto: `siemprelisto` (cambiala en las variables de entorno)
3. Configurás el tamaño de grupos y el tiempo
4. Tocás **"Generar grupos y arrancar"**
5. Todos ven automáticamente su grupo y la dinámica
6. Cuando termina el tiempo, nueva ronda con **"Nueva ronda"**

---

## 🎭 Dinámicas incluidas

- 📸 Foto del celular
- 🎭 Tres verdades y una mentira
- 🌟 Talento oculto
- 🗺️ Mapa de historias
- 🦸 Superpoder inútil
- 🎵 Canción del momento
- ✨ De pequeño soñaba con...
- 😅 Mi miedo ridículo

---

## 🔒 Reglas de Firebase sugeridas

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Para producción podés agregar autenticación más robusta.
