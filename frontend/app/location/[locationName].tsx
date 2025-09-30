import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Property {
  _id: string;
  homestay_name: string;
  location: string;
  sub_location: string;
  google_address: string;
  google_phone: string;
  google_rating: number;
  number_of_reviews: number;
  google_maps_link: string;
  photo_url: string;
  category: string;
  amenities: string;
  tariff: string;
  source_url?: string;
  youtube_video?: string;
}

interface APIResponse {
  properties: Property[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface SubLocation {
  name: string;
  count: number;
  expanded: boolean;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function LocationDetailScreen() {
  const { locationName } = useLocalSearchParams<{ locationName: string }>();
  const router = useRouter();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedSubLocation, setSelectedSubLocation] = useState<string>('');

  const fetchLocationData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/locations`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const locations = await response.json();
      const currentLocation = locations.find((loc: any) => 
        loc.location.toLowerCase() === locationName?.toLowerCase()
      );
      
      if (currentLocation) {
        const subLocs: SubLocation[] = [];
        for (const subLocObj of currentLocation.sub_locations) {
          for (const [name, count] of Object.entries(subLocObj)) {
            subLocs.push({
              name: name as string,
              count: count as number,
              expanded: false
            });
          }
        }
        // Sort by count descending
        subLocs.sort((a, b) => b.count - a.count);
        setSubLocations(subLocs);
      }
    } catch (error) {
      console.error('Error fetching location data:', error);
    } finally {
      setLoading(false);
    }
  }, [locationName]);

  const fetchProperties = useCallback(async (pageNum = 1, subLocation = '', isRefresh = false) => {
    try {
      if (pageNum === 1) {
        isRefresh ? setRefreshing(true) : setLoading(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        per_page: '10',
        location: locationName || '',
        sort_by: 'reviews_desc', // Number of reviews first, then rating
        ...(subLocation && { sub_location: subLocation })
      });

      const apiUrl = `${API_BASE_URL}/api/properties?${params}`;
      console.log('Fetching properties from:', apiUrl);
      console.log('Location name:', locationName);
      console.log('Sub location:', subLocation);

      const response = await fetch(apiUrl);
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: APIResponse = await response.json();
      console.log('Properties data received:', data);
      
      if (pageNum === 1) {
        setProperties(data.properties);
      } else {
        setProperties(prev => [...prev, ...data.properties]);
      }
      
      setTotal(data.total);
      setHasMore(pageNum < data.total_pages);
      
    } catch (error) {
      console.error('Error fetching properties:', error);
      Alert.alert('Error', 'Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locationName]);

  useEffect(() => {
    if (locationName) {
      fetchLocationData();
      fetchProperties(1, selectedSubLocation);
    }
  }, [locationName, selectedSubLocation]);

  const toggleSubLocation = (index: number) => {
    setSubLocations(prev => prev.map((item, i) => 
      i === index ? { ...item, expanded: !item.expanded } : item
    ));
  };

  const selectSubLocation = (subLocationName: string) => {
    setSelectedSubLocation(subLocationName === selectedSubLocation ? '' : subLocationName);
    setPage(1);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProperties(nextPage, selectedSubLocation);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    fetchProperties(1, selectedSubLocation, true);
  };

  const handleCall = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
    });
  };

  const handleOpenMap = (mapLink: string) => {
    Linking.openURL(mapLink).catch(() => {
      Alert.alert('Error', 'Unable to open map link');
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`star-${i}`} name="star" size={14} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half-star" name="star-half" size={14} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-star-${i}`} name="star-outline" size={14} color="#FFD700" />
      );
    }

    return stars;
  };

  const renderSubLocationTree = () => (
    <View style={styles.treeContainer}>
      <Text style={styles.treeTitle}>Areas in {locationName}</Text>
      {subLocations.map((subLoc, index) => (
        <View key={index} style={styles.treeItem}>
          <TouchableOpacity
            style={[
              styles.subLocationButton,
              selectedSubLocation === subLoc.name && styles.subLocationButtonSelected
            ]}
            onPress={() => selectSubLocation(subLoc.name)}
          >
            <View style={styles.subLocationInfo}>
              <Text style={[
                styles.subLocationName,
                selectedSubLocation === subLoc.name && styles.subLocationNameSelected
              ]}>
                {subLoc.name}
              </Text>
              <Text style={[
                styles.subLocationCount,
                selectedSubLocation === subLoc.name && styles.subLocationCountSelected
              ]}>
                ({subLoc.count} properties)
              </Text>
            </View>
            <Ionicons
              name={selectedSubLocation === subLoc.name ? "chevron-up" : "chevron-down"}
              size={20}
              color={selectedSubLocation === subLoc.name ? "#007AFF" : "#666"}
            />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderProperty = ({ item }: { item: Property }) => (
    <View style={styles.propertyCard}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.photo_url }}
          style={styles.propertyImage}
          resizeMode="cover"
        />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>

      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName} numberOfLines={2}>
          {item.homestay_name}
        </Text>
        
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.sub_location}
          </Text>
        </View>

        <View style={styles.ratingRow}>
          <View style={styles.starsContainer}>
            {renderStars(item.google_rating)}
          </View>
          <Text style={styles.ratingText}>
            {item.google_rating.toFixed(1)} ({item.number_of_reviews} reviews)
          </Text>
        </View>

        <Text style={styles.amenitiesText} numberOfLines={2}>
          {item.amenities}
        </Text>

        <Text style={styles.tariffText}>{item.tariff}</Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCall(item.google_phone)}
          >
            <Ionicons name="call" size={16} color="white" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.whatsappButton]}
            onPress={() => handleWhatsApp(item.google_phone)}
          >
            <Ionicons name="logo-whatsapp" size={16} color="white" />
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.mapButton]}
            onPress={() => handleOpenMap(item.google_maps_link)}
          >
            <Ionicons name="map" size={16} color="white" />
            <Text style={styles.actionButtonText}>Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="home-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        {selectedSubLocation 
          ? `No properties found in ${selectedSubLocation}` 
          : `No properties found in ${locationName}`
        }
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{locationName}</Text>
          <Text style={styles.headerSubtitle}>
            {total} {total === 1 ? 'property' : 'properties'} available
          </Text>
        </View>
      </View>

      {/* Tree Structure */}
      {renderSubLocationTree()}

      {/* Results Count */}
      {!loading && total > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            Showing {total} {total === 1 ? 'property' : 'properties'}
            {selectedSubLocation && ` in ${selectedSubLocation}`}
            {' • Sorted by Reviews & Rating'}
          </Text>
        </View>
      )}

      {/* Properties List */}
      <FlatList
        data={properties}
        keyExtractor={(item) => item._id}
        renderItem={renderProperty}
        ListEmptyComponent={loading ? null : renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={properties.length === 0 && !loading ? styles.emptyContainer : null}
      />

      {loading && page === 1 && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  treeContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  treeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  treeItem: {
    marginBottom: 8,
  },
  subLocationButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  subLocationButtonSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  subLocationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  subLocationNameSelected: {
    color: '#007AFF',
  },
  subLocationCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  subLocationCountSelected: {
    color: '#007AFF',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  propertyCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  propertyInfo: {
    padding: 12,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  amenitiesText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  tariffText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginHorizontal: 3,
  },
  callButton: {
    backgroundColor: '#34C759',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  mapButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});