import asyncio
import os
import pandas as pd
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# Excel file URL
EXCEL_FILE_URL = "https://customer-assets.emergentagent.com/job_stayhunt/artifacts/uirwhze2_Enriched_Homestay_List.xlsx"

def download_excel_file():
    """Download Excel file from URL and return file path"""
    print("Downloading Excel file...")
    response = requests.get(EXCEL_FILE_URL)
    if response.status_code == 200:
        file_path = "/tmp/homestay_data.xlsx"
        with open(file_path, 'wb') as f:
            f.write(response.content)
        print(f"Excel file downloaded to {file_path}")
        return file_path
    else:
        raise Exception(f"Failed to download Excel file: {response.status_code}")

def load_properties_from_excel():
    """Load properties from Excel file and convert to database format"""
    print("Loading properties from Excel file...")
    
    # Download the Excel file
    excel_path = download_excel_file()
    
    # Read Excel file
    df = pd.read_excel(excel_path)
    
    print(f"Loaded {len(df)} properties from Excel file")
    print(f"Columns: {list(df.columns)}")
    
    properties = []
    
    # Process each row
    for index, row in df.iterrows():
        # Convert column names to snake_case and handle NaN values
        property_data = {
            "homestay_name": str(row.get('Homestay Name', '')).strip() if pd.notna(row.get('Homestay Name')) else '',
            "location": str(row.get('Location', '')).strip() if pd.notna(row.get('Location')) else '',
            "sub_location": str(row.get('Sub Location', '')).strip() if pd.notna(row.get('Sub Location')) else '',
            "google_address": str(row.get('Google Address', '')).strip() if pd.notna(row.get('Google Address')) else '',
            "google_phone": str(row.get('Google Phone', '')).strip() if pd.notna(row.get('Google Phone')) else '',
            "google_rating": float(row.get('Google Rating', 0)) if pd.notna(row.get('Google Rating')) and str(row.get('Google Rating')).replace('.', '').isdigit() else 0.0,
            "number_of_reviews": int(row.get('Number of Reviews', 0)) if pd.notna(row.get('Number of Reviews')) and str(row.get('Number of Reviews')).isdigit() else 0,
            "google_maps_link": str(row.get('Google Maps Link', '')).strip() if pd.notna(row.get('Google Maps Link')) else '',
            "photo_url": str(row.get('Photo URL', '')).strip() if pd.notna(row.get('Photo URL')) else '',
            "category": str(row.get('Category', '')).strip() if pd.notna(row.get('Category')) else '',
            "amenities": str(row.get('Amenities', '')).strip() if pd.notna(row.get('Amenities')) else '',
            "tariff": str(row.get('Tariff', '')).strip() if pd.notna(row.get('Tariff')) else '',
            "source_url": str(row.get('Source URL', '')).strip() if pd.notna(row.get('Source URL')) else '',
            "youtube_video": str(row.get('YouTube Video', '')).strip() if pd.notna(row.get('YouTube Video')) else '',
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Only add properties with valid homestay names
        if property_data["homestay_name"] and property_data["homestay_name"].lower() not in ['', 'nan', 'none']:
            properties.append(property_data)
    
    print(f"Processed {len(properties)} valid properties")
    
    # Clean up downloaded file
    try:
        os.remove(excel_path)
        print("Cleaned up temporary file")
    except:
        pass
    
    return properties

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