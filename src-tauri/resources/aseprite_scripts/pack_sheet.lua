-- pack_sheet.lua
-- Agrupa N frames PNG num spritesheet + atlas.json compatível com Godot.
--
-- Params:
--   frames_dir  (obrigatório) diretório com PNGs (ordem = nome alfabético)
--   out_png     (obrigatório) caminho de saída do atlas.png
--   out_json    (obrigatório) caminho de saída do atlas.json
--   frame_w     (default: autodetecta pelo primeiro PNG)
--   frame_h     (default: autodetecta)
--   columns     (default: 8) largura do grid em frames
--
-- Uso:
--   aseprite -b --script-param frames_dir=/path --script-param out_png=atlas.png \
--            --script-param out_json=atlas.json --script pack_sheet.lua

local frames_dir = app.params.frames_dir
local out_png = app.params.out_png
local out_json = app.params.out_json
local columns = tonumber(app.params.columns) or 8

if not frames_dir or not out_png or not out_json then
  error("pack_sheet: params obrigatórios: frames_dir, out_png, out_json")
end

-- Lista PNGs no diretório (ordem alfabética).
local files = {}
for _, f in ipairs(app.fs.listFiles(frames_dir)) do
  if f:lower():match("%.png$") then
    table.insert(files, app.fs.joinPath(frames_dir, f))
  end
end
table.sort(files)

if #files == 0 then
  error("pack_sheet: nenhum PNG encontrado em " .. frames_dir)
end

-- Abre o primeiro para descobrir dimensões.
local first = Sprite{ fromFile = files[1] }
local fw = tonumber(app.params.frame_w) or first.width
local fh = tonumber(app.params.frame_h) or first.height
first:close()

-- Cria sprite destino.
local cols = math.min(columns, #files)
local rows = math.ceil(#files / cols)
local sheet = Sprite(fw * cols, fh * rows, ColorMode.RGB)
app.command.SpriteProperties{ colorMode = "rgb" }

-- Blit cada frame no lugar.
for i, fpath in ipairs(files) do
  local s = Sprite{ fromFile = fpath }
  local img = Image(s.spec)
  img:drawSprite(s, 1)
  local col = (i - 1) % cols
  local row = math.floor((i - 1) / cols)
  sheet.cels[1].image:drawImage(img, Point(col * fw, row * fh))
  s:close()
end

-- Salva PNG.
sheet:saveAs(out_png)

-- Escreve JSON no formato Godot SpriteFrames (compatível com --format json-array).
local json_parts = {}
table.insert(json_parts, '{"frames":[')
for i, fpath in ipairs(files) do
  local col = (i - 1) % cols
  local row = math.floor((i - 1) / cols)
  local name = app.fs.fileTitle(fpath)
  local sep = i > 1 and "," or ""
  table.insert(json_parts, string.format(
    '%s{"filename":"%s","frame":{"x":%d,"y":%d,"w":%d,"h":%d},"duration":100}',
    sep, name, col * fw, row * fh, fw, fh
  ))
end
table.insert(json_parts, '],"meta":{"image":"')
table.insert(json_parts, app.fs.fileName(out_png))
table.insert(json_parts, '","size":{"w":')
table.insert(json_parts, tostring(fw * cols))
table.insert(json_parts, ',"h":')
table.insert(json_parts, tostring(fh * rows))
table.insert(json_parts, '},"frame_w":')
table.insert(json_parts, tostring(fw))
table.insert(json_parts, ',"frame_h":')
table.insert(json_parts, tostring(fh))
table.insert(json_parts, ',"columns":')
table.insert(json_parts, tostring(cols))
table.insert(json_parts, ',"count":')
table.insert(json_parts, tostring(#files))
table.insert(json_parts, '}}')

local fh_out = io.open(out_json, "w")
fh_out:write(table.concat(json_parts))
fh_out:close()

sheet:close()
print(string.format("pack_sheet: %d frames -> %s (%dx%d)", #files, out_png, fw * cols, fh * rows))
