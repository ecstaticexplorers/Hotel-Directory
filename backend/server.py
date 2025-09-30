from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
from bson import ObjectId
import math

load_dotenv()

app = FastAPI(title="StayHunt API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.stayhunt

# Pydantic models
class Property(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    homestay_name: str
    location: str
    sub_location: str
    google_address: str
    google_phone: str
    google_rating: float
    number_of_reviews: int
    google_maps_link: str
    photo_url: str
    category: str
    amenities: str
    tariff: str
    source_url: Optional[str] = None
    youtube_video: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class PropertyResponse(BaseModel):
    properties: List[Property]
    total: int
    page: int
    per_page: int
    total_pages: int

class LocationStats(BaseModel):
    location: str
    count: int
    sub_locations: List[Dict[str, int]]

# Helper function to convert ObjectId to string
def property_helper(property_data) -> dict:
    property_data["_id"] = str(property_data["_id"])
    return property_data

@app.get("/")
async def root():
    return {"message": "StayHunt API is running!", "version": "1.0.0"}

@app.get("/api/properties", response_model=PropertyResponse)
async def get_properties(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=50, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query for property name or location"),
    location: Optional[str] = Query(None, description="Filter by location"),
    sub_location: Optional[str] = Query(None, description="Filter by sub location"),
    category: Optional[str] = Query(None, description="Filter by category (Resort/Homestay)"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum rating filter"),
    sort_by: str = Query("rating_desc", description="Sort by: rating_desc, rating_asc, reviews_desc, reviews_asc, name_asc")
):
    try:
        # Build query
        query = {}
        
        if search:
            query["$or"] = [
                {"homestay_name": {"$regex": search, "$options": "i"}},
                {"location": {"$regex": search, "$options": "i"}},
                {"sub_location": {"$regex": search, "$options": "i"}}
            ]
        
        if location:
            query["location"] = {"$regex": location, "$options": "i"}
            
        if sub_location:
            query["sub_location"] = {"$regex": sub_location, "$options": "i"}
            
        if category:
            query["category"] = {"$regex": category, "$options": "i"}
            
        if min_rating:
            query["google_rating"] = {"$gte": min_rating}

        # Build sort
        sort_options = {
            "rating_desc": [("google_rating", -1), ("number_of_reviews", -1)],
            "rating_asc": [("google_rating", 1), ("number_of_reviews", 1)],
            "reviews_desc": [("number_of_reviews", -1), ("google_rating", -1)],
            "reviews_asc": [("number_of_reviews", 1), ("google_rating", 1)],
            "name_asc": [("homestay_name", 1)]
        }
        
        sort_criteria = sort_options.get(sort_by, sort_options["rating_desc"])

        # Get total count
        total = await db.properties.count_documents(query)
        
        # Calculate pagination
        skip = (page - 1) * per_page
        total_pages = math.ceil(total / per_page)
        
        # Get properties
        cursor = db.properties.find(query).sort(sort_criteria).skip(skip).limit(per_page)
        properties = await cursor.to_list(length=per_page)
        
        # Convert ObjectId to string
        properties = [property_helper(prop) for prop in properties]
        
        return PropertyResponse(
            properties=properties,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/properties/{property_id}", response_model=Property)
async def get_property(property_id: str):
    try:
        if not ObjectId.is_valid(property_id):
            raise HTTPException(status_code=400, detail="Invalid property ID")
            
        property_data = await db.properties.find_one({"_id": ObjectId(property_id)})
        
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")
            
        return property_helper(property_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/locations", response_model=List[LocationStats])
async def get_locations():
    try:
        pipeline = [
            {
                "$group": {
                    "_id": "$location",
                    "count": {"$sum": 1},
                    "sub_locations": {
                        "$push": {
                            "sub_location": "$sub_location",
                            "count": 1
                        }
                    }
                }
            },
            {
                "$project": {
                    "location": "$_id",
                    "count": 1,
                    "sub_locations": {
                        "$reduce": {
                            "input": "$sub_locations",
                            "initialValue": [],
                            "in": {
                                "$let": {
                                    "vars": {
                                        "existing": {
                                            "$filter": {
                                                "input": "$$value",
                                                "cond": {"$eq": ["$$this.sub_location", "$$item.sub_location"]}
                                            }
                                        }
                                    },
                                    "in": {
                                        "$cond": {
                                            "if": {"$gt": [{"$size": "$$existing"}, 0]},
                                            "then": {
                                                "$map": {
                                                    "input": "$$value",
                                                    "in": {
                                                        "$cond": {
                                                            "if": {"$eq": ["$$this.sub_location", "$$item.sub_location"]},
                                                            "then": {
                                                                "sub_location": "$$this.sub_location",
                                                                "count": {"$add": ["$$this.count", "$$item.count"]}
                                                            },
                                                            "else": "$$this"
                                                        }
                                                    }
                                                }
                                            },
                                            "else": {
                                                "$concatArrays": [
                                                    "$$value",
                                                    [{"sub_location": "$$item.sub_location", "count": "$$item.count"}]
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        locations = await db.properties.aggregate(pipeline).to_list(length=None)
        
        result = []
        for loc in locations:
            # Convert sub_locations to dict format
            sub_locations = []
            for sub_loc in loc["sub_locations"]:
                sub_locations.append({sub_loc["sub_location"]: sub_loc["count"]})
                
            result.append(LocationStats(
                location=loc["location"],
                count=loc["count"],
                sub_locations=sub_locations
            ))
            
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/search-suggestions")
async def get_search_suggestions(query: str = Query(..., min_length=3)):
    try:
        # Get property name suggestions
        name_suggestions = await db.properties.find(
            {"homestay_name": {"$regex": query, "$options": "i"}},
            {"homestay_name": 1, "_id": 0}
        ).limit(3).to_list(length=3)
        
        # Get location suggestions
        location_suggestions = await db.properties.find(
            {"$or": [
                {"location": {"$regex": query, "$options": "i"}},
                {"sub_location": {"$regex": query, "$options": "i"}}
            ]},
            {"location": 1, "sub_location": 1, "_id": 0}
        ).limit(3).to_list(length=3)
        
        suggestions = []
        
        # Add property names
        for item in name_suggestions:
            suggestions.append({
                "text": item["homestay_name"],
                "type": "property"
            })
        
        # Add locations
        for item in location_suggestions:
            if item["location"] not in [s["text"] for s in suggestions]:
                suggestions.append({
                    "text": item["location"],
                    "type": "location"
                })
            if item["sub_location"] not in [s["text"] for s in suggestions]:
                suggestions.append({
                    "text": item["sub_location"],
                    "type": "sub_location"
                })
        
        return suggestions[:5]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Admin endpoints for data management
@app.post("/api/admin/properties")
async def create_property(property_data: Property):
    try:
        property_dict = property_data.dict(exclude={"id"})
        property_dict["created_at"] = datetime.utcnow()
        property_dict["updated_at"] = datetime.utcnow()
        
        result = await db.properties.insert_one(property_dict)
        
        # Get the created property
        created_property = await db.properties.find_one({"_id": result.inserted_id})
        
        return property_helper(created_property)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.put("/api/admin/properties/{property_id}")
async def update_property(property_id: str, property_data: Property):
    try:
        if not ObjectId.is_valid(property_id):
            raise HTTPException(status_code=400, detail="Invalid property ID")
            
        property_dict = property_data.dict(exclude={"id"})
        property_dict["updated_at"] = datetime.utcnow()
        
        result = await db.properties.update_one(
            {"_id": ObjectId(property_id)},
            {"$set": property_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Property not found")
            
        # Get the updated property
        updated_property = await db.properties.find_one({"_id": ObjectId(property_id)})
        
        return property_helper(updated_property)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.delete("/api/admin/properties/{property_id}")
async def delete_property(property_id: str):
    try:
        if not ObjectId.is_valid(property_id):
            raise HTTPException(status_code=400, detail="Invalid property ID")
            
        result = await db.properties.delete_one({"_id": ObjectId(property_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Property not found")
            
        return {"message": "Property deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)