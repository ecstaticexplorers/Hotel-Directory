import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface LocationStat {
  location: string;
  count: number;
  sub_locations: Array<Record<string, number>>;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function HomeScreen() {
  const [locations, setLocations] = useState<LocationStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<LocationStat[]>([]);
  
  // Expanded tree sections
  const [expandedLocations, setExpandedLocations] = useState<{[key: string]: boolean}>({});
  
  const router = useRouter();

  const fetchLocations = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/locations`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: LocationStat[] = await response.json();
      setLocations(data);
      setFilteredLocations(data);
      
    } catch (error) {
      console.error('Error fetching locations:', error);
      Alert.alert('Error', 'Failed to load locations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location =>
        location.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchQuery, locations]);

  const handleRefresh = () => {
    fetchLocations(true);
  };

  const toggleLocationExpansion = (locationName: string) => {
    setExpandedLocations(prev => ({
      ...prev,
      [locationName]: !prev[locationName]
    }));
  };

  const handleLocationPress = (locationName: string) => {
    router.push(`/location/${encodeURIComponent(locationName)}`);
  };

  const getSubLocationCount = (subLocations: Array<Record<string, number>>) => {
    return subLocations.length;
  };

  const renderLocationTree = ({ item }: { item: LocationStat }) => {
    const subLocationCount = getSubLocationCount(item.sub_locations);
    const isExpanded = expandedLocations[item.location];
    
    return (
      <View style={styles.locationTreeNode}>
        {/* Main Location Node */}
        <TouchableOpacity
          style={styles.mainLocationNode}
          onPress={() => toggleLocationExpansion(item.location)}
          activeOpacity={0.8}
        >
          <View style={styles.locationNodeContent}>
            <Ionicons 
              name="location" 
              size={20} 
              color="#007AFF" 
              style={styles.locationNodeIcon}
            />
            <View style={styles.locationNodeInfo}>
              <Text style={styles.locationNodeName}>{item.location}</Text>
              <Text style={styles.locationNodeStats}>
                {subLocationCount} area{subLocationCount !== 1 ? 's' : ''} • {item.count} propert{item.count !== 1 ? 'ies' : 'y'}
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </View>
        </TouchableOpacity>
        
        {/* Sub-locations (Second level) */}
        {isExpanded && (
          <View style={styles.subLocationsList}>
            {item.sub_locations.map((subLocObj, index) => {
              const [name, count] = Object.entries(subLocObj)[0];
              return (
                <TouchableOpacity
                  key={`${name}-${index}`}
                  style={styles.subLocationNode}
                  onPress={() => handleLocationPress(item.location)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subLocationLine} />
                  <View style={styles.subLocationContent}>
                    <Ionicons 
                      name="business-outline" 
                      size={16} 
                      color="#999" 
                      style={styles.subLocationIcon}
                    />
                    <Text style={styles.subLocationName}>
                      {name} ({count})
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {item.sub_locations.length > 8 && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => handleLocationPress(item.location)}
              >
                <Text style={styles.showMoreText}>
                  View all {item.sub_locations.length} areas →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading locations...</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Ionicons name="location-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>
          {searchQuery ? 'No locations found matching your search' : 'No locations available'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>StayHunt</Text>
        <Text style={styles.headerSubtitle}>
          Discover Amazing Stays in North Bengal
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search locations..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* View All Properties Button */}
      <View style={styles.viewAllContainer}>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push('/listings')}
        >
          <Ionicons name="grid-outline" size={20} color="white" />
          <Text style={styles.viewAllButtonText}>View All Properties</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      {!loading && filteredLocations.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
            {searchQuery && ` for "${searchQuery}"`}
          </Text>
        </View>
      )}

      {/* Locations List */}
      <FlatList
        data={filteredLocations}
        keyExtractor={(item) => item.location}
        renderItem={renderLocationCard}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredLocations.length === 0 ? styles.emptyContainer : styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
  },
  viewAllContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  viewAllButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  viewAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  locationCard: {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  locationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 16,
    zIndex: -1,
  },
  locationIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#e3f2fd',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  arrowContainer: {
    padding: 4,
  },
  separator: {
    height: 4,
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
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});