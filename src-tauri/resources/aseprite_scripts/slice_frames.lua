-- slice_frames.lua
-- Recebe 1 PNG horizontal gerado pelo Pixellab /animate-with-skeleton e
-- fatia em N frames independentes.
--
-- Params:
--   input     (obrigatório) PNG fonte horizontal
--   out_dir   (obrigatório) diretório destino
--   frames    (obrigatório) número de frames horizontais (ex: 4, 8)
--   prefix    (default: "frame") prefixo dos arquivos

local input = app.params.input
local out_dir = app.params.out_dir
local frames = tonumber(app.params.frames)
local prefix = app.params.prefix or "frame"

if not input or not out_dir or not frames then
  error("slice_frames: params obrigatórios: input, out_dir, frames")
end

app.fs.makeAllDirectories(out_dir)

local src = Sprite{ fromFile = input }
local total_w = src.width
local h = src.height
local fw = math.floor(total_w / frames)

for i = 1, frames do
  local out_sprite = Sprite(fw, h, src.colorMode)
  local img = Image(src.spec)
  img:drawSprite(src, 1)

  local target = Image(fw, h, src.colorMode)
  -- Copia a faixa (i-1)*fw .. i*fw do img para target em (0,0).
  for y = 0, h - 1 do
    for x = 0, fw - 1 do
      target:drawPixel(x, y, img:getPixel((i - 1) * fw + x, y))
    end
  end
  out_sprite.cels[1].image:drawImage(target, Point(0, 0))

  local name = string.format("%s_%02d.png", prefix, i)
  local out_path = app.fs.joinPath(out_dir, name)
  out_sprite:saveAs(out_path)
  out_sprite:close()
end

src:close()
print(string.format("slice_frames: %d frames -> %s", frames, out_dir))
