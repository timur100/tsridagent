from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from routes.portal_auth import verify_token
import os
from db.connection import get_mongo_client

router = APIRouter(prefix="/api/scan-stats", tags=["scan-stats"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
db = get_mongo_client()[DB_NAME]

@router.get("")
async def get_scan_stats(
    days: int = 30,
    token_data: dict = Depends(verify_token)
):
    """
    Get scan statistics
    - For admins: all scans
    - For customers: only their company scans
    """
    try:
        user_role = token_data.get("role")
        user_company = token_data.get("company")
        
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Base query for date range
        date_query = {
            "created_at": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }
        
        # Apply company filter for customers
        company_filter = {}
        if user_role == "customer" and user_company:
            company_filter = {"customer": user_company}
        
        # Count flagged scans by type
        flagged_query = {**date_query, **company_filter}
        
        unknown_scans = db.flagged_scans.count_documents({
            **flagged_query,
            "scan_type": "unknown"
        })
        
        failed_scans = db.flagged_scans.count_documents({
            **flagged_query,
            "scan_type": {"$in": ["failed", "error"]}
        })
        
        # Total flagged scans
        total_flagged = db.flagged_scans.count_documents(flagged_query)
        
        # Scanner logs for successful scans
        # We count "scan_complete" events as successful scans
        log_query = {
            "timestamp": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }
        
        if user_role == "customer" and user_company:
            # For customers, filter by station_id that belongs to their company
            # This requires checking stations collection
            stations = list(db.europcar_stations.find({"customer": user_company}))
            station_ids = [s.get("main_code") for s in stations]
            log_query["station_id"] = {"$in": station_ids}
        
        successful_scans = db.scanner_logs.count_documents({
            **log_query,
            "event": "scan_complete",
            "status": "success"
        })
        
        # Calculate correct scans (successful - flagged)
        correct_scans = max(0, successful_scans - total_flagged)
        
        # Total scans
        total_scans = successful_scans + total_flagged
        
        return {
            "success": True,
            "data": {
                "total_scans": total_scans,
                "correct_scans": correct_scans,
                "unknown_scans": unknown_scans,
                "failed_scans": failed_scans,
                "period_days": days,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
    
    except Exception as e:
        print(f"Error getting scan stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily")
async def get_daily_scan_stats(
    days: int = 7,
    token_data: dict = Depends(verify_token)
):
    """
    Get daily scan statistics for charts
    """
    try:
        user_role = token_data.get("role")
        user_company = token_data.get("company")
        
        # For now, return simple aggregated data
        # In future, can be enhanced with daily breakdown
        
        stats_result = await get_scan_stats(days=days, token_data=token_data)
        
        return {
            "success": True,
            "data": {
                "daily_stats": [],  # Can be populated with daily breakdown
                "summary": stats_result.get("data", {})
            }
        }
    
    except Exception as e:
        print(f"Error getting daily scan stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
