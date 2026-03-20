"""add hashtags and brief_links to campaigns

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-20 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('campaigns', sa.Column('hashtags', sa.Text(), nullable=True))
    op.add_column('campaigns', sa.Column('brief_links', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('campaigns', 'hashtags')
    op.drop_column('campaigns', 'brief_links')
