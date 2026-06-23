import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MediaItem } from '@/types';
import { Colors } from '@/constants/colors';
import { Play, Film, Tv, Star, Users, Film as FilmPlaceholder } from 'lucide-react-native';
import { formatTipo, formatGenre } from '@/constants/data';

interface MediaCardProps {
  item: MediaItem;
  onPress: () => void;
}

function getTypeIcon(tipo: string) {
  if (tipo === 'Pelicula') return Film;
  if (tipo === 'Anime') return Play;
  return Tv;
}

function getStatusColor(estado: string) {
  return Colors.status[estado as keyof typeof Colors.status] || Colors.textMuted;
}

function getPriorityColor(prioridad: string | null) {
  if (!prioridad) return Colors.textMuted;
  return Colors.priority[prioridad as keyof typeof Colors.priority] || Colors.textMuted;
}

export default function MediaCard({ item, onPress }: MediaCardProps) {
  const TypeIcon = getTypeIcon(item.tipo);
  const statusColor = getStatusColor(item.estado);
  const priorityColor = getPriorityColor(item.prioridad);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardLayout}>
        {/* Póster a la izquierda */}
        <View style={styles.posterContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.posterImage} />
          ) : (
            <View style={styles.posterPlaceholder}>
              <FilmPlaceholder size={24} color={Colors.textMuted} />
              <Text style={styles.placeholderText}>{formatTipo(item.tipo)}</Text>
            </View>
          )}
        </View>

        {/* Detalles a la derecha */}
        <View style={styles.detailsContainer}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: statusColor + '15' }]}>
              <TypeIcon size={12} color={statusColor} />
              <Text style={[styles.typeText, { color: statusColor }]}>{formatTipo(item.tipo)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{item.estado}</Text>
            </View>
          </View>

          {/* Título */}
          <Text style={styles.title} numberOfLines={2}>
            {item.titulo}
          </Text>

          {/* Metadata */}
          <View style={styles.metaRow}>
            {item.plataforma ? (
              <Text style={styles.platform} numberOfLines={1}>
                {item.plataforma}
              </Text>
            ) : null}
            {item.genero ? (
              <Text style={styles.genre} numberOfLines={1}>
                {formatGenre(item.genero)}
              </Text>
            ) : null}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {item.prioridad && (
                <View style={styles.priorityDot}>
                  <View style={[styles.dot, { backgroundColor: priorityColor }]} />
                  <Text style={styles.priorityText}>{item.prioridad}</Text>
                </View>
              )}
              {item.progreso ? (
                <Text style={styles.progress} numberOfLines={1}>
                  {item.progreso}
                </Text>
              ) : null}
            </View>
            
            <View style={styles.footerRight}>
              {item.calificacion && (
                <View style={styles.rating}>
                  <Star size={12} color="#f5c518" fill="#f5c518" />
                  <Text style={styles.ratingText}>{item.calificacion}</Text>
                </View>
              )}
              {item.partners && item.partners.length > 0 && (
                <View style={styles.partners}>
                  <Users size={12} color={Colors.textMuted} />
                  <Text style={styles.partnersText}>{item.partners.length + 1}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLayout: {
    flexDirection: 'row',
  },
  posterContainer: {
    width: 80,
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  platform: {
    fontSize: 11,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 100,
  },
  genre: {
    fontSize: 11,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  progress: {
    fontSize: 11,
    color: Colors.textSecondary,
    maxWidth: 80,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: '#f5c518',
    fontWeight: '600',
  },
  partners: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  partnersText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
