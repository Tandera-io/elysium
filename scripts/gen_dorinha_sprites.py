"""
Generate 32x32 pixel-art sprites for Dorinha NPC.
Dorinha is a female quitandeira (market vendor/greengrocer) NPC.
Style: Stardew Valley-inspired pixel art.

Produces individual 32x32 PNG files:
  idle_down.png, idle_up.png, idle_left.png, idle_right.png
  walk_down_0.png, walk_down_1.png, walk_down_2.png
  walk_up_0.png,   walk_up_1.png,   walk_up_2.png
  walk_left_0.png, walk_left_1.png, walk_left_2.png
  walk_right_0.png,walk_right_1.png,walk_right_2.png
"""

from PIL import Image
import os

OUT_DIR = "/Users/ngs/Desktop/NGS 2.0/elysium/apps/client/public/assets/npcs/dorinha"
os.makedirs(OUT_DIR, exist_ok=True)

# ── Palette ──────────────────────────────────────────────────────────────────
T   = (0,   0,   0,   0)    # transparent
BK  = (30,  20,  10, 255)   # outline / dark
SK  = (210, 155, 110, 255)  # skin
SKD = (180, 120,  80, 255)  # skin dark (shadow)
HR  = ( 80,  45,  15, 255)  # dark brown hair
HRL = (110,  65,  25, 255)  # hair highlight
SH  = ( 80, 130,  60, 255)  # green shirt
SHD = ( 55,  95,  40, 255)  # shirt dark / shadow
AP  = (200, 140,  30, 255)  # yellow apron
APD = (160, 105,  20, 255)  # apron dark
PN  = (130,  75,  40, 255)  # brown pants
PND = ( 95,  50,  25, 255)  # pants dark
BT  = ( 60,  40,  20, 255)  # boot
HA  = (190, 140,  50, 255)  # straw hat
HAD = (150, 105,  30, 255)  # hat brim dark
HAH = (220, 175,  80, 255)  # hat highlight
EY  = ( 50,  30,  10, 255)  # eye
MT  = (190,  90,  80, 255)  # mouth
WH  = (240, 240, 240, 255)  # white (eye white)

# ── Helper ────────────────────────────────────────────────────────────────────

def new_img():
    return Image.new("RGBA", (32, 32), T)

def put(img, pixels):
    """pixels: list of (x, y, color)"""
    px = img.load()
    for x, y, c in pixels:
        if 0 <= x < 32 and 0 <= y < 32:
            px[x, y] = c

# ── Base character drawing functions ─────────────────────────────────────────
# Character occupies roughly columns 11-20, rows 3-29

def draw_hat(img, y_off=0):
    """Straw hat — drawn over hair, brim wider than head."""
    put(img, [
        # brim
        (9,  6+y_off, HAD), (10, 6+y_off, HA),  (11, 6+y_off, HA),
        (12, 6+y_off, HA),  (13, 6+y_off, HA),  (14, 6+y_off, HA),
        (15, 6+y_off, HA),  (16, 6+y_off, HA),  (17, 6+y_off, HA),
        (18, 6+y_off, HA),  (19, 6+y_off, HA),  (20, 6+y_off, HAD),
        # crown top
        (11, 3+y_off, BK),  (12, 3+y_off, HAH), (13, 3+y_off, HAH),
        (14, 3+y_off, HAH), (15, 3+y_off, HAH), (16, 3+y_off, HAH),
        (17, 3+y_off, HAH), (18, 3+y_off, BK),
        # crown sides
        (11, 4+y_off, BK),  (12, 4+y_off, HA),  (13, 4+y_off, HA),
        (14, 4+y_off, HA),  (15, 4+y_off, HA),  (16, 4+y_off, HA),
        (17, 4+y_off, HA),  (18, 4+y_off, BK),
        (10, 5+y_off, BK),  (11, 5+y_off, HA),  (12, 5+y_off, HA),
        (13, 5+y_off, HA),  (14, 5+y_off, HA),  (15, 5+y_off, HA),
        (16, 5+y_off, HA),  (17, 5+y_off, HA),  (18, 5+y_off, HA),
        (19, 5+y_off, BK),
        # hat band
        (10, 6+y_off, BK),  (20, 6+y_off, BK),
    ])

def draw_face_down(img, y_off=0):
    """Front-facing face: skin, eyes, mouth."""
    put(img, [
        # face outline
        (12, 7+y_off, BK),  (13, 7+y_off, SK),  (14, 7+y_off, SK),
        (15, 7+y_off, SK),  (16, 7+y_off, SK),  (17, 7+y_off, SK),
        (18, 7+y_off, BK),
        (11, 8+y_off, BK),  (12, 8+y_off, SK),  (13, 8+y_off, SK),
        (14, 8+y_off, SK),  (15, 8+y_off, SK),  (16, 8+y_off, SK),
        (17, 8+y_off, SK),  (18, 8+y_off, SK),  (19, 8+y_off, BK),
        (11, 9+y_off, BK),  (12, 9+y_off, SK),  (13, 9+y_off, SK),
        (14, 9+y_off, SK),  (15, 9+y_off, SK),  (16, 9+y_off, SK),
        (17, 9+y_off, SK),  (18, 9+y_off, SK),  (19, 9+y_off, BK),
        (11, 10+y_off, BK), (12, 10+y_off, SK), (13, 10+y_off, SK),
        (14, 10+y_off, SK), (15, 10+y_off, SK), (16, 10+y_off, SK),
        (17, 10+y_off, SK), (18, 10+y_off, SK), (19, 10+y_off, BK),
        (12, 11+y_off, BK), (13, 11+y_off, SK), (14, 11+y_off, SK),
        (15, 11+y_off, SK), (16, 11+y_off, SK), (17, 11+y_off, SK),
        (18, 11+y_off, BK),
        # eyes
        (13, 9+y_off, EY),  (14, 9+y_off, EY),
        (17, 9+y_off, EY),  (16, 9+y_off, EY),
        # mouth
        (14, 11+y_off, MT), (15, 11+y_off, MT), (16, 11+y_off, MT),
    ])

def draw_face_up(img, y_off=0):
    """Back-facing: just hair, no face."""
    put(img, [
        (12, 7+y_off, HR),  (13, 7+y_off, HR),  (14, 7+y_off, HRL),
        (15, 7+y_off, HRL), (16, 7+y_off, HR),  (17, 7+y_off, HR),
        (18, 7+y_off, HR),
        (11, 8+y_off, HR),  (12, 8+y_off, HR),  (13, 8+y_off, HR),
        (14, 8+y_off, HRL), (15, 8+y_off, HRL), (16, 8+y_off, HR),
        (17, 8+y_off, HR),  (18, 8+y_off, HR),  (19, 8+y_off, HR),
        (11, 9+y_off, HR),  (12, 9+y_off, HR),  (13, 9+y_off, HR),
        (14, 9+y_off, HR),  (15, 9+y_off, HR),  (16, 9+y_off, HR),
        (17, 9+y_off, HR),  (18, 9+y_off, HR),  (19, 9+y_off, HR),
        (11,10+y_off, HR),  (12,10+y_off, HR),  (13,10+y_off, HR),
        (14,10+y_off, HR),  (15,10+y_off, HR),  (16,10+y_off, HR),
        (17,10+y_off, HR),  (18,10+y_off, HR),  (19,10+y_off, HR),
        (12,11+y_off, HR),  (13,11+y_off, HR),  (14,11+y_off, HR),
        (15,11+y_off, HR),  (16,11+y_off, HR),  (17,11+y_off, HR),
        (18,11+y_off, HR),
    ])

def draw_face_side(img, facing_right=True, y_off=0):
    """Side-facing face."""
    if facing_right:
        put(img, [
            (14, 7+y_off, BK),  (15, 7+y_off, BK),  (16, 7+y_off, BK),
            (13, 8+y_off, BK),  (14, 8+y_off, SK),  (15, 8+y_off, SK),
            (16, 8+y_off, SK),  (17, 8+y_off, BK),
            (13, 9+y_off, BK),  (14, 9+y_off, SK),  (15, 9+y_off, SK),
            (16, 9+y_off, SK),  (17, 9+y_off, BK),
            (13,10+y_off, BK),  (14,10+y_off, SK),  (15,10+y_off, SK),
            (16,10+y_off, SK),  (17,10+y_off, BK),
            (14,11+y_off, BK),  (15,11+y_off, SK),  (16,11+y_off, SK),
            (17,11+y_off, BK),
            # eye
            (16, 9+y_off, EY),
            # mouth
            (16,11+y_off, MT),
            # hair side
            (12, 7+y_off, HR),  (13, 7+y_off, HR),
            (12, 8+y_off, HR),  (12, 9+y_off, HR),
            (12,10+y_off, HR),  (12,11+y_off, HR),
        ])
    else:
        put(img, [
            (16, 7+y_off, BK),  (15, 7+y_off, BK),  (14, 7+y_off, BK),
            (17, 8+y_off, BK),  (16, 8+y_off, SK),  (15, 8+y_off, SK),
            (14, 8+y_off, SK),  (13, 8+y_off, BK),
            (17, 9+y_off, BK),  (16, 9+y_off, SK),  (15, 9+y_off, SK),
            (14, 9+y_off, SK),  (13, 9+y_off, BK),
            (17,10+y_off, BK),  (16,10+y_off, SK),  (15,10+y_off, SK),
            (14,10+y_off, SK),  (13,10+y_off, BK),
            (16,11+y_off, BK),  (15,11+y_off, SK),  (14,11+y_off, SK),
            (13,11+y_off, BK),
            # eye
            (14, 9+y_off, EY),
            # mouth
            (14,11+y_off, MT),
            # hair side
            (18, 7+y_off, HR),  (17, 7+y_off, HR),
            (18, 8+y_off, HR),  (18, 9+y_off, HR),
            (18,10+y_off, HR),  (18,11+y_off, HR),
        ])

def draw_body(img, y_off=0):
    """Torso: green shirt + yellow apron center strip."""
    rows = range(12, 20)
    for row in rows:
        for col in range(11, 21):
            if col in (11, 20):
                put(img, [(col, row+y_off, BK)])
            elif col in (14, 15, 16):
                put(img, [(col, row+y_off, AP)])
            elif col in (12, 13, 17, 18, 19):
                shade = SHD if row > 15 else SH
                put(img, [(col, row+y_off, shade)])
    # apron border
    put(img, [(13, row+y_off, APD) for row in rows])
    put(img, [(17, row+y_off, APD) for row in rows])

def draw_arms_idle(img, y_off=0):
    """Arms hanging at sides."""
    for row in range(13, 19):
        put(img, [
            (10, row+y_off, BK),
            (11, row+y_off, SH if row < 17 else SK),
            (21, row+y_off, BK),
            (20, row+y_off, SH if row < 17 else SK),
        ])
    # hands
    put(img, [
        (10, 18+y_off, BK), (11, 18+y_off, SK), (11, 19+y_off, SK),
        (21, 18+y_off, BK), (20, 18+y_off, SK), (20, 19+y_off, SK),
    ])

def draw_arms_walk(img, frame, y_off=0):
    """Arms swing during walk: frame 0 = left arm forward, 1 = right arm forward."""
    if frame == 0:
        # left arm forward (higher), right arm back (lower)
        for row in range(13, 18):
            put(img, [(10, row+y_off, BK), (11, row+y_off, SH)])
        put(img, [(10, 17+y_off, BK), (11, 17+y_off, SK), (11, 18+y_off, SK)])
        for row in range(14, 19):
            put(img, [(21, row+y_off, BK), (20, row+y_off, SH)])
        put(img, [(21, 19+y_off, BK), (20, 19+y_off, SK), (20, 20+y_off, SK)])
    else:
        # right arm forward, left arm back
        for row in range(13, 18):
            put(img, [(21, row+y_off, BK), (20, row+y_off, SH)])
        put(img, [(21, 17+y_off, BK), (20, 17+y_off, SK), (20, 18+y_off, SK)])
        for row in range(14, 19):
            put(img, [(10, row+y_off, BK), (11, row+y_off, SH)])
        put(img, [(10, 19+y_off, BK), (11, 19+y_off, SK), (11, 20+y_off, SK)])

def draw_legs_idle(img, y_off=0):
    """Legs standing together."""
    for row in range(20, 26):
        shade = PND if row > 23 else PN
        for col in [12, 13, 14, 15]:
            put(img, [(col, row+y_off, shade)])
        for col in [16, 17, 18, 19]:
            put(img, [(col, row+y_off, shade)])
        put(img, [(11, row+y_off, BK), (20, row+y_off, BK)])
        put(img, [(15, row+y_off, BK)])  # gap between legs
    # boots
    for row in range(26, 30):
        for col in [12, 13, 14, 15]:
            put(img, [(col, row+y_off, BT)])
        for col in [16, 17, 18, 19]:
            put(img, [(col, row+y_off, BT)])
        put(img, [(11, row+y_off, BK), (20, row+y_off, BK)])

def draw_legs_walk(img, frame, y_off=0):
    """Legs stride: frame 0 = left leg forward, frame 1 = right leg forward."""
    # Left leg cols 12-15, right leg cols 16-19
    for row in range(20, 30):
        put(img, [(11, row+y_off, BK), (20, row+y_off, BK)])

    if frame == 0:
        # left leg forward (shift up by 1), right leg back (shift down by 1)
        for row in range(19, 27):
            shade = PND if row > 22 else PN
            for col in [12, 13, 14, 15]:
                put(img, [(col, row+y_off, shade)])
        for row in range(26, 29):
            for col in [12, 13, 14, 15]:
                put(img, [(col, row+y_off, BT)])
        for row in range(21, 29):
            shade = PND if row > 24 else PN
            for col in [16, 17, 18, 19]:
                put(img, [(col, row+y_off, shade)])
        for row in range(27, 30):
            for col in [16, 17, 18, 19]:
                put(img, [(col, row+y_off, BT)])
    else:
        # right leg forward, left leg back
        for row in range(19, 27):
            shade = PND if row > 22 else PN
            for col in [16, 17, 18, 19]:
                put(img, [(col, row+y_off, shade)])
        for row in range(26, 29):
            for col in [16, 17, 18, 19]:
                put(img, [(col, row+y_off, BT)])
        for row in range(21, 29):
            shade = PND if row > 24 else PN
            for col in [12, 13, 14, 15]:
                put(img, [(col, row+y_off, shade)])
        for row in range(27, 30):
            for col in [12, 13, 14, 15]:
                put(img, [(col, row+y_off, BT)])

# ── Build frames ──────────────────────────────────────────────────────────────

def make_idle_down():
    img = new_img()
    draw_hat(img)
    draw_face_down(img)
    draw_body(img)
    draw_arms_idle(img)
    draw_legs_idle(img)
    return img

def make_idle_up():
    img = new_img()
    draw_hat(img)
    draw_face_up(img)
    draw_body(img)
    draw_arms_idle(img)
    draw_legs_idle(img)
    return img

def make_idle_left():
    img = new_img()
    draw_hat(img)
    draw_face_side(img, facing_right=False)
    draw_body(img)
    draw_arms_idle(img)
    draw_legs_idle(img)
    return img

def make_idle_right():
    img = new_img()
    draw_hat(img)
    draw_face_side(img, facing_right=True)
    draw_body(img)
    draw_arms_idle(img)
    draw_legs_idle(img)
    return img

def make_walk_down(frame):  # frame 0,1,2
    img = new_img()
    bob = 1 if frame == 1 else 0  # slight upward bob on mid-stride
    draw_hat(img, y_off=-bob)
    draw_face_down(img, y_off=-bob)
    draw_body(img)
    draw_arms_walk(img, frame % 2)
    draw_legs_walk(img, frame % 2)
    return img

def make_walk_up(frame):
    img = new_img()
    bob = 1 if frame == 1 else 0
    draw_hat(img, y_off=-bob)
    draw_face_up(img, y_off=-bob)
    draw_body(img)
    draw_arms_walk(img, frame % 2)
    draw_legs_walk(img, frame % 2)
    return img

def make_walk_left(frame):
    img = new_img()
    bob = 1 if frame == 1 else 0
    draw_hat(img, y_off=-bob)
    draw_face_side(img, facing_right=False, y_off=-bob)
    draw_body(img)
    draw_arms_walk(img, frame % 2)
    draw_legs_walk(img, frame % 2)
    return img

def make_walk_right(frame):
    img = new_img()
    bob = 1 if frame == 1 else 0
    draw_hat(img, y_off=-bob)
    draw_face_side(img, facing_right=True, y_off=-bob)
    draw_body(img)
    draw_arms_walk(img, frame % 2)
    draw_legs_walk(img, frame % 2)
    return img

# ── Save all frames ───────────────────────────────────────────────────────────

frames = {
    "idle_down":    make_idle_down(),
    "idle_up":      make_idle_up(),
    "idle_left":    make_idle_left(),
    "idle_right":   make_idle_right(),
    "walk_down_0":  make_walk_down(0),
    "walk_down_1":  make_walk_down(1),
    "walk_down_2":  make_walk_down(2),
    "walk_up_0":    make_walk_up(0),
    "walk_up_1":    make_walk_up(1),
    "walk_up_2":    make_walk_up(2),
    "walk_left_0":  make_walk_left(0),
    "walk_left_1":  make_walk_left(1),
    "walk_left_2":  make_walk_left(2),
    "walk_right_0": make_walk_right(0),
    "walk_right_1": make_walk_right(1),
    "walk_right_2": make_walk_right(2),
}

for name, img in frames.items():
    path = os.path.join(OUT_DIR, f"{name}.png")
    img.save(path, "PNG")
    print(f"Saved {path}")

print(f"\nTotal: {len(frames)} frames written to {OUT_DIR}")
