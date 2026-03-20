from fastapi import APIRouter

from app.api.v1 import auth, users, tenants, roles, evaluations, reports, assets, resources, benchmark, model_benchmark

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
api_router.include_router(roles.router, prefix="/roles", tags=["Roles"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["Evaluations"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(assets.router, prefix="/assets", tags=["Assets"])
api_router.include_router(resources.router, prefix="/resources", tags=["Resources"])
api_router.include_router(benchmark.router, prefix="/benchmark", tags=["Benchmark"])
api_router.include_router(model_benchmark.router, prefix="/model-benchmark", tags=["Model Benchmark"])
