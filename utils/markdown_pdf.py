"""Render a Markdown document to a printable PDF using fpdf2 core fonts."""

from __future__ import annotations

import re

from fpdf import FPDF
from fpdf.enums import WrapMode

_REPLACEMENTS = {
    "\u2014": "-",
    "\u2013": "-",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2022": "-",
    "\u00a0": " ",
    "\u200b": "",
    "\u2009": " ",
    "\u202f": " ",
    "\u2610": "[ ]",
    "\u2611": "[x]",
    "\u2612": "[x]",
    "\u2192": "->",
    "\u2190": "<-",
    "\u00d7": "x",
    "\u2026": "...",
    "\u00ae": "(R)",
    "\u2122": "(TM)",
    "\u00b7": "-",
    "\ufeff": "",
}

_LINK = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_CODE = re.compile(r"`([^`]*)`")
_IMAGE = re.compile(r"!\[([^\]]*)\]\([^)]+\)")


def _plain(text: str) -> str:
    for source, target in _REPLACEMENTS.items():
        text = text.replace(source, target)
    text = _IMAGE.sub(r"\1", text)
    text = _LINK.sub(r"\1", text)
    text = _CODE.sub(r"\1", text)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _split_table_row(line: str) -> list[str]:
    inner = line.strip()
    if inner.startswith("|"):
        inner = inner[1:]
    if inner.endswith("|"):
        inner = inner[:-1]
    return [_plain(cell.strip()) or " " for cell in inner.split("|")]


def _is_separator_row(line: str) -> bool:
    cells = [cell.strip().replace(" ", "") for cell in _split_table_row(line)]
    return bool(cells) and all(set(cell) <= {":", "-"} and "-" in cell for cell in cells)


def _column_widths(column_count: int) -> tuple[float, ...]:
    if column_count == 2:
        return (0.34, 0.66)
    if column_count == 3:
        return (0.24, 0.28, 0.48)
    if column_count == 4:
        return (0.08, 0.52, 0.16, 0.24)
    if column_count <= 0:
        return ()
    share = 1 / column_count
    return tuple(share for _ in range(column_count))


class _GuidePDF(FPDF):
    def header(self) -> None:
        self.set_font("Helvetica", "B", 9)
        self.cell(0, 6, "L. M. College of Pharmacy  |  LMCPAFM QA pack", new_x="LMARGIN", new_y="NEXT")
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.cell(0, 8, f"Page {self.page_no()}", align="R")


def _strip_front_matter(text: str) -> str:
    if not text.startswith("---"):
        return text
    end = text.find("\n---", 3)
    if end == -1:
        return text
    return text[end + 4 :]


def markdown_to_pdf_bytes(markdown_text: str) -> bytes:
    pdf = _GuidePDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(14, 18, 14)
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)

    lines = _strip_front_matter(markdown_text).replace("\r\n", "\n").split("\n")
    index = 0
    while index < len(lines):
        raw = lines[index]
        stripped = raw.strip()

        if not stripped:
            pdf.ln(2)
            index += 1
            continue

        if stripped.startswith("<") and "page-break" in stripped:
            pdf.add_page()
            index += 1
            continue

        if stripped.startswith("```"):
            index += 1
            code_lines: list[str] = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(_plain(lines[index]))
                index += 1
            if index < len(lines):
                index += 1
            pdf.set_font("Courier", size=8)
            for code_line in code_lines:
                pdf.set_x(pdf.l_margin)
                pdf.multi_cell(pdf.epw, 4, code_line or " ", wrapmode=WrapMode.CHAR)
            pdf.ln(1)
            pdf.set_font("Helvetica", size=10)
            continue

        if stripped.startswith("|"):
            rows: list[list[str]] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                row_line = lines[index].strip()
                index += 1
                if _is_separator_row(row_line):
                    continue
                rows.append(_split_table_row(row_line))
            if rows:
                width = max(len(row) for row in rows)
                padded = [row + [" "] * (width - len(row)) for row in rows]
                pdf.set_font("Helvetica", size=8)
                with pdf.table(
                    width=pdf.epw,
                    col_widths=_column_widths(width),
                    first_row_as_headings=True,
                    markdown=True,
                    line_height=4.5,
                    text_align="LEFT",
                ) as table:
                    for row in padded:
                        table.row(row)
                pdf.ln(2)
                pdf.set_font("Helvetica", size=10)
            continue

        if stripped.startswith("#"):
            level = len(stripped) - len(stripped.lstrip("#"))
            heading = _plain(stripped[level:].strip())
            size = {1: 16, 2: 13, 3: 12}.get(level, 11)
            pdf.ln(1)
            pdf.set_x(pdf.l_margin)
            pdf.set_font("Helvetica", "B", size)
            pdf.multi_cell(pdf.epw, size * 0.45, heading, markdown=True)
            pdf.ln(1)
            pdf.set_font("Helvetica", size=10)
            index += 1
            continue

        if re.match(r"^([-*])\s+", stripped):
            indent = min(len(raw) - len(raw.lstrip(" ")), 12)
            body = _plain(re.sub(r"^[-*]\s+", "", stripped))
            pdf.set_x(pdf.l_margin + indent)
            pdf.multi_cell(pdf.epw - indent, 5, f"- {body}", markdown=True, wrapmode=WrapMode.CHAR)
            index += 1
            continue

        numbered = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        if numbered:
            indent = min(len(raw) - len(raw.lstrip(" ")), 12)
            pdf.set_x(pdf.l_margin + indent)
            pdf.multi_cell(
                pdf.epw - indent,
                5,
                _plain(f"{numbered.group(1)}. {numbered.group(2)}"),
                markdown=True,
                wrapmode=WrapMode.CHAR,
            )
            index += 1
            continue

        if stripped in {"---", "***", "___"}:
            y = pdf.get_y()
            pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
            pdf.ln(3)
            index += 1
            continue

        paragraph = [_plain(stripped)]
        index += 1
        while index < len(lines):
            nxt = lines[index].strip()
            if (
                not nxt
                or nxt.startswith("#")
                or nxt.startswith("|")
                or nxt.startswith("```")
                or nxt in {"---", "***", "___"}
                or re.match(r"^([-*]|\d+\.)\s+", nxt)
                or (nxt.startswith("<") and "page-break" in nxt)
            ):
                break
            paragraph.append(_plain(nxt))
            index += 1
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(pdf.epw, 5, " ".join(paragraph), markdown=True, wrapmode=WrapMode.CHAR)
        pdf.ln(1)

    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return bytes(output)
