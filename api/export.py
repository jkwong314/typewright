import json
import base64
import io
import zipfile
import traceback
from http.server import BaseHTTPRequestHandler
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.t2Pen import T2Pen


def draw_contours(pen, contours, is_cff=False):
    for contour in contours:
        points = contour.get("points", [])
        if not points:
            continue
        i = 0
        started = False
        while i < len(points):
            pt = points[i]
            if not started:
                pen.moveTo((pt["x"], pt["y"]))
                started = True
                i += 1
            elif pt["type"] == "on":
                pen.lineTo((pt["x"], pt["y"]))
                i += 1
            elif pt["type"] == "off":
                p1 = pt
                p2 = points[i + 1] if i + 1 < len(points) else None
                p3 = points[i + 2] if i + 2 < len(points) else None
                if p2 and p2["type"] == "off" and p3:
                    pen.curveTo(
                        (p1["x"], p1["y"]),
                        (p2["x"], p2["y"]),
                        (p3["x"], p3["y"]),
                    )
                    i += 3
                elif p2:
                    pen.qCurveTo((p1["x"], p1["y"]), (p2["x"], p2["y"]))
                    i += 2
                else:
                    i += 1
            else:
                i += 1
        if started:
            pen.closePath()


def apply_glyph_overrides(font, overrides):
    cmap = font.getBestCmap()
    if not cmap:
        return
    is_cff = "CFF " in font

    for unicode_hex, override in overrides.items():
        try:
            cp = int(unicode_hex, 16)
            if cp not in cmap:
                continue
            glyph_name = cmap[cp]
            aw = override.get("advanceWidth", 500)
            contours = override.get("contours", [])

            if is_cff:
                cs = font["CFF "].cffFont.topDict.CharStrings[glyph_name]
                pen = T2Pen(aw, cs)
                draw_contours(pen, contours, is_cff=True)
            else:
                pen = TTGlyphPen(font.getGlyphSet())
                draw_contours(pen, contours)
                font["glyf"][glyph_name] = pen.glyph()

            lsb = font["hmtx"].metrics.get(glyph_name, (aw, 0))[1]
            font["hmtx"].metrics[glyph_name] = (aw, lsb)
        except Exception:
            pass  # skip malformed overrides


def apply_metrics(font, metrics):
    try:
        upm = metrics.get("unitsPerEm")
        asc = metrics.get("ascender")
        desc = metrics.get("descender")
        cap = metrics.get("capHeight")
        xh = metrics.get("xHeight")
        lg = metrics.get("lineGap", 0)

        if upm and "head" in font:
            font["head"].unitsPerEm = int(upm)
        if asc is not None:
            if "OS/2" in font:
                font["OS/2"].sTypoAscender = int(asc)
                font["OS/2"].usWinAscent = int(asc)
            if "hhea" in font:
                font["hhea"].ascent = int(asc)
        if desc is not None:
            if "OS/2" in font:
                font["OS/2"].sTypoDescender = int(desc)
                font["OS/2"].usWinDescent = abs(int(desc))
            if "hhea" in font:
                font["hhea"].descent = int(desc)
        if lg is not None and "OS/2" in font:
            font["OS/2"].sTypoLineGap = int(lg)
        if cap is not None and "OS/2" in font:
            font["OS/2"].sCapHeight = int(cap)
        if xh is not None and "OS/2" in font:
            font["OS/2"].sxHeight = int(xh)
    except Exception:
        pass


def apply_kerning(font, pairs):
    if not pairs or "kern" not in font:
        return
    try:
        kern = font["kern"]
        if not kern.kernTables:
            return
        table = kern.kernTables[0]
        for pair in pairs:
            cmap = font.getBestCmap() or {}
            l_cp = int(pair["left"], 16)
            r_cp = int(pair["right"], 16)
            l_name = cmap.get(l_cp)
            r_name = cmap.get(r_cp)
            if l_name and r_name:
                table.kernTable[(l_name, r_name)] = int(pair["value"])
    except Exception:
        pass


def export_font(font, fmt):
    buf = io.BytesIO()
    if fmt == "woff2":
        ttf_buf = io.BytesIO()
        font.save(ttf_buf)
        ttf_buf.seek(0)
        from fontTools.ttLib.woff2 import compress
        compress(ttf_buf, buf)
    elif fmt == "woff":
        orig_flavor = font.flavor
        font.flavor = "woff"
        font.save(buf)
        font.flavor = orig_flavor
    else:
        font.save(buf)
    buf.seek(0)
    return buf.read()


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            families = body.get("families", [])
            formats = body.get("formats", ["woff2", "ttf"])

            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for family in families:
                    fname = family["name"].replace(" ", "_")
                    for style in family.get("styles", []):
                        sname = style["name"].replace(" ", "_")
                        font_b64 = style.get("fontData")
                        if not font_b64:
                            continue
                        font_bytes = base64.b64decode(font_b64)
                        font = TTFont(io.BytesIO(font_bytes))

                        apply_metrics(font, style.get("metrics", {}))
                        apply_glyph_overrides(font, style.get("glyphOverrides", {}))
                        apply_kerning(font, style.get("kerningPairs", []))

                        base = f"{fname}-{sname}"
                        ext_map = {"woff2": "woff2", "woff": "woff", "ttf": "ttf", "otf": "otf"}
                        for fmt in formats:
                            data = export_font(font, fmt)
                            zf.writestr(f"{base}.{ext_map.get(fmt, fmt)}", data)

            zip_buf.seek(0)
            out = zip_buf.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Disposition", 'attachment; filename="typewright-export.zip"')
            self.send_header("Content-Length", str(len(out)))
            self.end_headers()
            self.wfile.write(out)

        except Exception as e:
            err = traceback.format_exc()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e), "trace": err}).encode())

    def log_message(self, format, *args):
        pass
