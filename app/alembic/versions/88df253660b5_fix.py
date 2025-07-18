"""fix

Revision ID: 88df253660b5
Revises: 2ad587735571
Create Date: 2025-07-05 23:12:01.627937

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88df253660b5'
down_revision: Union[str, Sequence[str], None] = '2ad587735571'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('tasks', sa.Column('file_id', sa.String(length=255), nullable=False))
    op.create_index(op.f('ix_tasks_file_id'), 'tasks', ['file_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_tasks_file_id'), table_name='tasks')
    op.drop_column('tasks', 'file_id')
    # ### end Alembic commands ###
