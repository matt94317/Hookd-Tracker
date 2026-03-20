"""add cover_image_url to campaigns

Revision ID: a1b2c3d4e5f6
Revises: 829c623b72da
Create Date: 2026-03-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '829c623b72da'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('campaigns', sa.Column('cover_image_url', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('campaigns', 'cover_image_url')
