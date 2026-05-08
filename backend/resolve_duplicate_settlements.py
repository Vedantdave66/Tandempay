"""
Resolve duplicate active settlement rows blocking the Alembic partial index.

The migration ad04bfa3ca33 tries to create:
    CREATE UNIQUE INDEX uq_active_settlement_per_pair
    ON settlement_records (group_id, payer_id, payee_id)
    WHERE status IN ('pending', 'sent')

This fails because the production DB already has duplicate active rows for at
least one (group_id, payer_id, payee_id) triplet.

Strategy: for each duplicate group, keep the OLDEST row (first settlement
initiated) and mark all newer duplicates as 'declined'. This is the safest
resolution — the duplicates were ghost records created before the guard existed.
"""
from dotenv import load_dotenv
load_dotenv(".env")

import os
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

raw = os.environ["DATABASE_URL"]
url = raw.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

engine = create_engine(url, poolclass=NullPool)

with engine.begin() as conn:
    # Step 1: Find all duplicate active pairs
    dupes = conn.execute(text(
        "SELECT group_id, payer_id, payee_id, COUNT(*) as cnt "
        "FROM settlement_records "
        "WHERE status IN ('pending', 'sent') "
        "GROUP BY group_id, payer_id, payee_id "
        "HAVING COUNT(*) > 1"
    )).fetchall()

    if not dupes:
        print("No duplicate active settlements found. Safe to run migration.")
    else:
        print(f"Found {len(dupes)} duplicate pair(s):")
        for d in dupes:
            print(f"  group={d.group_id} payer={d.payer_id} payee={d.payee_id} count={d.cnt}")

        # Step 2: For each duplicate, show all rows
        for d in dupes:
            rows = conn.execute(text(
                "SELECT id, status, amount, created_at "
                "FROM settlement_records "
                "WHERE group_id = :g AND payer_id = :p AND payee_id = :pe "
                "  AND status IN ('pending', 'sent') "
                "ORDER BY created_at ASC"
            ), {"g": d.group_id, "p": d.payer_id, "pe": d.payee_id}).fetchall()

            print(f"\n  Rows for this pair (oldest first):")
            for i, r in enumerate(rows):
                label = "KEEP (oldest)" if i == 0 else "MARK DECLINED"
                print(f"    [{label}] id={r.id} status={r.status} amount={r.amount} created={r.created_at}")

        # Step 3: Confirm before applying fix
        print("\nApplying fix: marking all newer duplicates as 'declined'...")

        for d in dupes:
            rows = conn.execute(text(
                "SELECT id FROM settlement_records "
                "WHERE group_id = :g AND payer_id = :p AND payee_id = :pe "
                "  AND status IN ('pending', 'sent') "
                "ORDER BY created_at ASC"
            ), {"g": d.group_id, "p": d.payer_id, "pe": d.payee_id}).fetchall()

            # Skip the first (oldest), decline the rest
            ids_to_decline = [r.id for r in rows[1:]]
            for rid in ids_to_decline:
                conn.execute(text(
                    "UPDATE settlement_records SET status = 'declined' WHERE id = :id"
                ), {"id": rid})
                print(f"  Marked {rid} -> declined")

    print("\nDone. Run 'python -m alembic upgrade head' to apply the migration.")

engine.dispose()
