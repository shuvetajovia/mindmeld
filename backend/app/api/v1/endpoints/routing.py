from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.routing import RouteRequest, SafeRouteResponse
from backend.app.services.routing_engine import routing_engine

router = APIRouter()

@router.post("/route", response_model=SafeRouteResponse)
def compute_route(req: RouteRequest, db: Session = Depends(get_db)):
    """
    Computes the safest road corridor path from origin to destination, applying
    hazard cost multipliers and routing around blocked/landslide-impacted sections.
    """
    try:
        route_res = routing_engine.find_safe_route(
            db=db,
            origin=req.origin,
            destination=req.destination,
            alpha=req.alpha
        )
        return route_res
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Routing graph calculation failed: {str(e)}"
        )
