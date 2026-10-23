"""사진에서 그림 부분만 잘라낸다. build.mjs가 figures 항목마다 호출한다.

사용: python crop.py <원본> <결과.png> <spec>
  spec = auto            맨 위 글 덩어리(문제 제목 줄)를 떼고 나머지에서 바깥 여백을 정리
       = full            전체에서 바깥 여백만 정리
       = x,y,w,h         픽셀 좌표로 자른 뒤 여백 정리
"""
import sys
from PIL import Image, ImageChops

PAD = 14          # 결과 둘레 여백(px)
GAP = 18          # 제목과 그림 사이로 보는 최소 빈 줄 높이(px)
INK = 235         # 이 값보다 어두우면 글자/그림으로 본다 (0~255)


def rows_with_ink(gray):
    w, h = gray.size
    px = gray.load()
    out = []
    for y in range(h):
        out.append(any(px[x, y] < INK for x in range(0, w, 2)))
    return out


def bbox(gray):
    """글자·그림이 있는 영역. 없으면 None"""
    bg = Image.new('L', gray.size, 255)
    diff = ImageChops.difference(gray, bg).point(lambda v: 255 if v > 255 - INK else 0)
    return diff.getbbox()


def main():
    src, dst, spec = sys.argv[1], sys.argv[2], sys.argv[3]
    im = Image.open(src).convert('RGB')
    gray = im.convert('L')

    if spec not in ('auto', 'full'):
        x, y, w, h = (int(v) for v in spec.split(','))
        im = im.crop((x, y, x + w, y + h))
        gray = im.convert('L')
    elif spec == 'auto':
        ink = rows_with_ink(gray)
        h = len(ink)
        y = 0
        while y < h and not ink[y]:
            y += 1
        # 첫 글 덩어리 끝까지
        while y < h and ink[y]:
            y += 1
        # 그 뒤 빈 줄이 GAP 이상이면 거기서 자른다. 짧으면 제목이 두 줄인 것이라 다음 덩어리까지 이어 본다
        while y < h:
            blank_start = y
            while y < h and not ink[y]:
                y += 1
            if y - blank_start >= GAP or y >= h:
                break
            while y < h and ink[y]:
                y += 1
        if y < h:
            im = im.crop((0, y, im.width, h))
            gray = im.convert('L')

    box = bbox(gray)
    if box:
        x0, y0, x1, y1 = box
        im = im.crop((max(0, x0 - PAD), max(0, y0 - PAD), min(im.width, x1 + PAD), min(im.height, y1 + PAD)))
    im.save(dst, 'PNG', optimize=True)
    print(f'{im.width}x{im.height}')


if __name__ == '__main__':
    main()
