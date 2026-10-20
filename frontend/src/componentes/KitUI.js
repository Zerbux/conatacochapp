import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export const COLORES = {
  verde: '#1A9C43',
  negro: '#000000',
  blanco: '#FFFFFF',
  fondo: '#F5F5F5',
  gris: '#666666',
  borde: '#E8E8E8',
  rojo: '#D81B60',
  naranja: '#E67E22',
};

export function Screen({ children, style }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, onBack, right }) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={styles.backButton}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={23} color={COLORES.blanco} />
          </TouchableOpacity>
        ) : null}
        <Image
          source={require('../../assets/logoLPng.png')}
          style={[styles.logo, { width: Math.min(width * 0.56, 190) }]}
          resizeMode="contain"
        />
        {right || <View style={styles.headerRightSpacer} />}
      </View>
      {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Page({ title, subtitle, onBack, right, children }) {
  return (
    <Screen>
      <Header title={title} subtitle={subtitle} onBack={onBack} right={right} />
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}

export function DataCard({ children, style, onPress, accessibilityLabel }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      {...(onPress ? { activeOpacity: 0.75 } : {})}
      onPress={onPress}
      style={[styles.card, style]}
    >
      {children}
    </Container>
  );
}

export function PrimaryButton({ title, onPress, disabled, icon, style }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles.primaryButton, disabled && styles.buttonDisabled, style]}
    >
      {icon ? <Ionicons name={icon} size={19} color={COLORES.blanco} /> : null}
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress, icon, style }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.button, styles.secondaryButton, style]}
    >
      {icon ? <Ionicons name={icon} size={19} color={COLORES.verde} /> : null}
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function DangerButton({ title, onPress, icon, style }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.button, styles.dangerButton, style]}
    >
      {icon ? <Ionicons name={icon} size={19} color={COLORES.blanco} /> : null}
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function StatusBadge({ label, tone = 'neutral' }) {
  const palette = {
    success: ['#E8F5E9', COLORES.verde],
    danger: ['#FCE4EC', COLORES.rojo],
    warning: ['#FFF3E0', '#A45500'],
    neutral: ['#EEEEEE', '#555555'],
  };
  const [backgroundColor, color] = palette[tone] || palette.neutral;
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, editable = true }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value == null ? '' : String(value)}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#999999"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        editable={editable}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[styles.input, multiline && styles.multilineInput, !editable && styles.disabledInput]}
      />
    </View>
  );
}

export const InputField = Field;

function EntityCard({ title, subtitle, status, onPress, children, icon }) {
  return (
    <DataCard onPress={onPress}>
      <View style={styles.entityCardHeader}>
        <Ionicons name={icon} size={21} color={COLORES.verde} />
        <View style={styles.entityCardText}>
          <Text style={styles.entityCardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.entityCardSubtitle}>{subtitle}</Text> : null}
        </View>
        {status ? <StatusBadge label={status} /> : null}
      </View>
      {children}
    </DataCard>
  );
}

export function VehicleCard(props) {
  return <EntityCard icon="car-sport-outline" {...props} />;
}

export function DriverCard(props) {
  return <EntityCard icon="person-circle-outline" {...props} />;
}

export function RouteCard(props) {
  return <EntityCard icon="map-outline" {...props} />;
}

export function RequestCard(props) {
  return <EntityCard icon="clipboard-outline" {...props} />;
}

export function TripCard(props) {
  return <EntityCard icon="navigate-outline" {...props} />;
}

export function SearchBar({ value, onChangeText, placeholder = 'Buscar...' }) {
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search-outline" size={20} color="#777777" />
      <TextInput
        accessibilityLabel={placeholder}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#888888"
        autoCapitalize="none"
        returnKeyType="search"
      />
    </View>
  );
}

export function EmptyState({ title, description, icon = 'file-tray-outline' }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={42} color="#BBBBBB" />
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

export function LoadingState({ label = 'Cargando...' }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator size="large" color={COLORES.verde} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.state}>
      <Ionicons name="alert-circle-outline" size={42} color={COLORES.rojo} />
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? <SecondaryButton title="Reintentar" onPress={onRetry} /> : null}
    </View>
  );
}

export function StatCard({ label, value, icon, tone = COLORES.verde, onPress }) {
  return (
    <DataCard style={styles.statCard} onPress={onPress}>
      <Ionicons name={icon || 'stats-chart-outline'} size={22} color={tone} />
      <Text style={styles.statValue}>{String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </DataCard>
  );
}

export function DemoBanner({ children = 'DATOS MOCK · SOLO DEMOSTRACIÓN' }) {
  return (
    <View style={styles.demoBanner}>
      <Ionicons name="flask-outline" size={16} color="#7A4B00" />
      <Text style={styles.demoText}>{children}</Text>
    </View>
  );
}

export function ConfirmModal({ visible, title, message, confirmLabel = 'Confirmar', onCancel, onConfirm, danger }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <SecondaryButton title="Volver" onPress={onCancel} style={styles.modalButton} />
            {danger ? (
              <DangerButton title={confirmLabel} onPress={onConfirm} style={styles.modalButton} />
            ) : (
              <PrimaryButton title={confirmLabel} onPress={onConfirm} style={styles.modalButton} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const ModalConfirmacion = ConfirmModal;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  header: {
    backgroundColor: '#000000',
    paddingHorizontal: 25,
    paddingTop: 8,
    paddingBottom: 38,
  },
  headerRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 190, height: 38 },
  backButton: { width: 44, minHeight: 48, alignItems: 'flex-start', justifyContent: 'center' },
  headerRightSpacer: { width: 44 },
  headerTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', marginTop: 9 },
  headerSubtitle: { color: '#E2E2E2', fontSize: 13, marginTop: 4 },
  page: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  pageContent: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  button: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: { backgroundColor: '#1A9C43' },
  dangerButton: { backgroundColor: '#D81B60' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#1A9C43' },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  secondaryButtonText: { color: '#1A9C43', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#333333', marginBottom: 6 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    minHeight: 48,
    paddingHorizontal: 13,
    color: '#111111',
    fontSize: 15,
  },
  multilineInput: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  disabledInput: { color: '#777777', backgroundColor: '#EEEEEE' },
  searchBar: {
    minHeight: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  searchInput: { flex: 1, marginLeft: 8, color: '#111111', minHeight: 44 },
  emptyState: { alignItems: 'center', padding: 28, gap: 8 },
  emptyTitle: { color: '#444444', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyDescription: { color: '#777777', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  stateText: { color: '#555555', fontSize: 15, textAlign: 'center' },
  statCard: { width: '48%', minHeight: 112, marginBottom: 0, alignItems: 'flex-start', gap: 5 },
  statValue: { fontSize: 23, fontWeight: '900', color: '#111111' },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#666666' },
  entityCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  entityCardText: { flex: 1 },
  entityCardTitle: { color: '#111111', fontSize: 15, fontWeight: '800' },
  entityCardSubtitle: { color: '#666666', fontSize: 12, marginTop: 3 },
  demoBanner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#F4D58D',
    borderWidth: 1,
    borderRadius: 8,
    padding: 9,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  demoText: { color: '#7A4B00', fontWeight: '800', fontSize: 11, flexShrink: 1 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#111111', marginBottom: 9 },
  modalMessage: { color: '#555555', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, minHeight: 46 },
});
