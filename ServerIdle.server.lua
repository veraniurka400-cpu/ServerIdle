-- serverIdle: herramientas de desarrollo SOLO para tu propia experiencia.
-- Coloca este Script en ServerScriptService.
-- Crea ReplicatedStorage/ServerIdleRemote automáticamente.
-- No ejecuta código Lua arbitrario ni loadstring.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local remote = ReplicatedStorage:FindFirstChild("ServerIdleRemote")
if not remote then
    remote = Instance.new("RemoteFunction")
    remote.Name = "ServerIdleRemote"
    remote.Parent = ReplicatedStorage
end

local ALLOWED_USER_IDS = {
    -- [123456789] = true, -- Reemplaza con tu UserId de Roblox
}
local LINK_ENDPOINT = "https://TU-DOMINIO/api/roblox/claim"
local SERVER_SECRET = "CAMBIA_ESTE_SECRETO_Y_GUARDALO_TAMBIEN_EN_EL_BACKEND"

local function isAllowed(player)
    return ALLOWED_USER_IDS[player.UserId] == true
end

local function getTarget(player, path)
    -- Acceso restringido a Workspace; no permite rutas arbitrarias del servidor.
    local current = workspace
    for part in string.gmatch(path, "[^/]+") do
        if part == ".." or part == "." then return nil end
        current = current:FindFirstChild(part)
        if not current then return nil end
    end
    return current
end

remote.OnServerInvoke = function(player, action, payload)
    if typeof(action) ~= "string" or typeof(payload) ~= "table" then
        return {ok=false, error="Solicitud inválida"}
    end

    if action == "link" then
        local code = tostring(payload.code or "")
        if not code:match("^%d%d%d%d$") then return {ok=false,error="Código inválido"} end
        local body = HttpService:JSONEncode({
            code=code, robloxUserId=tostring(player.UserId),
            robloxUsername=player.Name, serverSecret=SERVER_SECRET
        })
        local ok, response = pcall(function()
            return HttpService:PostAsync(LINK_ENDPOINT, body, Enum.HttpContentType.ApplicationJson)
        end)
        return {ok=ok, message=ok and "Cuenta vinculada" or "No se pudo verificar el código"}
    end

    if not isAllowed(player) then return {ok=false,error="No estás en la whitelist"} end

    if action == "explorer" then
        local result = {}
        for _, obj in ipairs(workspace:GetDescendants()) do
            if #result >= 250 then break end
            table.insert(result, {name=obj.Name, class=obj.ClassName, path=obj:GetFullName()})
        end
        return {ok=true, objects=result}
    elseif action == "respawn" then
        player:LoadCharacter()
        return {ok=true}
    elseif action == "rig" then
        local rig = payload.rig
        if rig ~= "R6" and rig ~= "R15" then return {ok=false,error="Rig no válido"} end
        player:LoadCharacterWithHumanoidDescriptionAsync(
            Players:GetHumanoidDescriptionFromUserId(player.UserId),
            rig == "R6" and Enum.HumanoidRigType.R6 or Enum.HumanoidRigType.R15
        )
        return {ok=true}
    elseif action == "setPart" then
        local obj = getTarget(player, tostring(payload.path or ""))
        if not obj or not obj:IsA("BasePart") then return {ok=false,error="Selecciona una BasePart válida"} end
        local property = payload.property
        local value = payload.value
        if property == "Transparency" and typeof(value) == "number" then
            obj.Transparency = math.clamp(value, 0, 1)
        elseif property == "Anchored" and typeof(value) == "boolean" then
            obj.Anchored = value
        else
            return {ok=false,error="Propiedad no permitida"}
        end
        return {ok=true}
    elseif action == "command" then
        -- Lista pequeña de comandos seguros, nunca evalúa texto como Lua.
        local command = tostring(payload.command or "")
        if command == "print" then
            print("[serverIdle]", tostring(payload.text or ""):sub(1,200))
            return {ok=true, output="Mensaje enviado a Output"}
        elseif command == "respawn" then
            player:LoadCharacter()
            return {ok=true, output="Personaje reiniciado"}
        end
        return {ok=false,error="Comando no permitido"}
    end
    return {ok=false,error="Acción desconocida"}
end
