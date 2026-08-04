from datetime import datetime
from typing import Optional, List
from sqlalchemy import ForeignKey, String, Text, DateTime, Float, UniqueConstraint, Table, Column, Integer
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
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    circular: Mapped["Circular"] = relationship("Circular", back_populates="obligations")
    rule_mappings: Mapped[List["RuleMapping"]] = relationship(
        "RuleMapping", back_populates="obligation", cascade="all, delete-orphan"
    )

class DiffSession(Base):
    """Database model representing a comparison session between two circulars."""
    __tablename__ = "diff_sessions"
    __table_args__ = (
        UniqueConstraint("old_circular_id", "new_circular_id", name="uq_diff_session_circulars"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    old_circular_id: Mapped[Optional[int]] = mapped_column(ForeignKey("circulars.id", ondelete="SET NULL"), nullable=True)
    new_circular_id: Mapped[int] = mapped_column(ForeignKey("circulars.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    old_circular: Mapped[Optional["Circular"]] = relationship("Circular", foreign_keys=[old_circular_id])
    new_circular: Mapped["Circular"] = relationship("Circular", foreign_keys=[new_circular_id])
    diff_results: Mapped[List["DiffResult"]] = relationship(
        "DiffResult", back_populates="diff_session", cascade="all, delete-orphan"
    )

class DiffResult(Base):
    """Database model representing the comparison results between two circulars."""
    __tablename__ = "diff_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    diff_session_id: Mapped[int] = mapped_column(ForeignKey("diff_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    old_circular_id: Mapped[Optional[int]] = mapped_column(ForeignKey("circulars.id", ondelete="SET NULL"), nullable=True)
    new_circular_id: Mapped[int] = mapped_column(ForeignKey("circulars.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # "new", "changed", "unchanged"
    old_obligation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("obligations.id", ondelete="SET NULL"), nullable=True)
    new_obligation_id: Mapped[int] = mapped_column(ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False)
    
    # Heuristic and semantic fields
    semantic_verified: Mapped[bool] = mapped_column(nullable=False, default=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    match_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    diff_session: Mapped["DiffSession"] = relationship("DiffSession", back_populates="diff_results")
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
    implementation_priority: Mapped[str] = mapped_column(String(20), nullable=False)  # "critical", "high", "medium", "low"
    mapping_model: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "gemini-2.5-flash", "mock"
    mapping_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    affected_business_layer: Mapped[str] = mapped_column(Text, nullable=False)  # JSON-serialized list of layers
    mapping_source: Mapped[str] = mapped_column(String(20), nullable=False)  # "gemini", "database_cache", "mock"
    review_required: Mapped[bool] = mapped_column(nullable=False, default=False)
    match_score: Mapped[float] = mapped_column(nullable=False, default=0.0)
    mapping_version: Mapped[str] = mapped_column(String(10), default="v1.0", nullable=False)

    # Relationships
    obligation: Mapped["Obligation"] = relationship("Obligation", back_populates="rule_mappings")


role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    permissions: Mapped[List["Permission"]] = relationship(
        "Permission", secondary=role_permissions, back_populates="roles"
    )
    users: Mapped[List["User"]] = relationship("User", back_populates="role_rel")

class Permission(Base):
    __tablename__ = "permissions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    roles: Mapped[List["Role"]] = relationship(
        "Role", secondary=role_permissions, back_populates="permissions"
    )

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    role_rel: Mapped["Role"] = relationship("Role", back_populates="users")
    sessions: Mapped[List["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="sessions")
