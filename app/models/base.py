



from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import mapped_column,Mapped
from datetime import datetime

class TimestampMixin:
    created_at:Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True,server_default=func.current_timestamp())
    updated_at:Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())