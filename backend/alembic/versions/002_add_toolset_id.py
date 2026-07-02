"""add_toolset_id_to_evaluation_tasks

Revision ID: add_toolset_id_eval
Revises: add_eval_asset_codes
Create Date: 2026-07-02

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_toolset_id_eval'
down_revision = 'add_eval_asset_codes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('evaluation_tasks', sa.Column('toolset_id', sa.Integer(), sa.ForeignKey('digital_assets.id', ondelete='SET NULL'), nullable=True, comment='Associated toolset asset'))


def downgrade() -> None:
    op.drop_column('evaluation_tasks', 'toolset_id')
