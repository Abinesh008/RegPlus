from datetime import datetime
from typing import Optional, List
from sqlalchemy import ForeignKey, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base

class Circular(Base):
    """Database model representing a regulatory circular."""
    __tablename__ = "circulars"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    version_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    pdf_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


    # Relationships
    obligations: Mapped[List["Obligation"]] = relationship(
        "Obligation", back_populates="circular", cascade="all, delete-orphan"
    )

class Obligation(Base):
    """Database model representing a single compliance obligation extracted from a circular."""
    __tablename__ = "obligations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    circular_id: Mapped[int] = mapped_column(ForeignKey("circulars.id", ondelete="CASCADE"), nullable=False)
    obligation_id_slug: Mapped[str] = mapped_column(String(100), nullable=False)
    obligation_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_clause: Mapped[str] = mapped_column(String(100), nullable=False)
    obligation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    applies_to: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    circular: Mapped["Circular"] = relationship("Circular", back_populates="obligations")
    rule_mappings: Mapped[List["RuleMapping"]] = relationship(
        "RuleMapping", back_populates="obligation", cascade="all, delete-orphan"
    )

class DiffResult(Base):
    """Database model representing the comparison results between two circulars."""
    __tablename__ = "diff_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    old_circular_id: Mapped[Optional[int]] = mapped_column(ForeignKey("circulars.id", ondelete="SET NULL"), nullable=True)
    new_circular_id: Mapped[int] = mapped_column(ForeignKey("circulars.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)  # "new", "changed", "unchanged"
    old_obligation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("obligations.id", ondelete="SET NULL"), nullable=True)
    new_obligation_id: Mapped[int] = mapped_column(ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    old_circular: Mapped[Optional["Circular"]] = relationship("Circular", foreign_keys=[old_circular_id])
    new_circular: Mapped["Circular"] = relationship("Circular", foreign_keys=[new_circular_id])
    old_obligation: Mapped[Optional["Obligation"]] = relationship("Obligation", foreign_keys=[old_obligation_id])
    new_obligation: Mapped["Obligation"] = relationship("Obligation", foreign_keys=[new_obligation_id])

class RuleMapping(Base):
    """Database model mapping a compliance obligation to rule parameters."""
    __tablename__ = "rule_mappings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    obligation_id: Mapped[int] = mapped_column(ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False)
    matched_param_ids: Mapped[str] = mapped_column(Text, nullable=False)  # JSON-serialized list of parameter IDs
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False)  # "high", "medium", "low"

    # Relationships
    obligation: Mapped["Obligation"] = relationship("Obligation", back_populates="rule_mappings")
