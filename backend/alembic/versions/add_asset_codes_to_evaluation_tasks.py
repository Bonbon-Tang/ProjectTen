"""add_asset_codes_to_evaluation_tasks

Revision ID: add_eval_asset_codes
Revises: add_tags_to_eval
Create Date: 2026-04-10

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_eval_asset_codes'
down_revision = 'add_tags_to_eval'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('evaluation_tasks', sa.Column('image_code', sa.String(length=16), nullable=True, comment='业务镜像编号快照'))
    op.add_column('evaluation_tasks', sa.Column('toolset_code', sa.String(length=16), nullable=True, comment='业务工具编号快照'))
    op.create_index('ix_evaluation_tasks_image_code', 'evaluation_tasks', ['image_code'])
    op.create_index('ix_evaluation_tasks_toolset_code', 'evaluation_tasks', ['toolset_code'])


def downgrade() -> None:
    op.drop_index('ix_evaluation_tasks_toolset_code', table_name='evaluation_tasks')
    op.drop_index('ix_evaluation_tasks_image_code', table_name='evaluation_tasks')
    op.drop_column('evaluation_tasks', 'toolset_code')
    op.drop_column('evaluation_tasks', 'image_code')
