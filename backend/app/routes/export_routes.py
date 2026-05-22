"""
Export routes — Pro feature.

GET /api/export/csv  — download all user expenses as a CSV file
GET /api/export/pdf  — download all user expenses as a PDF report

Both endpoints require authentication and a Pro subscription.
Data source: every Expense where the current user is a participant,
joined with the group name and payer name.
"""

import csv
import io
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Expense, ExpenseParticipant, User
from app.dependencies.subscription import require_pro

logger = logging.getLogger("tandempay.export")

router = APIRouter(prefix="/api/export", tags=["export"])

COLUMNS = ["Date", "Description", "Amount", "Currency", "Group", "Paid By", "Your Share", "Status"]


async def _load_rows(current_user: User, db: AsyncSession) -> list[dict]:
    """Return expense rows for the current user, suitable for CSV/PDF."""
    result = await db.execute(
        select(ExpenseParticipant)
        .where(ExpenseParticipant.user_id == current_user.id)
        .options(
            selectinload(ExpenseParticipant.expense).selectinload(Expense.group),
            selectinload(ExpenseParticipant.expense).selectinload(Expense.payer),
        )
    )
    participants = result.scalars().all()

    rows: list[dict] = []
    for ep in participants:
        exp = ep.expense
        if exp is None:
            continue
        status = "paid by you" if exp.paid_by == current_user.id else "outstanding"
        date_str = exp.created_at.astimezone(timezone.utc).strftime("%Y-%m-%d") if exp.created_at else ""
        rows.append({
            "Date": date_str,
            "Description": exp.title,
            "Amount": f"{exp.amount:.2f}",
            "Currency": "CAD",
            "Group": exp.group.name if exp.group else "",
            "Paid By": exp.payer.name if exp.payer else "",
            "Your Share": f"{ep.share_amount:.2f}",
            "Status": status,
        })

    rows.sort(key=lambda r: r["Date"], reverse=True)
    return rows


@router.get("/csv")
async def export_csv(
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
):
    rows = await _load_rows(current_user, db)

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=COLUMNS)
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)

    filename = f"tandempay_expenses_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pdf")
async def export_pdf(
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    rows = await _load_rows(current_user, db)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    generated = datetime.now(timezone.utc).strftime("%B %d, %Y")

    story = [
        Paragraph("TandemPay Expense Report", styles["Title"]),
        Paragraph(f"Generated: {generated} — {current_user.name} ({current_user.email})", styles["Normal"]),
        Spacer(1, 0.5 * cm),
    ]

    table_data = [COLUMNS] + [[r[col] for col in COLUMNS] for r in rows]
    if len(table_data) == 1:
        table_data.append(["No expenses found.", "", "", "", "", "", "", ""])

    col_widths = [2.5 * cm, 6 * cm, 2.5 * cm, 2 * cm, 4 * cm, 3.5 * cm, 2.5 * cm, 3 * cm]
    tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3ECF8E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F4F5")]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E4E4E7")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(tbl)

    doc.build(story)
    buf.seek(0)

    filename = f"tandempay_expenses_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
