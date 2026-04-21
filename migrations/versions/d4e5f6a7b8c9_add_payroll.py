"""add payroll support

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('accounts', sa.Column('payout_amount', sa.Numeric(10, 2), nullable=True, server_default='0'))

    op.create_table(
        'payroll_records',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('account_id', sa.BigInteger(), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('month', sa.String(7), nullable=False),
        sa.Column('posts_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('monthly_target', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('payout_amount', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by_id', sa.BigInteger(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('account_id', 'month', name='uq_payroll_account_month'),
    )


def downgrade():
    op.drop_table('payroll_records')
    op.drop_column('accounts', 'payout_amount')
