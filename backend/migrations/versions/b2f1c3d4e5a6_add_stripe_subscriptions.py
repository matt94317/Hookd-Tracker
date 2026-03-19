"""add stripe subscriptions

Revision ID: b2f1c3d4e5a6
Revises: ad4ee1142cad
Create Date: 2026-03-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'b2f1c3d4e5a6'
down_revision = 'ad4ee1142cad'
branch_labels = None
depends_on = None


def upgrade():
    # Add stripe_customer_id to users (skip if already added)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    user_cols = [c['name'] for c in inspector.get_columns('users')]
    if 'stripe_customer_id' not in user_cols:
        op.add_column('users', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
        op.create_unique_constraint('uq_users_stripe_customer_id', 'users', ['stripe_customer_id'])

    # Create subscription_plans enum if it doesn't exist
    subscription_plans = postgresql.ENUM('starter', 'pro', 'enterprise', name='subscription_plans')
    subscription_plans.create(conn, checkfirst=True)

    # Create subscriptions table if it doesn't exist
    if 'subscriptions' not in inspector.get_table_names():
        op.create_table(
            'subscriptions',
            sa.Column('id', sa.BigInteger(), nullable=False),
            sa.Column('company_id', sa.BigInteger(), nullable=False),
            sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True),
            sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
            sa.Column('plan', postgresql.ENUM('starter', 'pro', 'enterprise', name='subscription_plans', create_type=False), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
            sa.Column('current_period_start', sa.DateTime(), nullable=True),
            sa.Column('current_period_end', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['company_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('company_id', name='uq_subscriptions_company_id'),
            sa.UniqueConstraint('stripe_subscription_id', name='uq_subscriptions_stripe_id'),
        )


def downgrade():
    op.drop_table('subscriptions')
    postgresql.ENUM(name='subscription_plans').drop(op.get_bind(), checkfirst=True)
    op.drop_constraint('uq_users_stripe_customer_id', 'users', type_='unique')
    op.drop_column('users', 'stripe_customer_id')
