import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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

interface LocationStat {
  location: string;
  count: number;
  sub_locations: Array<Record<string, number>>;
}

interface FilterState {
  search: string;
  location: string;
  sub_location: string;
  category: string;
  min_rating: number | null;
  sort_by: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function ListingScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<LocationStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    location: '',
    sub_location: '',
    category: '',
    min_rating: null,
    sort_by: 'reviews_desc'
  });
  
  // Expanded filter sections
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    location: true,
    price: false,
    classification: false,
  });
  
  const router = useRouter();

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/locations`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: LocationStat[] = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  }, []);

  const fetchProperties = useCallback(async (pageNum = 1, newFilters = filters, isRefresh = false) => {
    try {
      if (pageNum === 1) {
        isRefresh ? setRefreshing(true) : setLoading(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        per_page: '20',
        sort_by: newFilters.sort_by,
        ...(newFilters.search && { search: newFilters.search }),
        ...(newFilters.location && { location: newFilters.location }),
        ...(newFilters.sub_location && { sub_location: newFilters.sub_location }),
        ...(newFilters.category && { category: newFilters.category }),
        ...(newFilters.min_rating && { min_rating: newFilters.min_rating.toString() }),
      });

      const response = await fetch(`${API_BASE_URL}/api/properties?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: APIResponse = await response.json();
      
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
  }, [filters]);

  useEffect(() => {
    fetchLocations();
    fetchProperties(1, filters);
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProperties(1, filters);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      location: '',
      sub_location: '',
      category: '',
      min_rating: null,
      sort_by: 'reviews_desc'
    };
    setFilters(clearedFilters);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProperties(nextPage, filters);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    fetchProperties(1, filters, true);
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
        <Ionicons key={`star-${i}`} name="star" size={12} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half-star" name="star-half" size={12} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-star-${i}`} name="star-outline" size={12} color="#FFD700" />
      );
    }

    return stars;
  };

  const renderFilterSection = () => (
    <View style={styles.filtersContainer}>
      {/* Filter Header */}
      <View style={styles.filterHeader}>
        <Text style={styles.filterTitle}>Filters</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Clear Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties..."
          placeholderTextColor="#999"
          value={filters.search}
          onChangeText={(text) => handleFilterChange('search', text)}
        />
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
      </View>

      {/* Location Filter */}
      <TouchableOpacity
        style={styles.filterSection}
        onPress={() => toggleSection('location')}
      >
        <Text style={styles.sectionTitle}>Location</Text>
        <Ionicons
          name={expandedSections.location ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>
      
      {expandedSections.location && (
        <View style={styles.filterOptions}>
          {locations.map((loc) => (
            <View key={loc.location}>
              {/* Main Location Node */}
              <TouchableOpacity
                style={styles.mainLocationNode}
                onPress={() => {
                  const key = `location_${loc.location}`;
                  setExpandedSections(prev => ({
                    ...prev,
                    [key]: !prev[key]
                  }));
                }}
              >
                <Text style={styles.mainLocationText}>
                  {loc.location} & Offbeat ({loc.count})
                </Text>
                <Ionicons
                  name={expandedSections[`location_${loc.location}`] ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>
              
              {/* Sub-locations (Second level nodes) */}
              {expandedSections[`location_${loc.location}`] && (
                <View style={styles.subLocationNodes}>
                  {loc.sub_locations.map((subLocObj, index) => {
                    const [name, count] = Object.entries(subLocObj)[0];
                    return (
                      <TouchableOpacity
                        key={`${name}-${index}`}
                        style={[
                          styles.subLocationNode,
                          filters.location === loc.location && filters.sub_location === name && styles.selectedSubLocation
                        ]}
                        onPress={() => {
                          handleFilterChange('location', loc.location);
                          handleFilterChange('sub_location', 
                            filters.location === loc.location && filters.sub_location === name ? '' : name
                          );
                        }}
                      >
                        <Text style={[
                          styles.subLocationNodeText,
                          filters.location === loc.location && filters.sub_location === name && styles.selectedSubLocationText
                        ]}>
                          {name}({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {loc.sub_locations.length > 6 && (
                    <TouchableOpacity style={styles.showMoreNode}>
                      <Text style={styles.showMoreText}>Show More</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Price Filter */}
      <TouchableOpacity
        style={styles.filterSection}
        onPress={() => toggleSection('price')}
      >
        <Text style={styles.sectionTitle}>Price</Text>
        <Ionicons
          name={expandedSections.price ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {/* Property Classification */}
      <TouchableOpacity
        style={styles.filterSection}
        onPress={() => toggleSection('classification')}
      >
        <Text style={styles.sectionTitle}>Property Classification</Text>
        <Ionicons
          name={expandedSections.classification ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {expandedSections.classification && (
        <View style={styles.filterOptions}>
          {['Resort', 'Homestay'].map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterOption,
                filters.category === category && styles.filterOptionSelected
              ]}
              onPress={() => handleFilterChange('category',
                filters.category === category ? '' : category
              )}
            >
              <Text style={[
                styles.filterOptionText,
                filters.category === category && styles.filterOptionTextSelected
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderProperty = ({ item }: { item: Property }) => (
    <TouchableOpacity style={styles.propertyCard} activeOpacity={0.8}>
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: item.photo_url }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.propertyName} numberOfLines={2}>
          {item.homestay_name}
        </Text>
        
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.sub_location}
          </Text>
        </View>

        {item.google_rating > 0 && (
          <View style={styles.ratingRow}>
            <View style={styles.starsContainer}>
              {renderStars(item.google_rating)}
            </View>
            <Text style={styles.ratingText}>
              {item.google_rating.toFixed(1)}
            </Text>
            {item.number_of_reviews > 0 && (
              <Text style={styles.reviewsText}>
                ({item.number_of_reviews})
              </Text>
            )}
          </View>
        )}

        <Text style={styles.priceText}>
          {item.tariff || 'Price on request'}
        </Text>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCall(item.google_phone)}
          >
            <Ionicons name="call" size={16} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleWhatsApp(item.google_phone)}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleOpenMap(item.google_maps_link)}
          >
            <Ionicons name="map" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="home-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        {filters.search || filters.location 
          ? 'No properties found matching your criteria' 
          : 'No properties available'}
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
        <Text style={styles.headerTitle}>All Properties</Text>
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* Desktop: Always show filters | Mobile: Toggle filters */}
        {(showFilters || width > 768) && (
          <ScrollView 
            style={styles.sidebar}
            showsVerticalScrollIndicator={false}
          >
            {renderFilterSection()}
          </ScrollView>
        )}

        {/* Properties List */}
        <View style={styles.listContainer}>
          {/* Sort and Results */}
          <View style={styles.topBar}>
            <Text style={styles.resultsText}>
              {total} {total === 1 ? 'property' : 'properties'} found
            </Text>
            <TouchableOpacity style={styles.sortButton}>
              <Text style={styles.sortButtonText}>Sort: Reviews ↓</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={properties}
            keyExtractor={(item) => item._id}
            renderItem={renderProperty}
            ListEmptyComponent={loading ? null : renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#4CAF50']}
                tintColor="#4CAF50"
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            showsVerticalScrollIndicator={false}
            numColumns={width > 768 ? 2 : 1}
            columnWrapperStyle={width > 768 ? styles.row : null}
            contentContainerStyle={properties.length === 0 && !loading ? styles.emptyContainer : styles.listContent}
          />

          {loading && page === 1 && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading properties...</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  filterToggle: {
    padding: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: width > 768 ? 280 : width * 0.85,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    maxHeight: '100%',
  },
  filtersContainer: {
    padding: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
  },
  searchSection: {
    position: 'relative',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 40,
    fontSize: 14,
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  filterOptions: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  mainLocationNode: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  mainLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  subLocationNodes: {
    marginLeft: 16,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#e9ecef',
  },
  subLocationNode: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginVertical: 1,
    borderRadius: 4,
  },
  selectedSubLocation: {
    backgroundColor: '#e8f5e8',
  },
  subLocationNodeText: {
    fontSize: 13,
    color: '#666',
  },
  selectedSubLocationText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  showMoreNode: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  showMoreText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 6,
  },
  filterOptionSelected: {
    backgroundColor: '#e8f5e8',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  filterOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    justifyContent: 'space-between',
  },
  propertyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    overflow: 'hidden',
    width: width > 768 ? (width - 64 - 280) / 2 - 8 : '100%',
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    padding: 12,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
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
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  reviewsText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 2,
  },
  priceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#4CAF50',
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