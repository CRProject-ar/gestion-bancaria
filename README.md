# Gestión Bancaria — Guía de instalación
## Supabase + Netlify (gratuito)

---

## PASO 1 — Crear proyecto en Supabase

1. Ir a https://supabase.com y hacer clic en **"Start your project"**
2. Registrarse con Google o email
3. Hacer clic en **"New project"**
4. Completar:
   - **Name:** gestion-bancaria (o el nombre que quieras)
   - **Database Password:** anotá esta contraseña en un lugar seguro
   - **Region:** elegir "South America (São Paulo)" para menor latencia
5. Hacer clic en **"Create new project"** y esperar ~2 minutos

---

## PASO 2 — Crear las tablas en Supabase

1. En el panel de Supabase, ir al menú lateral → **"SQL Editor"**
2. Hacer clic en **"New query"**
3. Abrir el archivo `supabase_setup.sql` (incluido en esta carpeta)
4. Copiar TODO el contenido y pegarlo en el editor
5. Hacer clic en el botón **"Run"** (o presionar Ctrl+Enter)
6. Verificar que aparezca el mensaje "Success. No rows returned"

---

## PASO 3 — Obtener las credenciales de Supabase

1. En el panel de Supabase, ir al menú lateral → **"Settings"** (ícono de engranaje)
2. Hacer clic en **"API"**
3. Copiar los dos valores que necesitás:
   - **Project URL** → se ve así: `https://xxxxxxxxxx.supabase.co`
   - **anon public** (bajo "Project API Keys") → una clave larga

---

## PASO 4 — Configurar las credenciales en el proyecto

1. Abrir el archivo `js/config.js` con cualquier editor de texto (Bloc de notas, etc.)
2. Reemplazar los valores:

```javascript
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';   // ← pegar tu Project URL
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';             // ← pegar tu anon public key
```

3. Guardar el archivo

---

## PASO 5 — Subir el proyecto a GitHub

1. Ir a https://github.com y crear una cuenta si no tenés
2. Hacer clic en **"New repository"** (botón verde o el "+" arriba a la derecha)
3. Completar:
   - **Repository name:** gestion-bancaria
   - Dejarlo en **Public** (necesario para el plan gratuito de Netlify)
4. Hacer clic en **"Create repository"**
5. En la página del repositorio vacío, hacer clic en **"uploading an existing file"**
6. Arrastrar y soltar TODA la carpeta del proyecto (o seleccionar todos los archivos)
   - Asegurarse de subir: `index.html`, `supabase_setup.sql`, `README.md`, la carpeta `css/` y la carpeta `js/`
7. Hacer clic en **"Commit changes"**

---

## PASO 6 — Publicar en Netlify

1. Ir a https://netlify.com y hacer clic en **"Sign up"**
2. Registrarse con la misma cuenta de GitHub (más fácil)
3. Una vez dentro, hacer clic en **"Add new site"** → **"Import an existing project"**
4. Elegir **"Deploy with GitHub"**
5. Autorizar a Netlify a acceder a tus repositorios
6. Seleccionar el repositorio **gestion-bancaria**
7. En la pantalla de configuración:
   - **Branch to deploy:** main
   - **Build command:** (dejar vacío)
   - **Publish directory:** (dejar vacío o poner `.`)
8. Hacer clic en **"Deploy site"**
9. Esperar ~1 minuto. Netlify te dará una URL como `https://nombre-random.netlify.app`

---

## PASO 7 — Probar la aplicación

1. Abrir la URL que dio Netlify en el navegador
2. Ingresar con las credenciales de prueba:
   - **Email:** admin@empresa.com
   - **Contraseña:** admin123
3. Si todo funciona, ¡la app está lista!

---

## PASO 8 — Personalizar la URL (opcional, gratuito)

1. En Netlify, ir a **"Site settings"** → **"Domain management"**
2. Hacer clic en **"Options"** → **"Edit site name"**
3. Cambiar el nombre a algo como `gestion-bancaria-miempresa`
4. La URL quedará: `https://gestion-bancaria-miempresa.netlify.app`

---

## Cómo actualizar la app en el futuro

Si en algún momento se hacen cambios en los archivos:
1. Ir al repositorio en GitHub
2. Hacer clic en el archivo a modificar → ícono del lápiz (editar)
3. Hacer los cambios y hacer clic en **"Commit changes"**
4. Netlify detecta el cambio automáticamente y republica en ~1 minuto

---

## Credenciales iniciales

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@empresa.com | admin123 | Administrador |

⚠️ **Importante:** Cambiar la contraseña del administrador desde la solapa Usuarios una vez que la app esté en línea.

---

## Soporte

- Supabase docs: https://supabase.com/docs
- Netlify docs: https://docs.netlify.com
