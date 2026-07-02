"""add_operator_lib_id_and_image_id

Revision ID: add_operator_lib_image_id
Revises: add_toolset_id_eval
Create Date: 2026-07-02

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_operator_lib_image_id'
down_revision = 'add_toolset_id_eval'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('evaluation_tasks') as batch_op:
        batch_op.add_column(sa.Column('operator_lib_id', sa.Integer(), nullable=True, comment='Operator library asset (e.g. FlagGems, DIOPI)'))
        batch_op.create_foreign_key('fk_evaluation_tasks_operator_lib_id', 'digital_assets', ['operator_lib_id'], ['id'], ondelete='SET NULL')
        batch_op.add_column(sa.Column('image_id', sa.Integer(), nullable=True, comment='Model deployment image (chip+framework+model)'))
        batch_op.create_foreign_key('fk_evaluation_tasks_image_id', 'digital_assets', ['image_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    with op.batch_alter_table('evaluation_tasks') as batch_op:
        batch_op.drop_constraint('fk_evaluation_tasks_image_id', type_='foreignkey')
        batch_op.drop_column('image_id')
        batch_op.drop_constraint('fk_evaluation_tasks_operator_lib_id', type_='foreignkey')
        batch_op.drop_column('operator_lib_id')