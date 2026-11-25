# serverIdle

Panel web + herramientas de desarrollo dentro de **tu propia experiencia Roblox**.

## Incluye en esta primera base
- Dashboard web oscuro responsive.
- Google OAuth (requiere credenciales propias).
- Script Cloud público: listar, buscar, publicar y ver scripts.
- AI Generator: prepara prompts; todavía no llama a un proveedor IA.
- Vinculación Roblox por código temporal de 4 dígitos, iniciado desde la web y reclamado desde el servidor de tu experiencia.
- Consulta opcional de experiencias mediante Roblox Open Cloud.
- Panel Roblox inicial: whitelist por UserId, respawn, Explorer básico, `print` controlado y cambios limitados a propiedades permitidas.

## Requisitos
- Node.js 20 o superior.
- Una aplicación OAuth de Google.
- Para listar experiencias: clave Roblox Open Cloud con permisos adecuados.
- Para vinculación: HTTPS público en producción y un secreto compartido entre backend y Script de servidor.

## Ejecutar localmente
1. Descomprime el proyecto.
2. En la carpeta del proyecto ejecuta `npm install`.
3. Copia `.env.example` a `.env`.
4. Define `SESSION_SECRET`.
5. Para Google, configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `BASE_URL`.
6. En Google Cloud Console añade como redirect URI: `http://localhost:3000/auth/google/callback`.
7. Ejecuta `npm start` y abre `http://localhost:3000`.

Sin Google OAuth configurado, el dashboard y el Script Cloud se pueden abrir, pero publicar y generar códigos requiere iniciar sesión.

## Roblox Studio
1. Activa **Allow HTTP Requests** en Game Settings > Security para el flujo de vinculación.
2. Coloca `roblox/ServerScriptService/ServerIdle.server.lua` en ServerScriptService.
3. Coloca `roblox/StarterPlayer/StarterPlayerScripts/ServerIdle.client.lua` en StarterPlayerScripts.
4. Cambia `ALLOWED_USER_IDS`, `LINK_ENDPOINT` y `SERVER_SECRET`.
5. Define el mismo `ROBLOX_SERVER_SECRET` en el entorno del backend.
6. Publica y prueba únicamente en una experiencia que controles.

## Seguridad y límites intencionales
- No hay `loadstring`, inyección, ejecución de scripts arbitrarios ni acceso a experiencias ajenas.
- El código publicado es contenido comunitario y **no se ejecuta automáticamente**.
- La whitelist es una lista de UserIds que tú administras.
- No pongas secretos en LocalScripts, páginas web, GitHub ni repositorios públicos.
- Para producción cambia SQLite por una base de datos gestionada, añade moderación, rate limiting, CSRF, logs y almacenamiento de imágenes.
- La ruta de Open Cloud depende de los permisos y endpoints habilitados para tu cuenta; verifica la documentación vigente de Roblox antes de desplegar.

## Próximas etapas
1. Terminar la integración de vinculación y mostrar estado Roblox en la web.
2. Conectar un proveedor IA desde el backend (API key solo en variables de entorno).
3. Mejorar Explorer con selección, propiedades y gizmos seguros.
4. Añadir moderación, reportes y controles de publicación.
5. Crear un instalador/Plugin de Studio para enviar cambios autorizados al juego.
