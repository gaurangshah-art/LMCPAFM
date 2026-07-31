from __future__ import annotations

from fpdf import FPDF

from utils.branding import get_college_display_name, get_logo_path
from utils.institution import get_cpcsea_registration_number


def _safe_text(value) -> str:
    if value is None:
        return ""
    return str(value).encode("latin-1", errors="replace").decode("latin-1")


class BrandedPDF(FPDF):
    """FPDF base class with LMCP logo and college name in the page header."""

    def header(self):
        logo_path = get_logo_path()
        top_y = 8
        text_x = self.l_margin

        if logo_path is not None:
            try:
                # Portrait crest: size by height so the shield stays legible.
                self.image(str(logo_path), x=self.l_margin, y=top_y, h=16)
                text_x = self.l_margin + 20
            except Exception:
                text_x = self.l_margin

        self.set_xy(text_x, top_y + 1)
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 5, _safe_text(get_college_display_name()), ln=True)

        self.set_x(text_x)
        self.set_font("Helvetica", "", 8)
        self.cell(
            0,
            4,
            _safe_text(f"CPCSEA Reg. No.: {get_cpcsea_registration_number()}"),
            ln=True,
        )
        self.ln(4)
