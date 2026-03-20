from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func as sa_func, distinct
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.operator import Operator
from app.models.user import User
from app.schemas.operator import OperatorOut, BenchmarkSummary, OperatorCategoryOut

router = APIRouter()


def _ok(data=None, message: str = "success"):
    return {"code": 0, "message": message, "data": data}


@router.get("/operators/categories")
def get_operator_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of operator categories with counts."""
    results = (
        db.query(Operator.category, sa_func.count(Operator.id))
        .group_by(Operator.category)
        .order_by(sa_func.count(Operator.id).desc())
        .all()
    )
    categories = [{"category": cat, "count": cnt} for cat, cnt in results]
    return _ok(categories)


@router.get("/operators")
def list_operators(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    category: Optional[str] = None,
    search: Optional[str] = None,
    tested_only: bool = Query(False, description="Only show operators with test results"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all operators with pagination and optional category filter."""
    q = db.query(Operator)
    if category:
        q = q.filter(Operator.category == category)
    if search:
        q = q.filter(Operator.name.ilike(f"%{search}%"))
    if tested_only:
        q = q.filter(Operator.tested_at.isnot(None))
    total = q.count()
    items = q.order_by(Operator.category, Operator.name).offset((page - 1) * page_size).limit(page_size).all()
    items_out = [OperatorOut.model_validate(op).model_dump() for op in items]
    return _ok({
        "items": items_out,
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.get("/summary")
def get_benchmark_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Benchmark overview: total operators, categories, average performance."""
    total_operators = db.query(Operator).count()
    total_categories = db.query(sa_func.count(distinct(Operator.category))).scalar() or 0

    avg_fp32 = db.query(sa_func.avg(Operator.h100_fp32_latency)).scalar()
    avg_fp16 = db.query(sa_func.avg(Operator.h100_fp16_latency)).scalar()
    avg_int8 = db.query(sa_func.avg(Operator.h100_int8_latency)).scalar()
    avg_throughput = db.query(sa_func.avg(Operator.h100_throughput)).scalar()
    avg_memory = db.query(sa_func.avg(Operator.h100_memory_mb)).scalar()

    cat_results = (
        db.query(Operator.category, sa_func.count(Operator.id))
        .group_by(Operator.category)
        .order_by(sa_func.count(Operator.id).desc())
        .all()
    )
    categories = [{"category": cat, "count": cnt} for cat, cnt in cat_results]

    return _ok({
        "total_operators": total_operators,
        "total_categories": total_categories,
        "avg_fp32_latency": round(avg_fp32, 2) if avg_fp32 else None,
        "avg_fp16_latency": round(avg_fp16, 2) if avg_fp16 else None,
        "avg_int8_latency": round(avg_int8, 2) if avg_int8 else None,
        "avg_throughput": round(avg_throughput, 1) if avg_throughput else None,
        "avg_memory_mb": round(avg_memory, 1) if avg_memory else None,
        "categories": categories,
    })


@router.get("/operators/{operator_id}")
def get_operator(
    operator_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single operator detail with H100 baseline."""
    op = db.query(Operator).filter(Operator.id == operator_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")
    return _ok(OperatorOut.model_validate(op).model_dump())
