/** Obras guardadas (RF-18). */
import { RefreshControl, ScrollView } from 'react-native';
import { useSaved } from '../../api/hooks/me';
import { NotebookGrid } from '../../components/ProfileParts';
import { Screen, ScreenHeader } from '../../components/Screen';
import { EmptyState, QueryView } from '../../components/States';
import { t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { colors } from '../../theme';
import { usePullRefresh } from '../../utils/hooks';

export function SavedScreen() {
  const { nav } = useAppNavigation();
  const q = useSaved();
  const { refreshing, onRefresh } = usePullRefresh(q.refetch);
  return (
    <Screen>
      <ScreenHeader title={t.saved.title} titleSize={40} />
      <QueryView query={q}>
        {(list) => (
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} />}>
            {list.length ? (
              <NotebookGrid artworks={list} onOpen={(a) => nav.navigate('Artwork', { id: a.id })} />
            ) : (
              <EmptyState title={t.saved.emptyTitle} text={t.saved.emptyText} color={colors.coral} />
            )}
          </ScrollView>
        )}
      </QueryView>
    </Screen>
  );
}
