# 📘 Manual de Usuario — NAO

**NAO — Nexus Avance de Obra · Nexus 360**  
*Versión 1.1 — con filtro por contratista, galería de fotos en pendientes y fechas inicio/término.*

Sistema para llevar el control de obra de forma fácil, profesional y desde cualquier
dispositivo (computadora o celular). Este manual está escrito en lenguaje sencillo
para que cualquier persona del equipo lo entienda, aunque no sea experta en tecnología.

---

## Índice

1. [¿Qué es NAO?](#qué-es-nao)
2. [Tipos de usuario](#tipos-de-usuario)
3. [Entrar al sistema](#entrar-al-sistema)
4. [Mis obras — primera pantalla](#mis-obras--primera-pantalla)
5. [Dashboard de una obra](#dashboard-de-una-obra)
6. [Pendientes (tareas)](#pendientes-tareas)
7. [Minutas](#minutas)
8. [Bitácora](#bitácora)
9. [Administración (solo Supervisor)](#administración-solo-supervisor)
10. [Preguntas frecuentes](#preguntas-frecuentes)

---

## ¿Qué es NAO?

NAO es una plataforma web para llevar el control de obra. Sirve para:

- Saber qué pendientes tiene cada obra y quién es responsable.
- Registrar minutas de juntas y recorridos.
- Llevar una bitácora con fotos del avance diario.
- Ver al instante qué tareas están vencidas, cuáles son críticas y qué tan
  avanzada va la obra.

Se usa desde el navegador (Chrome, Safari, etc.) en computadora o celular.

---

## Tipos de usuario

Hay **tres tipos de usuario**. Cada uno ve y puede hacer cosas distintas:

### 👷 Supervisor

Tiene **acceso a todo** y es el único que puede dar el "check de Completado"
a las tareas. También crea las obras, los usuarios y los contratistas.

**Qué puede hacer:**

- Ver todo de todas sus obras.
- Crear, editar y eliminar pendientes.
- Marcar tareas como **Completado**.
- Crear minutas y registros de bitácora.
- Crear nuevos usuarios y contratistas.
- Crear y editar obras.

### 📋 Contratista Responsable

Es el responsable directo de coordinar la obra día a día. Puede registrar todo
lo que pasa, **pero no puede cerrar tareas**.

**Qué puede hacer:**

- Ver todo de sus obras asignadas.
- Crear y editar pendientes.
- Subir minutas y registros de bitácora.
- Mover el avance de cada tarea de **0 hasta 100%**.
- **NO** puede marcar como Completado (eso lo hace el Supervisor).

Cuando un Contratista Responsable pone una tarea al 100%, la tarea pasa
automáticamente a **"En revisión"**. El Supervisor recibe el aviso y decide si
aprueba el cierre con el botón verde **"Aprobar"**.

### 🔍 Contratista

Es solo de consulta. Ve las tareas que le corresponden a su empresa contratista.

**Qué puede hacer:**

- Ver las tareas que se le asignaron a su empresa.
- Ver minutas y bitácora de su obra.
- **NO** puede crear, editar ni eliminar nada.

---

## Entrar al sistema

1. Abre el navegador y entra a la URL del sistema (tu supervisor te la dará).
2. Verás la pantalla de inicio de sesión.
3. Escribe tu **correo electrónico** y tu **contraseña**.
4. Da clic en **Entrar**.

Si te equivocaste o no recuerdas la contraseña, pídele al supervisor que te la
reinicie.

### Cerrar sesión

Da clic en tu foto/iniciales arriba a la derecha → **Cerrar sesión**.

---

## Mis obras — primera pantalla

Después de entrar, lo primero que verás es **"Mis obras"**: un listado de las
obras donde tú estás asignado. Si solo estás en una obra, solo verás esa.

Cada tarjeta de obra muestra:

- Nombre de la obra.
- Dirección.
- Cuántos pendientes y cuántos miembros tiene.
- Fechas de inicio y fin estimada.

**Da clic en la tarjeta** de la obra a la que quieras entrar.

Una vez dentro de una obra, en la barra lateral izquierda podrás cambiar de
obra cuando quieras (sin tener que salir del sistema).

---

## Dashboard de una obra

Es la **pantalla resumen** de la obra. Sirve para que con un solo vistazo sepas
cómo va todo.

Verás:

- **4 tarjetas grandes arriba** con los números clave: total de pendientes
  abiertos, vencidos, críticas y completados.
- **Anillo de avance general** (de 0 a 100%) — promedio del avance de todos los
  pendientes de la obra.
- **Gráfica de pendientes por área** (estructura, instalaciones, etc.).
- **Próximas entregas** — las 5 tareas más cercanas a vencer.
- **Actividades recientes** — tabla con lo último que se actualizó.

Si hay **tareas vencidas**, la tarjeta roja "Vencidos" se resalta con un borde
para que la veas de inmediato.

---

## Pendientes (tareas)

Esta es la pantalla más importante. Aquí se registran todas las tareas de la obra.

### Ver pendientes

La tabla muestra todos los pendientes con sus columnas:

- **#** Folio único de la tarea.
- **Tarea** Descripción de lo que hay que hacer.
- **Área** Estructura, Instalaciones, Acabados, etc. (9 áreas en total).
- **Inicio** Fecha en que arranca la tarea.
- **Término** Fecha en que debe quedar listo. Si ya pasó la fecha y no se cerró,
  aparece **VENCIDO** en rojo.
- **Contratista** A qué empresa le toca.
- **Responsable** La persona del equipo que coordina.
- **Prioridad** Crítica (rojo), Alta (naranja), Media (amarillo), Baja (gris).
- **Estatus** En qué etapa va: Pendiente, En progreso, En revisión, Completado o Cancelado.
- **% Avance** Barra que muestra cuánto se lleva (0 a 100%).
- **Adj.** Cuántas fotos y comentarios tiene.

> 💡 **Tip:** Haz clic en cualquier fila para abrir el **detalle del pendiente** con todas sus fotos en grande.

### Buscar y filtrar

Arriba de la tabla:

- **Caja de búsqueda** — escribe palabras de la tarea.
- **Filtro de Área** — solo Estructura, solo Instalaciones, etc.
- **Filtro de Contratista** — para ver solo las tareas de una empresa específica.
- **Filtro de Estatus** — por ejemplo, solo "En progreso".
- **Filtro de Prioridad** — para enfocarte en lo crítico.
- Botón **Vencidos** — al activarlo verás solo las tareas atrasadas.

### Ver detalle con fotos

Da clic en cualquier fila o en el icono del **ojo** 👁️. Se abre una ventana con:
- Toda la información del pendiente.
- Galería de **fotos en grande**. Da clic en una para verla a pantalla completa.
- Lista de archivos adjuntos (PDFs, etc.).
- Avance, fechas, responsables, observaciones.

Los **Contratistas (solo lectura) también pueden ver las fotos** de sus tareas.

### Crear un pendiente nuevo *(Supervisor o Contratista Responsable)*

1. Da clic en el botón azul **"Nuevo pendiente"** arriba a la derecha.
2. Llena el formulario:
   - **Tarea**: descripción corta (obligatorio). Ej: *"Colado de losa Nivel 3"*.
   - **Descripción**: detalles adicionales si quieres.
   - **Área**: elige una de las 9 áreas.
   - **Prioridad**: por defecto es "Media".
   - **Estatus**: por defecto es "Pendiente".
   - **Fecha de inicio** (obligatorio).
   - **Fecha de término** (obligatorio).
   - **% Avance**: arrastra el slider de 0 a 100.
   - **Contratista**: empresa que lo hará.
   - **Responsable**: persona que coordina.
   - **Supervisor**: quién supervisa.
   - **Observaciones**: cualquier nota extra.
   - **Fotos y archivos**: sube fotos del avance, planos, certificados, etc.
3. Da clic en **"Crear pendiente"**.

### Editar un pendiente

Da clic en el icono de **lápiz** en la fila de la tarea (al final, en columna Acciones).

### Cambiar el estatus rápido

En la columna **Estatus**, da clic en el menú desplegable y elige el nuevo
estatus. Cambios típicos:

- *Pendiente* → cuando aún no se empieza.
- *En progreso* → cuando ya se está haciendo.
- *En revisión* → cuando se terminó pero falta validación.
- *Completado* → 🔒 solo el Supervisor puede ponerlo.
- *Cancelado* → si se decidió no hacer.

### Aprobar y completar tareas *(solo Supervisor)*

Cuando un Contratista Responsable termina una tarea y la deja en **"En revisión"**,
en esa fila aparece un botón verde **"Aprobar"** (solo lo ve el Supervisor).

Da clic en **Aprobar** → la tarea pasa a **Completado**, con la fecha del
día y tu nombre como aprobador.

### Eliminar *(solo Supervisor)*

Da clic en el icono de **bote rojo**. Te pide confirmación.

---

## Minutas

Aquí guardas las minutas de juntas, recorridos, acuerdos.

### Ver minutas

Cada minuta se muestra como una tarjeta con título, fecha y autor. Da clic en
la flecha **▼** para expandir y ver el contenido completo.

### Crear minuta *(Supervisor o Contratista Responsable)*

1. Da clic en **"Nueva minuta"**.
2. Llena:
   - **Título** (ej: *"Junta semanal — Semana 12"*).
   - **Fecha de la junta**.
   - **Contenido**: el texto de la minuta. Puedes escribirla o pegarla desde
     Word, correo, WhatsApp, etc.
   - **Archivo adjunto** *(opcional)*: PDF, foto, documento.
3. Da clic en **"Guardar minuta"**.

> **💡 Tip:** Si en la minuta hay acuerdos que se vuelven tareas, ve a la
> pestaña de **Pendientes** y créalos ahí con sus responsables y fechas.

---

## Bitácora

La bitácora es el **registro diario** de cómo va la obra. Sirve para documentar
con fotos y texto qué pasó cada día.

### Ver bitácora

Las entradas aparecen en orden, las más recientes arriba. Cada una muestra:

- Título y fecha.
- Quién la escribió.
- Avance del día, clima, # de personas en obra.
- Texto descriptivo.
- Fotos del día.

### Crear registro de bitácora *(Supervisor o Contratista Responsable)*

1. Da clic en **"Nuevo registro"**.
2. Llena:
   - **Título**.
   - **Fecha** (por defecto hoy).
   - **% Avance** del día (opcional).
   - **Clima** (opcional, ej: "Lluvia ligera").
   - **Personal** — cuántas personas hubo en obra (opcional).
   - **Descripción**.
   - **Fotos** — puedes subir varias a la vez.
3. Da clic en **"Guardar"**.

---

## Administración (solo Supervisor)

En el menú lateral, al final, los supervisores ven la sección **"Administración"**.

### Obras

1. Para crear: clic en **"Nueva obra"** → pon nombre, dirección, fechas. Luego
   selecciona qué usuarios y qué contratistas estarán en esta obra.
2. Para editar: clic en el lápiz de la tarjeta de la obra.

**Importante:** Solo los usuarios que **marques aquí como miembros** podrán ver
esta obra cuando entren. Si olvidas asignar a alguien, no podrá entrar.

### Usuarios

1. Clic en **"Nuevo usuario"**.
2. Pon nombre, correo (será su usuario para entrar), contraseña inicial, rol y
   datos de contacto.
3. Si es un **Contratista**, vincúlalo con la empresa contratista correspondiente.
4. Comparte la contraseña inicial con la persona. Ella puede pedirte cambiarla
   después.

### Contratistas

Registra cada empresa contratista. Estas son las empresas que aparecen en el
selector cuando creas un pendiente.

---

## Preguntas frecuentes

### Estoy en mi celular y no veo el menú lateral

En celular el menú está oculto. Da clic en el **icono ☰ (tres rayas)** arriba a
la izquierda para abrirlo.

### Subí un pendiente al 100% pero no se cerró

Eso es a propósito. Si tú eres **Contratista Responsable**, las tareas al 100%
pasan a **"En revisión"** y el supervisor las aprueba. Avísale al supervisor.

### No veo una obra que sí me toca

Pídele a tu supervisor que te asigne a esa obra desde **Administración → Obras**.

### Olvidé mi contraseña

Pídele a un supervisor que te cree una contraseña nueva.

### ¿Se pierden mis datos si cierro el navegador?

No. Todo se guarda en la base de datos al momento. Puedes cerrar y volver
cuando quieras.

### ¿Puedo trabajar sin internet?

No, NAO necesita conexión a internet para guardar los datos.

---

**¿Dudas o algo no funciona?** Avisa a tu supervisor para que lo reporte al
administrador del sistema.

© Nexus 360 · NAO
