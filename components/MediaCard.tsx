import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MediaItem } from '@/types';
import { Colors } from '@/constants/colors';
import { Play, Film, Tv, Star, Users } from 'lucide-react-native';
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
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: statusColor + '22' }]}>
          <TypeIcon size={14} color={statusColor} />
          <Text style={[styles.typeText, { color: statusColor }]}>{formatTipo(item.tipo)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{item.titulo}</Text>

      <View style={styles.metaRow}>
        {item.plataforma && (
          <Text style={styles.platform}>{item.plataforma}</Text>
        )}
        {item.genero && (
          <Text style={styles.genre}>{formatGenre(item.genero)}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {item.prioridad && (
            <View style={styles.priorityDot}>
              <View style={[styles.dot, { backgroundColor: priorityColor }]} />
              <Text style={styles.priorityText}>{item.prioridad}</Text>
            </View>
          )}
          {item.progreso && (
            <Text style={styles.progress}>{item.progreso}</Text>
          )}
        </View>
        <View style={styles.footerRight}>
          {item.calificacion && (
            <View style={styles.rating}>
              <Star size={14} color="#f5c518" fill="#f5c518" />
              <Text style={styles.ratingText}>{item.calificacion}</Text>
            </View>
          )}
          {item.partners && item.partners.length > 0 && (
            <View style={styles.partners}>
              <Users size={14} color={Colors.textMuted} />
              <Text style={styles.partnersText}>{item.partners.length + 1}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  platform: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  genre: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progress: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#f5c518',
    fontWeight: '600',
  },
  partners: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  partnersText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
