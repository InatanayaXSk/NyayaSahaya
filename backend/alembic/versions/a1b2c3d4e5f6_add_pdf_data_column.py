"""add pdf_data column to ledger

Revision ID: a1b2c3d4e5f6
Revises: bad255cd9b54
Create Date: 2026-06-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: str = 'bad255cd9b54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('ledger', sa.Column('pdf_data', sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column('ledger', 'pdf_data')
