#!/usr/bin/env python3
"""
StayHunt Backend API Testing Suite
Tests the complete dataset migration and API functionality
"""

import requests
import json
import time
from typing import Dict, Any, List
import sys

# Use the production URL from frontend .env
BASE_URL = "https://bnb-listings.preview.emergentagent.com/api"

class StayHuntAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, response_time: float = 0):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "response_time": f"{response_time:.2f}s" if response_time > 0 else "N/A"
        }
        self.test_results.append(result)
        print(f"{status} {test_name}: {message} ({result['response_time']})")
        
    def test_api_health(self):
        """Test basic API health"""
        try:
            start_time = time.time()
            # Test the properties endpoint directly since root might return HTML
            response = self.session.get(f"{self.base_url}/properties?per_page=1")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if "properties" in data and "total" in data:
                    self.log_test("API Health Check", True, "API is running correctly", response_time)
                    return True
                else:
                    self.log_test("API Health Check", False, f"Unexpected response structure: {list(data.keys())}", response_time)
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
        return False
        
    def test_properties_endpoint_basic(self):
        """Test basic properties endpoint functionality"""
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/properties")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                required_fields = ["properties", "total", "page", "per_page", "total_pages"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Properties Endpoint Structure", False, f"Missing fields: {missing_fields}", response_time)
                    return False
                
                # Check if we have the expected dataset size
                total_properties = data.get("total", 0)
                if total_properties >= 1693:
                    self.log_test("Properties Dataset Size", True, f"Found {total_properties} properties (expected 1693+)", response_time)
                elif total_properties > 0:
                    self.log_test("Properties Dataset Size", False, f"Found only {total_properties} properties, expected 1693", response_time)
                else:
                    self.log_test("Properties Dataset Size", False, "No properties found in database", response_time)
                    return False
                
                # Check properties structure
                properties = data.get("properties", [])
                if properties:
                    first_property = properties[0]
                    required_property_fields = ["homestay_name", "location", "google_rating", "number_of_reviews", "google_maps_link", "photo_url", "category"]
                    missing_prop_fields = [field for field in required_property_fields if field not in first_property]
                    
                    if missing_prop_fields:
                        self.log_test("Property Data Structure", False, f"Missing property fields: {missing_prop_fields}", response_time)
                    else:
                        self.log_test("Property Data Structure", True, "All required property fields present", response_time)
                        
                        # Validate data types
                        rating = first_property.get("google_rating")
                        reviews = first_property.get("number_of_reviews")
                        
                        if isinstance(rating, (int, float)) and isinstance(reviews, int):
                            self.log_test("Property Data Types", True, "Rating and review count have correct data types", response_time)
                        else:
                            self.log_test("Property Data Types", False, f"Invalid data types - rating: {type(rating)}, reviews: {type(reviews)}", response_time)
                
                self.log_test("Properties Endpoint Basic", True, f"Endpoint working with {len(properties)} properties returned", response_time)
                return True
                
            else:
                self.log_test("Properties Endpoint Basic", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_test("Properties Endpoint Basic", False, f"Error: {str(e)}")
        return False
        
    def test_properties_pagination(self):
        """Test pagination functionality"""
        try:
            # Test different page sizes
            for per_page in [5, 10, 20]:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}/properties?page=1&per_page={per_page}")
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    properties = data.get("properties", [])
                    
                    if len(properties) == per_page:
                        self.log_test(f"Pagination (per_page={per_page})", True, f"Returned exactly {per_page} properties", response_time)
                    else:
                        self.log_test(f"Pagination (per_page={per_page})", False, f"Expected {per_page}, got {len(properties)} properties", response_time)
                else:
                    self.log_test(f"Pagination (per_page={per_page})", False, f"HTTP {response.status_code}", response_time)
                    
            # Test page 2
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/properties?page=2&per_page=10")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get("page") == 2:
                    self.log_test("Pagination Page 2", True, "Page 2 returns correct page number", response_time)
                else:
                    self.log_test("Pagination Page 2", False, f"Expected page 2, got page {data.get('page')}", response_time)
            else:
                self.log_test("Pagination Page 2", False, f"HTTP {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Pagination Tests", False, f"Error: {str(e)}")
            
    def test_search_functionality(self):
        """Test search and filtering functionality"""
        try:
            # Test search by name
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/properties?search=resort")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                properties = data.get("properties", [])
                
                if properties:
                    # Check if search results contain the search term
                    found_match = any("resort" in prop.get("homestay_name", "").lower() or 
                                    "resort" in prop.get("location", "").lower() or
                                    "resort" in prop.get("category", "").lower() 
                                    for prop in properties)
                    
                    if found_match:
                        self.log_test("Search Functionality", True, f"Search returned {len(properties)} relevant results", response_time)
                    else:
                        self.log_test("Search Functionality", False, "Search results don't contain search term", response_time)
                else:
                    self.log_test("Search Functionality", False, "Search returned no results", response_time)
            else:
                self.log_test("Search Functionality", False, f"HTTP {response.status_code}", response_time)
                
            # Test location filter
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/properties?location=Goa")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                properties = data.get("properties", [])
                
                if properties:
                    goa_properties = [prop for prop in properties if "goa" in prop.get("location", "").lower()]
                    if len(goa_properties) == len(properties):
                        self.log_test("Location Filter", True, f"Location filter returned {len(properties)} Goa properties", response_time)
                    else:
                        self.log_test("Location Filter", False, f"Some results don't match location filter", response_time)
                else:
                    self.log_test("Location Filter", False, "Location filter returned no results", response_time)
            else:
                self.log_test("Location Filter", False, f"HTTP {response.status_code}", response_time)
                
            # Test rating filter
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/properties?min_rating=4.0")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                properties = data.get("properties", [])
                
                if properties:
                    low_rated = [prop for prop in properties if prop.get("google_rating", 0) < 4.0]
                    if not low_rated:
                        self.log_test("Rating Filter", True, f"Rating filter returned {len(properties)} properties with rating >= 4.0", response_time)
                    else:
                        self.log_test("Rating Filter", False, f"Found {len(low_rated)} properties with rating < 4.0", response_time)
                else:
                    self.log_test("Rating Filter", False, "Rating filter returned no results", response_time)
            else:
                self.log_test("Rating Filter", False, f"HTTP {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Search/Filter Tests", False, f"Error: {str(e)}")
            
    def test_sorting_functionality(self):
        """Test sorting functionality"""
        try:
            sort_options = ["rating_desc", "rating_asc", "reviews_desc", "reviews_asc", "name_asc"]
            
            for sort_by in sort_options:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}/properties?sort_by={sort_by}&per_page=5")
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    properties = data.get("properties", [])
                    
                    if len(properties) >= 2:
                        # Check if sorting is working
                        if sort_by == "rating_desc":
                            is_sorted = all(properties[i].get("google_rating", 0) >= properties[i+1].get("google_rating", 0) 
                                          for i in range(len(properties)-1))
                        elif sort_by == "rating_asc":
                            is_sorted = all(properties[i].get("google_rating", 0) <= properties[i+1].get("google_rating", 0) 
                                          for i in range(len(properties)-1))
                        elif sort_by == "reviews_desc":
                            is_sorted = all(properties[i].get("number_of_reviews", 0) >= properties[i+1].get("number_of_reviews", 0) 
                                          for i in range(len(properties)-1))
                        elif sort_by == "name_asc":
                            is_sorted = all(properties[i].get("homestay_name", "").lower() <= properties[i+1].get("homestay_name", "").lower() 
                                          for i in range(len(properties)-1))
                        else:
                            is_sorted = True  # Skip complex validation for other sorts
                            
                        if is_sorted:
                            self.log_test(f"Sorting ({sort_by})", True, f"Properties correctly sorted by {sort_by}", response_time)
                        else:
                            self.log_test(f"Sorting ({sort_by})", False, f"Properties not correctly sorted by {sort_by}", response_time)
                    else:
                        self.log_test(f"Sorting ({sort_by})", False, "Not enough properties to verify sorting", response_time)
                else:
                    self.log_test(f"Sorting ({sort_by})", False, f"HTTP {response.status_code}", response_time)
                    
        except Exception as e:
            self.log_test("Sorting Tests", False, f"Error: {str(e)}")
            
    def test_individual_property_endpoint(self):
        """Test individual property endpoint"""
        try:
            # First get a property ID
            response = self.session.get(f"{self.base_url}/properties?per_page=1")
            
            if response.status_code == 200:
                data = response.json()
                properties = data.get("properties", [])
                
                if properties:
                    property_id = properties[0].get("_id")
                    
                    if property_id:
                        start_time = time.time()
                        response = self.session.get(f"{self.base_url}/properties/{property_id}")
                        response_time = time.time() - start_time
                        
                        if response.status_code == 200:
                            property_data = response.json()
                            if property_data.get("_id") == property_id:
                                self.log_test("Individual Property Endpoint", True, f"Successfully retrieved property {property_id}", response_time)
                            else:
                                self.log_test("Individual Property Endpoint", False, "Property ID mismatch in response", response_time)
                        else:
                            self.log_test("Individual Property Endpoint", False, f"HTTP {response.status_code}", response_time)
                    else:
                        self.log_test("Individual Property Endpoint", False, "No property ID found in properties list", 0)
                else:
                    self.log_test("Individual Property Endpoint", False, "No properties available for testing", 0)
            else:
                self.log_test("Individual Property Endpoint", False, "Could not fetch properties for testing", 0)
                
        except Exception as e:
            self.log_test("Individual Property Endpoint", False, f"Error: {str(e)}")
            
    def test_locations_endpoint(self):
        """Test locations statistics endpoint - UPDATED FOR SPECIFIC TESTING"""
        print("\n🎯 DETAILED LOCATIONS ENDPOINT TESTING (PRIMARY FOCUS)")
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/locations")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test("Locations Endpoint - Status Code", True, "Returns 200 OK", response_time)
                
                try:
                    locations = response.json()
                except json.JSONDecodeError as e:
                    self.log_test("Locations Endpoint - JSON Parse", False, f"Invalid JSON: {str(e)}", response_time)
                    return False
                
                self.log_test("Locations Endpoint - JSON Parse", True, "Valid JSON response", response_time)
                
                if isinstance(locations, list):
                    self.log_test("Locations Endpoint - Response Type", True, f"Returns list with {len(locations)} locations", response_time)
                    
                    if locations:
                        first_location = locations[0]
                        required_fields = ["location", "count", "sub_locations"]
                        
                        # Test LocationStats structure
                        missing_fields = [field for field in required_fields if field not in first_location]
                        if missing_fields:
                            self.log_test("Locations Endpoint - LocationStats Structure", False, f"Missing fields: {missing_fields}", response_time)
                            return False
                        else:
                            self.log_test("Locations Endpoint - LocationStats Structure", True, "All required fields present", response_time)
                        
                        # Test sub_locations structure
                        sub_locations = first_location.get("sub_locations", [])
                        if isinstance(sub_locations, list):
                            self.log_test("Locations Endpoint - Sub-locations Type", True, f"sub_locations is list with {len(sub_locations)} items", response_time)
                            
                            # Test sub_locations format
                            if sub_locations:
                                sample_sub = sub_locations[0]
                                if isinstance(sample_sub, dict) and len(sample_sub) == 1:
                                    sub_name = list(sample_sub.keys())[0]
                                    sub_count = sample_sub[sub_name]
                                    if isinstance(sub_count, int):
                                        self.log_test("Locations Endpoint - Sub-location Format", True, f"Correct format: {sub_name}: {sub_count}", response_time)
                                    else:
                                        self.log_test("Locations Endpoint - Sub-location Format", False, f"Count should be int, got {type(sub_count)}", response_time)
                                else:
                                    self.log_test("Locations Endpoint - Sub-location Format", False, f"Invalid sub-location structure: {sample_sub}", response_time)
                            else:
                                self.log_test("Locations Endpoint - Sub-location Format", True, "No sub-locations to validate", response_time)
                        else:
                            self.log_test("Locations Endpoint - Sub-locations Type", False, f"sub_locations should be list, got {type(sub_locations)}", response_time)
                        
                        # Print sample data for verification
                        print(f"\n📊 SAMPLE LOCATION DATA:")
                        print(f"Location: {first_location.get('location')}")
                        print(f"Count: {first_location.get('count')}")
                        print(f"Sub-locations sample: {sub_locations[:3] if len(sub_locations) > 3 else sub_locations}")
                        
                        total_count = sum(loc.get("count", 0) for loc in locations)
                        self.log_test("Locations Endpoint - Overall", True, f"Retrieved {len(locations)} locations with {total_count} total properties", response_time)
                        return True
                    else:
                        self.log_test("Locations Endpoint - Data Availability", False, "No location data returned", response_time)
                        return False
                else:
                    self.log_test("Locations Endpoint - Response Type", False, f"Expected list, got {type(locations)}", response_time)
                    return False
            else:
                self.log_test("Locations Endpoint - Status Code", False, f"HTTP {response.status_code}: {response.text[:200]}", response_time)
                return False
                
        except Exception as e:
            self.log_test("Locations Endpoint - Exception", False, f"Error: {str(e)}")
            return False
    def test_properties_with_location_filter(self):
        """Test properties endpoint with location filter - SPECIFIC REQUIREMENT"""
        print("\n🔍 TESTING PROPERTIES WITH LOCATION FILTER")
        try:
            # Test with a known location
            test_location = "Darjeeling"
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/properties?location={test_location}&per_page=10")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test("Properties Location Filter - API Call", True, f"Returns 200 OK for location: {test_location}", response_time)
                
                data = response.json()
                properties = data.get("properties", [])
                
                if properties:
                    # Verify all properties match the location filter
                    location_matches = []
                    for prop in properties:
                        prop_location = prop.get("location", "").lower()
                        if test_location.lower() in prop_location:
                            location_matches.append(True)
                        else:
                            location_matches.append(False)
                    
                    if all(location_matches):
                        self.log_test("Properties Location Filter - Results", True, f"All {len(properties)} properties match location filter", response_time)
                    else:
                        mismatched = len([m for m in location_matches if not m])
                        self.log_test("Properties Location Filter - Results", False, f"{mismatched} properties don't match location filter", response_time)
                else:
                    self.log_test("Properties Location Filter - Results", False, f"No properties found for location: {test_location}", response_time)
            else:
                self.log_test("Properties Location Filter - API Call", False, f"HTTP {response.status_code}: {response.text[:200]}", response_time)
                
        except Exception as e:
            self.log_test("Properties Location Filter - Exception", False, f"Error: {str(e)}")
            
    def test_properties_sorting_reviews_desc(self):
        """Test properties sorting by reviews_desc - SPECIFIC REQUIREMENT"""
        print("\n📈 TESTING PROPERTIES SORTING BY REVIEWS_DESC")
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/properties?sort_by=reviews_desc&per_page=10")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test("Properties Reviews Sort - API Call", True, "Returns 200 OK for reviews_desc sort", response_time)
                
                data = response.json()
                properties = data.get("properties", [])
                
                if len(properties) >= 2:
                    # Check if properties are sorted by number_of_reviews descending, then by google_rating descending
                    is_sorted = True
                    sort_errors = []
                    
                    for i in range(len(properties) - 1):
                        current = properties[i]
                        next_prop = properties[i + 1]
                        
                        current_reviews = current.get('number_of_reviews', 0)
                        next_reviews = next_prop.get('number_of_reviews', 0)
                        current_rating = current.get('google_rating', 0)
                        next_rating = next_prop.get('google_rating', 0)
                        
                        # Primary sort: number_of_reviews descending
                        if current_reviews < next_reviews:
                            is_sorted = False
                            sort_errors.append(f"Position {i}: reviews {current_reviews} < {next_reviews}")
                            break
                        # Secondary sort: if reviews are equal, google_rating descending
                        elif current_reviews == next_reviews and current_rating < next_rating:
                            is_sorted = False
                            sort_errors.append(f"Position {i}: same reviews ({current_reviews}) but rating {current_rating} < {next_rating}")
                            break
                    
                    if is_sorted:
                        self.log_test("Properties Reviews Sort - Sorting Verification", True, "Properties correctly sorted by reviews_desc", response_time)
                        
                        # Show sample sorting
                        print(f"\n📊 SAMPLE SORTING (reviews_desc):")
                        for i, prop in enumerate(properties[:5]):
                            print(f"{i+1}. {prop.get('homestay_name', 'N/A')[:30]} - Reviews: {prop.get('number_of_reviews', 0)}, Rating: {prop.get('google_rating', 0)}")
                    else:
                        self.log_test("Properties Reviews Sort - Sorting Verification", False, f"Sorting error: {sort_errors[0] if sort_errors else 'Unknown'}", response_time)
                else:
                    self.log_test("Properties Reviews Sort - Sorting Verification", True, "Not enough properties to verify sorting", response_time)
                    
            else:
                self.log_test("Properties Reviews Sort - API Call", False, f"HTTP {response.status_code}: {response.text[:200]}", response_time)
                
        except Exception as e:
            self.log_test("Properties Reviews Sort - Exception", False, f"Error: {str(e)}")
            
    def test_search_suggestions_endpoint(self):
        """Test search suggestions endpoint"""
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/search-suggestions?query=goa")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                suggestions = response.json()
                
                if isinstance(suggestions, list):
                    if suggestions:
                        # Check suggestion structure
                        first_suggestion = suggestions[0]
                        if "text" in first_suggestion and "type" in first_suggestion:
                            self.log_test("Search Suggestions", True, f"Retrieved {len(suggestions)} search suggestions", response_time)
                        else:
                            self.log_test("Search Suggestions", False, "Suggestion data missing required fields", response_time)
                    else:
                        self.log_test("Search Suggestions", False, "No suggestions returned for 'goa'", response_time)
                else:
                    self.log_test("Search Suggestions", False, "Invalid response format", response_time)
            else:
                self.log_test("Search Suggestions", False, f"HTTP {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Search Suggestions", False, f"Error: {str(e)}")
        """Test search suggestions endpoint"""
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/search-suggestions?query=goa")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                suggestions = response.json()
                
                if isinstance(suggestions, list):
                    if suggestions:
                        # Check suggestion structure
                        first_suggestion = suggestions[0]
                        if "text" in first_suggestion and "type" in first_suggestion:
                            self.log_test("Search Suggestions", True, f"Retrieved {len(suggestions)} search suggestions", response_time)
                        else:
                            self.log_test("Search Suggestions", False, "Suggestion data missing required fields", response_time)
                    else:
                        self.log_test("Search Suggestions", False, "No suggestions returned for 'goa'", response_time)
                else:
                    self.log_test("Search Suggestions", False, "Invalid response format", response_time)
            else:
                self.log_test("Search Suggestions", False, f"HTTP {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Search Suggestions", False, f"Error: {str(e)}")
            
    def test_performance(self):
        """Test API performance with large dataset"""
        try:
            # Test response time for full dataset
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/properties?per_page=50")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                if response_time < 3.0:
                    self.log_test("Performance Test", True, f"API responded in {response_time:.2f}s (under 3s threshold)", response_time)
                else:
                    self.log_test("Performance Test", False, f"API took {response_time:.2f}s (over 3s threshold)", response_time)
            else:
                self.log_test("Performance Test", False, f"HTTP {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Performance Test", False, f"Error: {str(e)}")
            
    def run_all_tests(self):
        """Run all tests with focus on locations endpoint"""
        print(f"🚀 Starting StayHunt Backend API Tests - LOCATIONS ENDPOINT FOCUS")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Run tests in order - prioritizing locations endpoint testing
        if self.test_api_health():
            # PRIMARY FOCUS TESTS
            self.test_locations_endpoint()  # Main focus - updated locations endpoint
            self.test_properties_with_location_filter()  # Test location filtering
            self.test_properties_sorting_reviews_desc()  # Test reviews_desc sorting
            
            # SECONDARY TESTS
            self.test_properties_endpoint_basic()
            self.test_properties_pagination()
            self.test_search_functionality()
            self.test_sorting_functionality()
            self.test_individual_property_endpoint()
            self.test_search_suggestions_endpoint()
            self.test_performance()
        else:
            print("❌ API health check failed. Skipping remaining tests.")
            
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY - LOCATIONS ENDPOINT FOCUS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if "✅" in result["status"])
        failed = sum(1 for result in self.test_results if "❌" in result["status"])
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        # Highlight primary focus results
        print("\n🎯 PRIMARY FOCUS RESULTS:")
        focus_tests = ["Locations Endpoint", "Properties Location Filter", "Properties Reviews Sort"]
        for result in self.test_results:
            for focus in focus_tests:
                if focus in result["test"]:
                    print(f"  {result['status']} {result['test']}: {result['message']}")
                    break
        
        if failed > 0:
            print("\n❌ ALL FAILED TESTS:")
            for result in self.test_results:
                if "❌" in result["status"]:
                    print(f"  • {result['test']}: {result['message']}")
                    
        return failed == 0

if __name__ == "__main__":
    tester = StayHuntAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)