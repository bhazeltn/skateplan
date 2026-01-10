import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.benchmark_models import BenchmarkProfile, BenchmarkMetric

router = APIRouter()

@router.post("/", response_model=BenchmarkProfile)
def create_benchmark_profile(
    *,
    session: Session = Depends(get_session),
    profile_in: BenchmarkProfile,
    current_user: Profile = Depends(get_current_user),
) -> BenchmarkProfile:
    session.add(profile_in)
    session.commit()
    session.refresh(profile_in)
    return profile_in

@router.get("/skater/{skater_id}", response_model=List[BenchmarkProfile])
def read_benchmarks_by_skater(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> List[BenchmarkProfile]:
    statement = select(BenchmarkProfile).where(BenchmarkProfile.skater_id == skater_id)
    profiles = session.exec(statement).all()
    return profiles

@router.post("/{profile_id}/metrics", response_model=BenchmarkMetric)
def add_metric(
    *,
    session: Session = Depends(get_session),
    profile_id: uuid.UUID,
    metric_in: BenchmarkMetric,
    current_user: Profile = Depends(get_current_user),
) -> BenchmarkMetric:
    metric_in.profile_id = profile_id
    session.add(metric_in)
    session.commit()
    session.refresh(metric_in)
    return metric_in
