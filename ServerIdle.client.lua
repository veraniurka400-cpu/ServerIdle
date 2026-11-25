-- Panel mínimo dentro del juego. Coloca en StarterPlayerScripts.
-- Las acciones privilegiadas se validan de nuevo en el servidor.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer
local remote = ReplicatedStorage:WaitForChild("ServerIdleRemote")

local gui = Instance.new("ScreenGui")
gui.Name = "serverIdlePanel"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(300, 220)
frame.Position = UDim2.new(0, 18, 0.5, -110)
frame.BackgroundColor3 = Color3.fromRGB(15, 18, 29)
frame.Parent = gui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 12)
local stroke = Instance.new("UIStroke", frame)
stroke.Color = Color3.fromRGB(133, 100, 255)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -20, 0, 38)
title.Position = UDim2.fromOffset(10, 5)
title.BackgroundTransparency = 1
title.Text = "serverIdle  •  DEV PANEL"
title.TextColor3 = Color3.new(1,1,1)
title.Font = Enum.Font.GothamBold
title.TextSize = 15
title.Parent = frame

local function button(text, y, callback)
    local b = Instance.new("TextButton")
    b.Size = UDim2.new(1, -24, 0, 34)
    b.Position = UDim2.fromOffset(12, y)
    b.BackgroundColor3 = Color3.fromRGB(43, 42, 72)
    b.TextColor3 = Color3.new(1,1,1)
    b.Text = text
    b.Font = Enum.Font.Gotham
    b.TextSize = 13
    b.Parent = frame
    Instance.new("UICorner", b).CornerRadius = UDim.new(0, 8)
    b.MouseButton1Click:Connect(callback)
end

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, -20, 0, 25)
status.Position = UDim2.fromOffset(10, 185)
status.BackgroundTransparency = 1
status.Text = "Listo"
status.TextColor3 = Color3.fromRGB(173, 164, 220)
status.TextSize = 11
status.Font = Enum.Font.Gotham
status.Parent = frame

button("Respawn", 48, function()
    local ok, result = pcall(function() return remote:InvokeServer("respawn", {}) end)
    status.Text = ok and (result.ok and "Personaje reiniciado" or result.error) or "Error de conexión"
end)
button("Consultar Explorer", 88, function()
    local ok, result = pcall(function() return remote:InvokeServer("explorer", {}) end)
    status.Text = ok and (result.ok and (#result.objects.." objetos encontrados") or result.error) or "Error de conexión"
end)
button("Comando print de prueba", 128, function()
    local ok, result = pcall(function()
        return remote:InvokeServer("command", {command="print",text="serverIdle funciona"})
    end)
    status.Text = ok and (result.output or result.error) or "Error de conexión"
end)
