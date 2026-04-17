"""add weekly_target to accounts

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('accounts', sa.Column('weekly_target', sa.Integer(), nullable=True, server_default='0'))


def downgrade():
    op.drop_column('accounts', 'weekly_target')
