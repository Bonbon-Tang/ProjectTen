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
    with op.batch_alter_table('evaluation_tasks') as batch_op:
        batch_op.add_column(sa.Column('toolset_id', sa.Integer(), nullable=True, comment='Associated toolset asset'))
        batch_op.create_foreign_key('fk_evaluation_tasks_toolset_id', 'digital_assets', ['toolset_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    with op.batch_alter_table('evaluation_tasks') as batch_op:
        batch_op.drop_constraint('fk_evaluation_tasks_toolset_id', type_='foreignkey')
        batch_op.drop_column('toolset_id')