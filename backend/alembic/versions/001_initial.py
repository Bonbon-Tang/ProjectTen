"""initial schema

Revision ID: initial
Revises:
Create Date: 2026-01-01

"""
from alembic import op
import sqlalchemy as sa


revision = 'initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # tenants (no strong FK deps)
    op.create_table('tenants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('type', sa.String(length=64), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('active', 'frozen', 'cancelled', name='tenantstatus'), nullable=False),
        sa.Column('compute_quota', sa.Float(), nullable=True),
        sa.Column('storage_quota', sa.Float(), nullable=True),
        sa.Column('max_concurrent_tasks', sa.Integer(), nullable=True),
        sa.Column('device_allocation', sa.JSON(), nullable=True),
        sa.Column('device_allocation_expires_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # roles
    op.create_table('roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=True),
        sa.Column('tenant_id', sa.Integer(), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # users
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=128), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('password_hash', sa.String(length=256), nullable=False),
        sa.Column('user_type', sa.Enum('personal', 'enterprise', 'research', 'admin', name='usertype'), nullable=False),
        sa.Column('status', sa.Enum('active', 'frozen', 'pending', name='userstatus'), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('is_2fa_enabled', sa.Boolean(), nullable=True),
        sa.Column('tenant_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('phone'),
        sa.UniqueConstraint('username')
    )

    # user_roles (junction)
    op.create_table('user_roles',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )

    # digital_assets
    op.create_table('digital_assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('asset_type', sa.Enum('model', 'dataset', 'operator', 'script', 'template', 'toolset', 'image', name='assettype'), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('asset_code', sa.String(length=16), nullable=True),
        sa.Column('version', sa.String(length=32), nullable=True),
        sa.Column('file_path', sa.String(length=512), nullable=True),
        sa.Column('file_size', sa.Float(), nullable=True),
        sa.Column('status', sa.Enum('active', 'archived', 'deleted', name='assetstatus'), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=True),
        sa.Column('tenant_id', sa.Integer(), nullable=True),
        sa.Column('is_shared', sa.Boolean(), nullable=True),
        sa.Column('share_scope', sa.Enum('personal', 'team', 'platform', name='sharescope'), nullable=False),
        sa.Column('download_count', sa.Integer(), nullable=True),
        sa.Column('reuse_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_digital_assets_asset_code'), 'digital_assets', ['asset_code'], unique=False)

    # audit_logs
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('resource_type', sa.String(length=64), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # evaluation_tasks
    op.create_table('evaluation_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('task_category', sa.Enum('operator_test', 'model_deployment_test', name='taskcategory'), nullable=True),
        sa.Column('task_type', sa.Enum('chip', 'model', 'framework', 'middleware', 'operator', 'scene', 'operator_accuracy', 'operator_perf_accuracy', 'accuracy_verification', 'performance_benchmark', 'llm', 'multimodal', 'speech_recognition', 'image_classification', 'object_detection', 'semantic_segmentation', 'text_generation', 'machine_translation', 'sentiment_analysis', 'question_answering', 'text_summarization', 'speech_synthesis', 'image_generation', 'video_understanding', 'ocr', 'recommendation', 'anomaly_detection', 'time_series', 'reinforcement_learning', 'graph_neural_network', 'medical_imaging', 'autonomous_driving', 'robot_control', 'code_generation', 'knowledge_graph', name='tasktype'), nullable=False),
        sa.Column('create_mode', sa.Enum('template', 'custom', name='createmode'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'queued', 'running', 'completed', 'failed', 'terminated', name='taskstatus'), nullable=False),
        sa.Column('priority', sa.Enum('high', 'medium', 'low', name='priority'), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=True),
        sa.Column('device_type', sa.String(length=64), nullable=True),
        sa.Column('device_count', sa.Integer(), nullable=True),
        sa.Column('visibility', sa.String(length=32), nullable=False),
        sa.Column('operator_count', sa.Integer(), nullable=True),
        sa.Column('operator_categories', sa.JSON(), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('resource_spec', sa.JSON(), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=True),
        sa.Column('is_custom_billing', sa.Boolean(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=True),
        sa.Column('max_retries', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # evaluation_reports
    op.create_table('evaluation_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=256), nullable=False),
        sa.Column('report_type', sa.Enum('basic', 'advanced', 'custom', name='reporttype'), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('draft', 'published', 'archived', name='reportstatus'), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=True),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['task_id'], ['evaluation_tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # user_report_archives
    op.create_table('user_report_archives',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['report_id'], ['evaluation_reports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # compute_devices
    op.create_table('compute_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('device_type', sa.String(length=64), nullable=False),
        sa.Column('manufacturer', sa.String(length=128), nullable=False),
        sa.Column('total_count', sa.Integer(), nullable=False),
        sa.Column('available_count', sa.Integer(), nullable=False),
        sa.Column('specs', sa.JSON(), nullable=True),
        sa.Column('status', sa.Enum('online', 'busy', 'offline', 'maintenance', name='devicestatus'), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # operators
    op.create_table('operators',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('h100_fp32_latency', sa.Float(), nullable=True),
        sa.Column('h100_fp16_latency', sa.Float(), nullable=True),
        sa.Column('h100_int8_latency', sa.Float(), nullable=True),
        sa.Column('h100_throughput', sa.Float(), nullable=True),
        sa.Column('h100_memory_mb', sa.Float(), nullable=True),
        sa.Column('input_shape', sa.String(length=200), nullable=True),
        sa.Column('tested_device_type', sa.String(length=64), nullable=True),
        sa.Column('tested_fp32_latency', sa.Float(), nullable=True),
        sa.Column('tested_fp16_latency', sa.Float(), nullable=True),
        sa.Column('tested_int8_latency', sa.Float(), nullable=True),
        sa.Column('tested_throughput', sa.Float(), nullable=True),
        sa.Column('tested_accuracy_fp32', sa.Float(), nullable=True),
        sa.Column('tested_accuracy_fp16', sa.Float(), nullable=True),
        sa.Column('tested_accuracy_int8', sa.Float(), nullable=True),
        sa.Column('tested_operator_lib', sa.String(length=200), nullable=True),
        sa.Column('tested_task_id', sa.Integer(), nullable=True),
        sa.Column('tested_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # operator_benchmarks
    op.create_table('operator_benchmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('operator_id', sa.Integer(), nullable=False),
        sa.Column('device_type', sa.String(length=64), nullable=False),
        sa.Column('input_shape', sa.String(length=200), nullable=False),
        sa.Column('fp32_accuracy', sa.Float(), nullable=True),
        sa.Column('fp16_accuracy', sa.Float(), nullable=True),
        sa.Column('int8_accuracy', sa.Float(), nullable=True),
        sa.Column('fp16_loss_rate', sa.Float(), nullable=True),
        sa.Column('int8_loss_rate', sa.Float(), nullable=True),
        sa.Column('accuracy_pass', sa.Integer(), nullable=True),
        sa.Column('fp32_latency', sa.Float(), nullable=True),
        sa.Column('fp16_latency', sa.Float(), nullable=True),
        sa.Column('int8_latency', sa.Float(), nullable=True),
        sa.Column('throughput', sa.Float(), nullable=True),
        sa.Column('operator_lib', sa.String(length=200), nullable=True),
        sa.Column('task_id', sa.Integer(), nullable=True),
        sa.Column('tested_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['operator_id'], ['operators.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('operator_id', 'device_type', 'input_shape', name='uq_op_device_shape')
    )

    # model_benchmarks
    op.create_table('model_benchmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('image_id', sa.Integer(), nullable=False),
        sa.Column('task_type', sa.String(length=64), nullable=False),
        sa.Column('device_type', sa.String(length=64), nullable=False),
        sa.Column('eval_method', sa.String(length=64), nullable=True),
        sa.Column('throughput', sa.Float(), nullable=True),
        sa.Column('throughput_unit', sa.String(length=32), nullable=True),
        sa.Column('avg_latency_ms', sa.Float(), nullable=True),
        sa.Column('p50_latency_ms', sa.Float(), nullable=True),
        sa.Column('p99_latency_ms', sa.Float(), nullable=True),
        sa.Column('first_token_latency_ms', sa.Float(), nullable=True),
        sa.Column('accuracy', sa.Float(), nullable=True),
        sa.Column('accuracy_metric', sa.String(length=32), nullable=True),
        sa.Column('energy_efficiency', sa.Float(), nullable=True),
        sa.Column('energy_efficiency_unit', sa.String(length=32), nullable=True),
        sa.Column('power_consumption_w', sa.Float(), nullable=True),
        sa.Column('performance_score', sa.Float(), nullable=True),
        sa.Column('software_completeness_score', sa.Float(), nullable=True),
        sa.Column('memory_usage_gb', sa.Float(), nullable=True),
        sa.Column('image_name', sa.String(length=256), nullable=True),
        sa.Column('chip_name', sa.String(length=64), nullable=True),
        sa.Column('framework_name', sa.String(length=64), nullable=True),
        sa.Column('model_name', sa.String(length=128), nullable=True),
        sa.Column('task_id', sa.Integer(), nullable=True),
        sa.Column('tested_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['image_id'], ['digital_assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # adaptation_tasks
    op.create_table('adaptation_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('image_id', sa.Integer(), nullable=True),
        sa.Column('creator_id', sa.Integer(), nullable=True),
        sa.Column('tenant_id', sa.Integer(), nullable=True),
        sa.Column('device_type', sa.String(length=64), nullable=False),
        sa.Column('device_count', sa.Integer(), nullable=False),
        sa.Column('test_mode', sa.String(length=32), nullable=True),
        sa.Column('precision', sa.String(length=32), nullable=True),
        sa.Column('save_image', sa.Boolean(), nullable=True),
        sa.Column('saved_image_name', sa.String(length=255), nullable=True),
        sa.Column('save_notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['image_id'], ['digital_assets.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # tenant_applications
    op.create_table('tenant_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tenant_name', sa.String(length=128), nullable=False),
        sa.Column('contact_person', sa.String(length=128), nullable=False),
        sa.Column('contact_email', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=True),
        sa.Column('approved_device_type', sa.String(length=64), nullable=True),
        sa.Column('approved_device_count', sa.Integer(), nullable=True),
        sa.Column('approved_duration_hours', sa.Integer(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('tenant_applications')
    op.drop_table('adaptation_tasks')
    op.drop_table('model_benchmarks')
    op.drop_table('operator_benchmarks')
    op.drop_table('operators')
    op.drop_table('compute_devices')
    op.drop_table('user_report_archives')
    op.drop_table('evaluation_reports')
    op.drop_table('evaluation_tasks')
    op.drop_table('audit_logs')
    op.drop_index(op.f('ix_digital_assets_asset_code'), table_name='digital_assets')
    op.drop_table('digital_assets')
    op.drop_table('user_roles')
    op.drop_table('roles')
    op.drop_table('tenants')
    # users must be last (other tables FK to it)
    op.drop_table('users')
