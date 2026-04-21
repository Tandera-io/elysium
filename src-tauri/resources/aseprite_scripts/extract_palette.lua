-- extract_palette.lua
-- Extrai a paleta de cores de um PNG (concept art aprovado) e salva em .gpl
-- (formato GIMP Palette). Usado para "lock" cromático dos sprites gerados.
--
-- Params:
--   input         (obrigatório) PNG fonte (o concept art)
--   output        (obrigatório) path do .gpl
--   max_colors    (opcional, default 32) máximo de cores no palette

local input = app.params.input
local output = app.params.output
local max_colors = tonumber(app.params.max_colors) or 32

if not input or not output then
  error("extract_palette: params obrigatórios: input, output")
end

local sprite = Sprite{ fromFile = input }
-- Converte para indexed para forçar Aseprite a computar a paleta.
app.command.ChangePixelFormat{
  format = "indexed",
  dithering = "none",
  rgbMap = "octree",
  colors = max_colors,
}

local pal = sprite.palettes[1]
local n = #pal

local fh = io.open(output, "w")
fh:write("GIMP Palette\n")
fh:write("Name: ElysiumStyleLock\n")
fh:write("Columns: 8\n")
fh:write("#\n")
for i = 0, n - 1 do
  local c = pal:getColor(i)
  fh:write(string.format("%3d %3d %3d\textracted_%02d\n", c.red, c.green, c.blue, i))
end
fh:close()

sprite:close()
print(string.format("extract_palette: %d cores -> %s", n, output))
