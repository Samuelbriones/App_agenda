import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, Filter, ChevronDown, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { MediaItem, Filters, MediaType, MediaStatus, Priority } from '@/types';
import { Colors } from '@/constants/colors';
import { MEDIA_TYPES, MEDIA_STATUSES, PRIORITIES, PLATFORMS } from '@/constants/data';
import MediaCard from '@/components/MediaCard';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    tipo: 'Todos',
    estado: 'Todos',
    plataforma: '',
    prioridad: 'Todos',
    search: '',
  });

  const fetchItems = useCallback(async () => {
    let query = supabase
      .from('media_items')
      .select('*, partners:media_partners(user_id, profiles(display_name, email))');

    if (filters.tipo !== 'Todos') {
      query = query.eq('tipo', filters.tipo);
    }
    if (filters.estado !== 'Todos') {
      query = query.eq('estado', filters.estado);
    }
    if (filters.plataforma) {
      query = query.eq('plataforma', filters.plataforma);
    }
    if (filters.prioridad !== 'Todos') {
      query = query.eq('prioridad', filters.prioridad);
    }
    if (filters.search.trim()) {
      query = query.ilike('titulo', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) {
      console.error('Error fetching items:', error);
    } else if (data) {
      setItems(data as unknown as MediaItem[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  useEffect(() => {
    const subscription = supabase
      .channel('media_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_items' },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const clearFilters = () => {
    setFilters({ tipo: 'Todos', estado: 'Todos', plataforma: '', prioridad: 'Todos', search: '' });
  };

  const activeFilterCount = [
    filters.tipo !== 'Todos',
    filters.estado !== 'Todos',
    filters.plataforma !== '',
    filters.prioridad !== 'Todos',
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Contenido</Text>
        <Text style={styles.subtitle}>{items.length} registros</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título..."
            placeholderTextColor={Colors.textMuted}
            value={filters.search}
            onChangeText={(text) => setFilters((f) => ({ ...f, search: text }))}
          />
          {filters.search.length > 0 && (
            <TouchableOpacity onPress={() => setFilters((f) => ({ ...f, search: '' }))}>
              <X size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={activeFilterCount > 0 ? Colors.primary : Colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <FilterDropdown
            label="Tipo"
            value={filters.tipo}
            options={['Todos', ...MEDIA_TYPES]}
            onSelect={(v) => setFilters((f) => ({ ...f, tipo: v as MediaType | 'Todos' }))}
          />
          <FilterDropdown
            label="Estado"
            value={filters.estado}
            options={['Todos', ...MEDIA_STATUSES]}
            onSelect={(v) => setFilters((f) => ({ ...f, estado: v as MediaStatus | 'Todos' }))}
          />
          <FilterDropdown
            label="Plataforma"
            value={filters.plataforma || 'Todas'}
            options={['Todas', ...PLATFORMS]}
            onSelect={(v) => setFilters((f) => ({ ...f, plataforma: v === 'Todas' ? '' : v }))}
          />
          <FilterDropdown
            label="Prioridad"
            value={filters.prioridad}
            options={['Todos', ...PRIORITIES]}
            onSelect={(v) => setFilters((f) => ({ ...f, prioridad: v as Priority | 'Todos' }))}
          />
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MediaCard item={item} onPress={() => router.push(`/(tabs)/detail/${item.id}`)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Cargando...' : 'No hay contenido registrado'}
            </Text>
            {!loading && (
              <TouchableOpacity style={styles.addEmptyButton} onPress={() => router.push('/(tabs)/add')}>
                <Text style={styles.addEmptyButtonText}>Agregar contenido</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

function formatFilterValue(val: string, label: string): string {
  if (label === 'Tipo') {
    if (val === 'Pelicula') return 'Película';
  }
  return val;
}

function FilterDropdown({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setOpen(!open)}>
        <Text style={styles.dropdownValue}>{formatFilterValue(value, label)}</Text>
        <ChevronDown size={16} color={Colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemTextActive]}>
                {formatFilterValue(opt, label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    height: 44,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: Colors.surfaceLight,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  filtersPanel: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  filterGroup: {
    position: 'relative',
  },
  filterLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownValue: {
    color: Colors.text,
    fontSize: 14,
  },
  dropdownMenu: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary + '22',
  },
  dropdownItemText: {
    color: Colors.text,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 6,
  },
  clearButtonText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  addEmptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addEmptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
