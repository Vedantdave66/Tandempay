"""merge heads

Revision ID: 534d32e54b2b
Revises: 20260522_add_recurring_expenses, 20260527_add_character_columns
Create Date: 2026-05-27 23:56:54.537433

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '534d32e54b2b'
down_revision: Union[str, Sequence[str], None] = ('20260522_add_recurring_expenses', '20260527_add_character_columns')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
