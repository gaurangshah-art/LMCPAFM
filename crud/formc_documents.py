from __future__ import annotations

from fpdf import FPDF

from crud.crud_inventory import get_form_c_data
from crud.formb_documents import _safe_text
from sqlalchemy.orm import Session
from utils.institution import get_cpcsea_registration_number, get_establishment_name


class _FormCPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 7, _safe_text(get_establishment_name()), ln=True, align="C")
        self.set_font("Helvetica", "", 9)
        self.cell(0, 6, _safe_text(f"CPCSEA Reg. No.: {get_cpcsea_registration_number()}"), ln=True, align="C")
        self.ln(2)


def render_form_c_pdf(db: Session) -> bytes:
    data = get_form_c_data(db)
    pdf = _FormCPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Form C - Breeding and Stock Register", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, _safe_text(f"As of {data['as_of_date']}"), ln=True)
    pdf.ln(3)

    def section(title: str, headers: list[str], rows: list[dict], keys: list[str]) -> None:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, title, ln=True)
        pdf.set_font("Helvetica", "B", 8)
        col_w = 190 / len(headers)
        for header in headers:
            pdf.cell(col_w, 6, header, border=1)
        pdf.ln()
        pdf.set_font("Helvetica", "", 8)
        if not rows:
            pdf.cell(190, 6, "No records", border=1, ln=True)
            pdf.ln(2)
            return
        for row in rows:
            for key in keys:
                pdf.cell(col_w, 6, _safe_text(row.get(key)), border=1)
            pdf.ln()
        pdf.ln(3)

    section(
        "Stock on hand",
        ["Date", "Species", "Strain", "In stock"],
        data["stock_rows"],
        ["date", "species_name", "strain_name", "number_in_stock"],
    )
    section(
        "Acquisitions (procurement)",
        ["Date", "Species", "Strain", "Count", "Supplier", "Voucher"],
        data["acquisition_rows"],
        ["date", "species_name", "strain_name", "number_acquired", "supplier_name", "voucher_or_bill_number"],
    )
    section(
        "Breeding births",
        ["Date", "Species", "Strain", "Offspring", "Litters", "Remarks"],
        data["breeding_rows"],
        ["date", "species_name", "strain_name", "number_born", "litter_count", "remarks"],
    )
    section(
        "Disposals / deaths",
        ["Date", "Animal", "Species", "Strain", "Method", "Reason"],
        data["disposal_rows"],
        ["date", "animal_number", "species_name", "strain_name", "method", "reason"],
    )
    section(
        "Supplied / issued",
        ["Date", "Species", "Strain", "Count", "Destination"],
        data["supplied_rows"],
        ["date", "species_name", "strain_name", "number_supplied", "destination_name"],
    )

    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output
