from PIL import Image, ImageDraw
import math

W, H = 64, 104
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

cx, cy = 32, 30  # flower center

# Palette
C_BG          = (0, 0, 0, 0)
C_PETAL_OUT   = (255, 200,  30, 255)   # outer ring - saturated gold
C_PETAL_OUT_D = (200, 140,   0, 255)   # outer ring shading
C_PETAL_MID   = (255, 230,  90, 255)   # mid ring - lighter yellow
C_PETAL_IN    = (255, 245, 160, 255)   # inner ring - pale cream
C_CTR_D       = (150,  50,   0, 255)   # center dark brown-orange
C_CTR_M       = (210,  90,  10, 255)   # center mid
C_CTR_L       = (255, 160,  40, 255)   # center highlight dots
C_OUTLINE     = ( 60,  25,   0, 220)   # petal outline
C_STEM        = ( 45, 110,  35, 255)
C_STEM_D      = ( 25,  70,  20, 255)
C_LEAF        = ( 65, 155,  45, 255)
C_LEAF_D      = ( 30,  90,  20, 255)
C_LEAF_L      = (110, 200,  70, 255)
C_LEAF_VN     = ( 35,  95,  25, 255)   # vein

def petal_polygon(cx, cy, angle, tip_r, base_r, half_w):
    tx = cx + tip_r * math.cos(angle)
    ty = cy + tip_r * math.sin(angle)
    bx = cx + base_r * math.cos(angle)
    by = cy + base_r * math.sin(angle)
    pa = angle + math.pi / 2
    p1 = (bx + half_w * math.cos(pa), by + half_w * math.sin(pa))
    p2 = (bx - half_w * math.cos(pa), by - half_w * math.sin(pa))
    return [p1, (tx, ty), p2]

# ── Outer petals (16) ─────────────────────────────────────────────────
N_OUT = 16
for i in range(N_OUT):
    a = 2*math.pi*i/N_OUT - math.pi/2
    poly = petal_polygon(cx, cy, a, tip_r=23, base_r=9, half_w=4.5)
    draw.polygon(poly, fill=C_PETAL_OUT)
    draw.polygon(poly, outline=C_OUTLINE)

# Outer petal highlight stripe (lighter center line per petal)
for i in range(N_OUT):
    a = 2*math.pi*i/N_OUT - math.pi/2
    tx = cx + 23*math.cos(a)
    ty = cy + 23*math.sin(a)
    bx = cx +  9*math.cos(a)
    by = cy +  9*math.sin(a)
    draw.line([(int(bx), int(by)), (int(tx), int(ty))], fill=C_PETAL_MID, width=1)

# ── Mid petals (12, offset by half step) ─────────────────────────────
N_MID = 12
for i in range(N_MID):
    a = 2*math.pi*i/N_MID - math.pi/2 + math.pi/N_MID
    poly = petal_polygon(cx, cy, a, tip_r=16, base_r=7, half_w=3.5)
    draw.polygon(poly, fill=C_PETAL_MID)
    draw.polygon(poly, outline=C_OUTLINE)

# ── Inner petals (8) ─────────────────────────────────────────────────
N_IN = 8
for i in range(N_IN):
    a = 2*math.pi*i/N_IN - math.pi/2
    poly = petal_polygon(cx, cy, a, tip_r=11, base_r=5, half_w=2.5)
    draw.polygon(poly, fill=C_PETAL_IN)
    draw.polygon(poly, outline=C_OUTLINE)

# ── Center ────────────────────────────────────────────────────────────
draw.ellipse([cx-6, cy-6, cx+6, cy+6], fill=C_CTR_D, outline=C_OUTLINE)
draw.ellipse([cx-4, cy-4, cx+4, cy+4], fill=C_CTR_M)
# Highlight arc top-left
draw.arc([cx-3, cy-3, cx+3, cy+3], start=200, end=340, fill=C_CTR_L, width=1)
# Tiny center dot
draw.ellipse([cx-1, cy-1, cx+1, cy+1], fill=C_CTR_L)

# ── Stem ─────────────────────────────────────────────────────────────
stem_top = cy + 23
for y in range(stem_top, 98):
    draw.point((32, y), fill=C_STEM)
    draw.point((33, y), fill=C_STEM)
    if y % 6 < 3:
        draw.point((31, y), fill=C_STEM_D)

# ── Leaves ────────────────────────────────────────────────────────────
# Left leaf — lobed, points left-down
leaf_l = [(32, 63), (28, 61), (18, 65), (11, 73), (14, 78),
          (22, 76), (28, 70), (32, 67)]
draw.polygon(leaf_l, fill=C_LEAF, outline=C_LEAF_D)
# highlight lobe
draw.polygon([(32,63),(28,61),(22,65),(26,67),(32,65)], fill=C_LEAF_L)
# vein
draw.line([(32,63),(11,73)], fill=C_LEAF_VN, width=1)
draw.line([(22,68),(14,75)], fill=C_LEAF_VN, width=1)
draw.line([(26,65),(20,72)], fill=C_LEAF_VN, width=1)

# Right leaf — lobed, points right-down
leaf_r = [(32, 75), (36, 73), (46, 74), (52, 80), (50, 86),
          (42, 85), (36, 79), (32, 78)]
draw.polygon(leaf_r, fill=C_LEAF, outline=C_LEAF_D)
# highlight lobe
draw.polygon([(32,75),(36,73),(42,75),(38,78),(32,76)], fill=C_LEAF_L)
# vein
draw.line([(32,75),(52,80)], fill=C_LEAF_VN, width=1)
draw.line([(42,78),(50,84)], fill=C_LEAF_VN, width=1)
draw.line([(38,76),(44,82)], fill=C_LEAF_VN, width=1)

# ── Save ──────────────────────────────────────────────────────────────
out = 'assets/chrysanthemum_art.png'
img.save(out)
print(f"Saved {W}x{H} to {out}")
