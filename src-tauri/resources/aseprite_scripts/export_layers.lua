-- export_layers.lua
-- Separa cada layer de um .ase/.aseprite em PNGs individuais. Útil quando o
-- Pixellab gera composições com "sombra + personagem + equipamento" agrupadas.
--
-- Params:
--   input    (obrigatório) .ase/.aseprite ou PNG com layers
--   out_dir  (obrigatório) diretório destino

local input = app.params.input
local out_dir = app.params.out_dir

if not input or not out_dir then
  error("export_layers: params obrigatórios: input, out_dir")
end

app.fs.makeAllDirectories(out_dir)

local sprite = Sprite{ fromFile = input }

-- Esconde todas as layers; exporta uma de cada vez.
for _, layer in ipairs(sprite.layers) do
  layer.isVisible = false
end

for _, layer in ipairs(sprite.layers) do
  layer.isVisible = true
  local name = layer.name:gsub("[^%w_-]", "_")
  local path = app.fs.joinPath(out_dir, name .. ".png")
  sprite:saveCopyAs(path)
  layer.isVisible = false
end

sprite:close()
print(string.format("export_layers: %d layers -> %s", #sprite.layers, out_dir))
