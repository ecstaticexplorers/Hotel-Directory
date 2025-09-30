import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# Sample data based on the Excel structure
sample_properties = [
    {
        "homestay_name": "Mountain View Resort",
        "location": "Darjeeling",
        "sub_location": "Mall Road",
        "google_address": "Mall Road, Darjeeling, West Bengal 734101",
        "google_phone": "+91 9876543210",
        "google_rating": 4.5,
        "number_of_reviews": 245,
        "google_maps_link": "https://maps.google.com/?q=Darjeeling+Mall+Road",
        "photo_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        "category": "Resort",
        "amenities": "Free WiFi, Swimming Pool, Restaurant, Parking, Room Service, Mountain View",
        "tariff": "₹3,500 - ₹5,000 per night",
        "source_url": "https://example.com/mountain-view-resort",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "Tea Garden Homestay",
        "location": "Darjeeling",
        "sub_location": "Happy Valley",
        "google_address": "Happy Valley Tea Estate, Darjeeling, West Bengal 734102",
        "google_phone": "+91 9876543211",
        "google_rating": 4.2,
        "number_of_reviews": 89,
        "google_maps_link": "https://maps.google.com/?q=Happy+Valley+Tea+Estate+Darjeeling",
        "photo_url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
        "category": "Homestay",
        "amenities": "Free WiFi, Tea Garden Tour, Organic Meals, Parking, Garden View",
        "tariff": "₹2,000 - ₹3,000 per night",
        "source_url": "https://example.com/tea-garden-homestay",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "Riverside Cottage",
        "location": "Kalimpong",
        "sub_location": "Delo Hill",
        "google_address": "Delo Hill, Kalimpong, West Bengal 734301",
        "google_phone": "+91 9876543212",
        "google_rating": 4.7,
        "number_of_reviews": 156,
        "google_maps_link": "https://maps.google.com/?q=Delo+Hill+Kalimpong",
        "photo_url": "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
        "category": "Homestay",
        "amenities": "Free WiFi, River View, Bonfire, Trekking Guide, Home Cooked Meals",
        "tariff": "₹1,800 - ₹2,500 per night",
        "source_url": "https://example.com/riverside-cottage",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "Himalayan Heights Resort",
        "location": "Darjeeling",
        "sub_location": "Tiger Hill",
        "google_address": "Tiger Hill Road, Darjeeling, West Bengal 734104",
        "google_phone": "+91 9876543213",
        "google_rating": 4.8,
        "number_of_reviews": 312,
        "google_maps_link": "https://maps.google.com/?q=Tiger+Hill+Darjeeling",
        "photo_url": "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800",
        "category": "Resort",
        "amenities": "Free WiFi, Spa, Restaurant, Gym, Conference Hall, Sunrise View, Parking",
        "tariff": "₹4,500 - ₹7,000 per night",
        "source_url": "https://example.com/himalayan-heights",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "Valley View Homestay",
        "location": "Kalimpong",
        "sub_location": "Durpin Hill",
        "google_address": "Durpin Hill, Kalimpong, West Bengal 734302",
        "google_phone": "+91 9876543214",
        "google_rating": 4.3,
        "number_of_reviews": 78,
        "google_maps_link": "https://maps.google.com/?q=Durpin+Hill+Kalimpong",
        "photo_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
        "category": "Homestay",
        "amenities": "Free WiFi, Valley View, Local Cuisine, Parking, Nature Walks",
        "tariff": "₹1,500 - ₹2,200 per night",
        "source_url": "https://example.com/valley-view-homestay",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "Forest Edge Resort",
        "location": "Dooars",
        "sub_location": "Lataguri",
        "google_address": "Lataguri Forest, Dooars, West Bengal 735219",
        "google_phone": "+91 9876543215",
        "google_rating": 4.6,
        "number_of_reviews": 198,
        "google_maps_link": "https://maps.google.com/?q=Lataguri+Dooars",
        "photo_url": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
        "category": "Resort",
        "amenities": "Free WiFi, Wildlife Safari, Restaurant, Parking, Forest View, Bird Watching",
        "tariff": "₹3,200 - ₹4,800 per night",
        "source_url": "https://example.com/forest-edge-resort",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "River Bend Homestay",
        "location": "Dooars",
        "sub_location": "Jayanti",
        "google_address": "Jayanti River, Dooars, West Bengal 735220",
        "google_phone": "+91 9876543216",
        "google_rating": 4.4,
        "number_of_reviews": 134,
        "google_maps_link": "https://maps.google.com/?q=Jayanti+River+Dooars",
        "photo_url": "https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=800",
        "category": "Homestay",
        "amenities": "Free WiFi, River Side, Fishing, Local Food, Nature Walks, Parking",
        "tariff": "₹2,200 - ₹3,200 per night",
        "source_url": "https://example.com/river-bend-homestay",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "Cloud Nine Resort",
        "location": "Darjeeling",
        "sub_location": "Ghoom",
        "google_address": "Ghoom Monastery Road, Darjeeling, West Bengal 734103",
        "google_phone": "+91 9876543217",
        "google_rating": 4.1,
        "number_of_reviews": 67,
        "google_maps_link": "https://maps.google.com/?q=Ghoom+Darjeeling",
        "photo_url": "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
        "category": "Resort",
        "amenities": "Free WiFi, Mountain View, Restaurant, Parking, Monastery Visit, Room Service",
        "tariff": "₹2,800 - ₹4,200 per night",
        "source_url": "https://example.com/cloud-nine-resort",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "Pine Valley Homestay",
        "location": "Kalimpong",
        "sub_location": "Lava",
        "google_address": "Lava Village, Kalimpong, West Bengal 734314",
        "google_phone": "+91 9876543218",
        "google_rating": 4.9,
        "number_of_reviews": 423,
        "google_maps_link": "https://maps.google.com/?q=Lava+Village+Kalimpong",
        "photo_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
        "category": "Homestay",
        "amenities": "Free WiFi, Forest View, Trekking, Bird Watching, Local Cuisine, Bonfire",
        "tariff": "₹2,500 - ₹3,500 per night",
        "source_url": "https://example.com/pine-valley-homestay",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "homestay_name": "Elephant Camp Resort",
        "location": "Dooars",
        "sub_location": "Gorumara",
        "google_address": "Gorumara National Park, Dooars, West Bengal 735221",
        "google_phone": "+91 9876543219",
        "google_rating": 4.0,
        "number_of_reviews": 189,
        "google_maps_link": "https://maps.google.com/?q=Gorumara+National+Park",
        "photo_url": "https://images.unsplash.com/photo-1549366021-9f761d040a94?w=800",
        "category": "Resort",
        "amenities": "Free WiFi, Wildlife Safari, Elephant Ride, Restaurant, Parking, Nature Guide",
        "tariff": "₹3,800 - ₹5,500 per night",
        "source_url": "https://example.com/elephant-camp-resort",
        "youtube_video": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]

async def seed_database():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.stayhunt
    
    try:
        # Clear existing data
        print("Clearing existing properties...")
        await db.properties.delete_many({})
        
        # Insert sample data
        print("Inserting sample properties...")
        result = await db.properties.insert_many(sample_properties)
        print(f"Successfully inserted {len(result.inserted_ids)} properties")
        
        # Create indexes for better performance
        print("Creating indexes...")
        await db.properties.create_index("homestay_name")
        await db.properties.create_index("location")
        await db.properties.create_index("sub_location")
        await db.properties.create_index([("google_rating", -1), ("number_of_reviews", -1)])
        await db.properties.create_index([
            ("homestay_name", "text"),
            ("location", "text"),
            ("sub_location", "text"),
            ("amenities", "text")
        ])
        
        print("Database seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())