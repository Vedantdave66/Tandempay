---
type: community
cohesion: 0.15
members: 18
---

# Export Functionality Tests

**Cohesion:** 0.15 - loosely connected
**Members:** 18 nodes

## Members
- [[AsyncClient]] - code - backend/tests/test_export.py
- [[CSV with no expenses still returns a valid CSV with just the header row.]] - rationale - backend/tests/test_export.py
- [[Create a group with one expense for the pro_user.]] - rationale - backend/tests/test_export.py
- [[Export endpoint tests.  Tests for GET apiexportcsv and GET apiexportpdf]] - rationale - backend/tests/test_export.py
- [[PDF with no expenses still returns a valid PDF document.]] - rationale - backend/tests/test_export.py
- [[client()]] - code - backend/tests/test_export.py
- [[free_user()]] - code - backend/tests/test_export.py
- [[override_get_db()]] - code - backend/tests/test_export.py
- [[pro_user()]] - code - backend/tests/test_export.py
- [[seeded_expenses()]] - code - backend/tests/test_export.py
- [[setup_database()]] - code - backend/tests/test_export.py
- [[test_csv_export_empty_returns_header_only()]] - code - backend/tests/test_export.py
- [[test_csv_export_free_user_forbidden()]] - code - backend/tests/test_export.py
- [[test_csv_export_pro_user()]] - code - backend/tests/test_export.py
- [[test_export.py]] - code - backend/tests/test_export.py
- [[test_pdf_export_empty_returns_valid_pdf()]] - code - backend/tests/test_export.py
- [[test_pdf_export_free_user_forbidden()]] - code - backend/tests/test_export.py
- [[test_pdf_export_pro_user()]] - code - backend/tests/test_export.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Export_Functionality_Tests
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 1 edge to [[_COMMUNITY_Idempotency & Ledger]]
- 1 edge to [[_COMMUNITY_Payment & Banking Models]]
- 1 edge to [[_COMMUNITY_User & Subscription]]
- 1 edge to [[_COMMUNITY_Audit Logging]]

## Top bridge nodes
- [[AsyncClient]] - degree 14, connects to 4 communities
- [[test_export.py]] - degree 14, connects to 1 community