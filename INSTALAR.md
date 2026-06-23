# 🏗️ NAO — Instalación

Esta es una **instalación limpia, desde cero**. Como ya tienes Node.js y Postgres
instalados de la vez anterior, los pasos son cortos y simples.

> **Importante:** este es un proyecto NUEVO. **No actualices** sobre el viejo.
> Vamos a crear una carpeta nueva, una base de datos nueva, y empezar fresco.

---

## Antes de empezar — verifica 2 cosas

1. **Postgres está corriendo:** mira la barra superior de tu Mac. Debe estar
   el icono del **elefante azul**. Si no, abre Aplicaciones → Postgres.

2. **Cierra todas las Terminales que tengas abiertas.** Para empezar limpio.

---

## PASO 1 — Preparar la carpeta

1. Descomprime `nao.zip` (doble clic). Se crea una carpeta llamada `nao`.
2. Cambia el nombre de esa carpeta a `nao-nuevo` para que no se confunda con
   la que ya tenías. (Clic derecho → Renombrar.)
3. Mueve `nao-nuevo` a tu **Escritorio**.

---

## PASO 2 — Abrir Terminal nueva

Presiona `⌘ + barra espaciadora`, escribe **Terminal**, dale Enter.

Tu prompt debe terminar en `%`. Algo así:
```
danieljasqui@MacBook-Air-de-daniel ~ %
```

---

## PASO 3 — Copiar y pegar TODO esto de una sola vez

Selecciona y copia este bloque completo. Pégalo en la Terminal y dale Enter:

```
cd ~/Desktop/nao-nuevo
cp .env.example .env
createdb nao_nuevo
echo 'DATABASE_URL="postgresql://'$(whoami)'@localhost:5432/nao_nuevo?schema=public"' >> .env
echo 'NEXTAUTH_SECRET="'$(openssl rand -base64 32)'"' >> .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Esto hace todo automáticamente:
1. Entra a la carpeta nueva.
2. Crea tu archivo de configuración `.env`.
3. Crea una base de datos limpia llamada `nao_nuevo`.
4. Configura la conexión a esa base con tu usuario de Mac.
5. Genera una clave secreta segura.
6. Instala las piezas (tarda 1-2 min).
7. Crea las tablas (con la nueva columna `fechaInicio`).
8. Mete los datos de prueba.
9. Arranca el sistema.

Cuando veas:
```
✓ Ready in ___ms
- Local: http://localhost:3000
```

¡Está listo!

---

## PASO 4 — Configurar Cloudinary (para que se vean las fotos)

Las fotos solo funcionan si configuras Cloudinary. **Si no lo configuras, el sistema
arranca igual y todo funciona, solo no podrás subir fotos**. Puedes hacerlo después.

Si quieres habilitarlo ahora:

1. **Apaga el sistema** con `Control + C` en la Terminal.
2. Entra a https://cloudinary.com → inicia sesión con la cuenta que ya creaste.
3. En el Dashboard copia: **Cloud Name**, **API Key**, **API Secret**.
4. En la Terminal escribe:
   ```
   open -e .env
   ```
5. Se abre TextEdit. Busca las 3 líneas que dicen `CLOUDINARY_...` y pega tus
   valores entre las comillas. Guarda (`⌘ + S`) y cierra.
6. Vuelve a la Terminal y escribe:
   ```
   npm run dev
   ```

---

## PASO 5 — Abrir en el navegador

Ve a `http://localhost:3000`.

Inicia sesión con:

- **supervisor@nexus360.mx** / password123  (ve todo, da check de completado)
- **responsable@nexus360.mx** / password123  (crea pendientes, sube avance hasta 99%)
- **contratista@nexus360.mx** / password123  (solo lectura, solo Obra 1)

---

## ¿Qué incluye esta versión?

Todo lo de la primera vez **MÁS** los 2 cambios que pediste:

✅ **Fecha de inicio + fecha de término** en cada pendiente (ambas obligatorias)
✅ **Adjuntar fotos** en cada pendiente, con galería que se abre al dar clic en una tarea

Y todo lo demás igual que antes:
- 3 roles con permisos
- 2 obras (Torre Residencial Norte y Plaza Comercial Sur)
- 9 áreas (Estructura, Obra civil, Obra blanca, Instalaciones, Acabados,
  Proyecto, Administrativo, Venta, Postventa)
- Minutas manuales
- Bitácora con fotos
- Admin de obras/usuarios/contratistas

---

## Para apagar y volver a prender

**Apagar:** en la Terminal donde está corriendo, `Control + C`.

**Volver a prender:**
```
cd ~/Desktop/nao-nuevo
npm run dev
```

---

## Si algo falla

Cópiame el texto en rojo de la Terminal y te ayudo. Los problemas más comunes:

- **"createdb: command not found"** → Postgres no tiene su PATH configurado. Escribe:
  ```
  echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  ```
  y vuelve a intentar el bloque del Paso 3.

- **"database 'nao_nuevo' already exists"** → ya la creaste antes. Bórrala con
  `dropdb nao_nuevo` y vuelve a intentar.

- **"port 3000 already in use"** → tienes otra instancia corriendo. Cierra
  todas las Terminales y empieza de nuevo.

---

## ¿Y mis carpetas viejas?

Tus carpetas viejas siguen ahí intactas en el Escritorio (las que se llaman
`nao-v1.0-backup`, `nao-v1.1-rota`, etc.). No las toques por ahora — están
como respaldo. Cuando confirmes que `nao-nuevo` funciona bien, las puedes
borrar si quieres.
