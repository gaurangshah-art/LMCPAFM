from crud.formb_application_pdf import _format_breeder_details, _name_address_display


def test_name_address_display_avoids_repeated_college_name():
    name = "L. M. College of Pharmacy, Ahmedabad"
    address = "L.M. College of Pharmacy, Navrangpura, Ahmedabad - 380009, Gujarat, India"
    assert _name_address_display(name, address) == address


def test_name_address_display_keeps_distinct_name_and_address():
    name = "ABC Breeder"
    address = "Plot 12, Industrial Area, Ahmedabad"
    assert _name_address_display(name, address) == f"{name}\n{address}"


def test_breeder_details_include_registration_number():
    text = _format_breeder_details("ABC Breeder", "Plot 12, Ahmedabad", "REG-123")
    assert "ABC Breeder" in text
    assert "Reg. No.: REG-123" in text
