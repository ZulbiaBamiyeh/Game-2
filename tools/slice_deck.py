"""Slice assets/deck-source.jpeg into the two 13x4 card sprite sheets.

The source is a contact sheet of 8 rows x 13 columns: the first four rows are
the normal-contrast deck (spades, hearts, clubs, diamonds), the last four the
high-contrast one, in the same suit order. Column 0 is the Ace, column 12 the
King.

Each card is cropped on its printed border, then pasted *centred* into a fixed
cell with an equal margin on all four sides, so no side of the artwork sits
closer to the edge than any other. The borders below were read off the source's
row/column brightness profiles (the printed outline shows as a sharp dip); they
are inclusive on both ends.
"""
from PIL import Image

SRC = 'assets/deck-source.jpeg'

# Outer edge of each card's printed border.
COL_L = [5, 91, 177, 263, 348, 434, 520, 605, 691, 777, 862, 948, 1034]
COL_R = [85, 171, 256, 343, 428, 514, 600, 685, 771, 856, 942, 1028, 1114]
ROW_T = [27, 141, 255, 368, 504, 617, 731, 844]
ROW_B = [135, 248, 362, 475, 611, 725, 838, 952]

MARGIN = 3                      # blank border kept around every card
CARD_W = max(r - l + 1 for l, r in zip(COL_L, COL_R))     # 81
CARD_H = max(b - t + 1 for t, b in zip(ROW_T, ROW_B))     # 109
CELL_W = CARD_W + MARGIN * 2                              # 87
CELL_H = CARD_H + MARGIN * 2                              # 115
SCALE = 3                       # supersample so the sheet stays sharp when scaled

SHEETS = [('assets/cards-main.png', range(0, 4)),
          ('assets/cards-contrast.png', range(4, 8))]


def build(src, rows):
    sheet = Image.new('RGB', (CELL_W * 13 * SCALE, CELL_H * 4 * SCALE), (255, 255, 255))
    for out_row, src_row in enumerate(rows):
        top, bottom = ROW_T[src_row], ROW_B[src_row]
        for col in range(13):
            left, right = COL_L[col], COL_R[col]
            card = src.crop((left, top, right + 1, bottom + 1))
            card = card.resize((card.width * SCALE, card.height * SCALE), Image.LANCZOS)
            cell_x = col * CELL_W * SCALE
            cell_y = out_row * CELL_H * SCALE
            # Centre it: whatever slack is left is split evenly between the sides.
            ox = cell_x + (CELL_W * SCALE - card.width) // 2
            oy = cell_y + (CELL_H * SCALE - card.height) // 2
            sheet.paste(card, (ox, oy))
    return sheet


def main():
    src = Image.open(SRC).convert('RGB')
    for path, rows in SHEETS:
        sheet = build(src, rows)
        # The art is near-flat, so a 256-colour palette is visually identical
        # (mean error ~1/255) and keeps the sheet around a third of the size a
        # truecolour PNG of smooth upscaled gradients would take.
        sheet.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE).save(path, optimize=True)
        print(f'{path}  {sheet.width}x{sheet.height}  cell {CELL_W}x{CELL_H} @{SCALE}x')


if __name__ == '__main__':
    main()
