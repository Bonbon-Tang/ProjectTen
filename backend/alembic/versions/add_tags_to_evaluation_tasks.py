"""add_tags_to_evaluation_tasks

Revision ID: add_tags_to_eval
Revises: initial
Create Date: 2026-03-31

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_tags_to_eval'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('evaluation_tasks', sa.Column('tags', sa.JSON(), nullable=True, comment='Unified tag list'))
    op.add_column('evaluation_tasks', sa.Column('primary_tag', sa.String(128), nullable=True, comment='Primary execution tag'))
    op.create_index('ix_evaluation_tasks_primary_tag', 'evaluation_tasks', ['primary_tag'])


def downgrade() -> None:
    op.drop_index('ix_evaluation_tasks_primary_tag', table_name='evaluation_tasks')
    op.drop_column('evaluation_tasks', 'primary_tag')
    op.drop_column('evaluation_tasks', 'tags')
