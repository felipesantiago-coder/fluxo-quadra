#!/usr/bin/env python3
"""Merge cover PDF + body PDF into final document."""
import os
from pypdf import PdfReader, PdfWriter

COVER = "/home/z/my-project/download/proposta_cover.pdf"
BODY = "/home/z/my-project/download/proposta_body.pdf"
OUTPUT = "/home/z/my-project/download/Quadra_Desk_Proposta_Comercial_Quadraimob.pdf"

A4_W, A4_H = 595.28, 841.89

def normalize_page(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page

writer = PdfWriter()
writer.add_page(normalize_page(PdfReader(COVER).pages[0]))
for page in PdfReader(BODY).pages:
    writer.add_page(normalize_page(page))
writer.add_metadata({
    '/Title': 'Quadra Desk - Proposta Comercial - Quadraimob',
    '/Author': 'Quadra Desk',
    '/Creator': 'Quadra Desk',
    '/Subject': 'Proposta comercial do sistema Quadra Desk para Quadraimob',
})
with open(OUTPUT, 'wb') as f:
    writer.write(f)
print(f'Final PDF: {OUTPUT}')
print(f'Pages: {len(writer.pages)}')
print(f'Size: {os.path.getsize(OUTPUT) / 1024:.1f} KB')
