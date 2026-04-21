-- remove_bg.lua
-- Remove a cor de fundo exata (ou próxima via tolerância) de um PNG, deixando
-- canal alfa. Útil para normalizar sprites gerados pelo Pixellab.
--
-- Params:
--   input      (obrigatório) PNG de entrada
--   output     (obrigatório) PNG de saída (pode ser o mesmo input)
--   color      (opcional) cor hex do fundo ex: "#ff00ff"; default = pixel (0,0)
--   tolerance  (opcional, default 16) distância euclidiana RGB máxima a remover

local input = app.params.input
local output = app.params.output
local color_hex = app.params.color
local tolerance = tonumber(app.params.tolerance) or 16

if not input or not output then
  error("remove_bg: params obrigatórios: input, output")
end

local sprite = Sprite{ fromFile = input }
if sprite.colorMode ~= ColorMode.RGB then
  app.command.ChangePixelFormat{ format = "rgb" }
end

local img = sprite.cels[1].image
local target_r, target_g, target_b

if color_hex then
  target_r = tonumber(color_hex:sub(2, 3), 16)
  target_g = tonumber(color_hex:sub(4, 5), 16)
  target_b = tonumber(color_hex:sub(6, 7), 16)
else
  local px = img:getPixel(0, 0)
  target_r = app.pixelColor.rgbaR(px)
  target_g = app.pixelColor.rgbaG(px)
  target_b = app.pixelColor.rgbaB(px)
end

local tol2 = tolerance * tolerance

for y = 0, img.height - 1 do
  for x = 0, img.width - 1 do
    local px = img:getPixel(x, y)
    local r = app.pixelColor.rgbaR(px)
    local g = app.pixelColor.rgbaG(px)
    local b = app.pixelColor.rgbaB(px)
    local dr = r - target_r
    local dg = g - target_g
    local db = b - target_b
    if (dr * dr + dg * dg + db * db) <= tol2 then
      img:drawPixel(x, y, app.pixelColor.rgba(0, 0, 0, 0))
    end
  end
end

sprite:saveAs(output)
sprite:close()
print("remove_bg: fundo removido -> " .. output)
