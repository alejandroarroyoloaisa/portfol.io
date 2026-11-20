/**
 * 09 · Perfil de artista (RF-06, RF-13, RF-14, RF-16) y 10 · Perfil de galería o institución (RF-11).
 * Se elige la variante según el perfil tenga datos de organización.
 */
import type { UserProfile } from '@portfolio/schemas';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { api } from '../../api/client';
import { useMe } from '../../api/hooks/me';
import { useStartConversation } from '../../api/hooks/messaging';
import {
  useAnswerRequest, useConnect, useEndorse, useNetwork, useRecordView, useRemoveConnection, useToggleFollow, useUser,
  useUserArtworks, useUserSeries,
} from '../../api/hooks/users';
import { ArtworkImage } from '../../components/ArtworkImage';
import { Avatar } from '../../components/Avatar';
import { Button, IconButton, TextLink } from '../../components/Button';
import { Chip, Tag } from '../../components/Chip';
import { CutoutCard } from '../../components/Cutout';
import { Blob, Leaf } from '../../components/Decor';
import { NotebookGrid, ProfileHero, StatBlobs } from '../../components/ProfileParts';
import { ReportSheet } from '../../components/ReportSheet';
import { Screen, SectionTitle } from '../../components/Screen';
import { ScreenQuery } from '../../components/ScreenQuery';
import { ConfirmSheet } from '../../components/Sheet';
import { HandNote, Headline, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { capitalize, labels, t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import type { RootScreenProps } from '../../navigation/types';
import { callTypeColors, colors } from '../../theme';
import { longDate, shortDate } from '../../utils/format';
import { usePullRefresh } from '../../utils/hooks';

/** Botones Conectar / Mensaje / Seguir comunes a ambos perfiles. */
function useProfileActions(p: UserProfile) {
  const { nav } = useAppNavigation();
  const connect = useConnect();
  const remove = useRemoveConnection();
  const answer = useAnswerRequest();
  const network = useNetwork();
  const follow = useToggleFollow(p);
  const start = useStartConversation();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const message = () =>
    start.mutate({ userId: p.id }, { onSuccess: (c) => nav.navigate('Chat', { conversationId: c.id }), onError: toast.error });

  const connectButton = (() => {
    switch (p.connection) {
      case 'connected':
        return <Button label={t.profile.connected} variant="outline" size="md" flex icon="check" onPress={() => setConfirmRemove(true)} />;
      case 'pending_out':
        return <Button label={t.profile.pending} variant="dark" size="md" flex disabled />;
      case 'pending_in': {
        const req = network.data?.requests.find((r) => r.user.id === p.id);
        return (
          <Button
            label={t.profile.accept}
            variant="primary"
            size="md"
            flex
            loading={answer.isPending}
            disabled={!req}
            onPress={() => req && answer.mutate({ id: req.id, accept: true }, { onError: toast.error })}
          />
        );
      }
      case 'self':
        return null;
      default:
        return <Button label={t.profile.connect} size="md" flex loading={connect.isPending} onPress={() => connect.mutate({ id: p.id, handle: p.handle }, { onError: toast.error })} />;
    }
  })();

  const confirm = (
    <ConfirmSheet
      visible={confirmRemove}
      title={t.profile.removeConnection}
      text={t.profile.removeConnectionText}
      confirmLabel={t.profile.remove}
      danger
      onClose={() => setConfirmRemove(false)}
      onConfirm={() => remove.mutateAsync({ id: p.id, handle: p.handle })}
    />
  );

  return { connectButton, message, messaging: start.isPending, follow, confirm };
}

function ArtistProfile({ p }: { p: UserProfile }) {
  const { nav, openUser } = useAppNavigation();
  const artworks = useUserArtworks(p.id);
  const series = useUserSeries(p.id);
  const endorse = useEndorse(p);
  const actions = useProfileActions(p);
  const [reporting, setReporting] = useState(false);
  const user = useUser(p.handle);
  const { refreshing, onRefresh } = usePullRefresh(() => Promise.all([user.refetch(), artworks.refetch(), series.refetch()]));

  const openGallery = async () => {
    if (!p.representedBy) return;
    try {
      const r = await api.search({ q: p.representedBy, type: 'galerias', limit: 1 });
      if (r.galleries[0]) openUser(r.galleries[0].handle);
    } catch (e) {
      toast.error(e);
    }
  };

  const techniquesLine = p.techniques.slice(0, 2).map((x) => labels.technique[x]).join(' y ');
  const headline = [p.headline?.split('·')[0].trim(), techniquesLine, p.city].filter(Boolean).join(' · ');

  return (
    <Screen top={false}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} />}>
        <ProfileHero
          user={p}
          bg={colors.cobalto}
          decor={
            <>
              <Blob color={colors.coral} size={200} style={{ right: -30, top: 30 }} />
              <Leaf color={colors.mostaza} width={90} height={120} style={{ left: 150, bottom: -10 }} />
            </>
          }
          left={<IconButton icon="back" variant="cream" accessibilityLabel={t.common.back} onPress={() => nav.goBack()} />}
        />
        <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 }}>
          <Txt size={15} weight="bold">{headline}</Txt>
          {p.representedBy ? (
            <TextLink label={t.profile.representedBy(p.representedBy)} onPress={openGallery} style={{ alignSelf: 'flex-start' }} />
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 }}>
            {p.acceptsCommissions ? (
              <View style={{ paddingHorizontal: 12, paddingVertical: 2, backgroundColor: colors.tinta, transform: [{ rotate: '-2deg' }] }}>
                <HandNote size={22} color={colors.crema}>{t.profile.commissions}</HandNote>
              </View>
            ) : null}
            <Chip
              label={p.following ? t.profile.following : t.profile.follow}
              size="sm"
              icon={p.following ? 'check' : 'plus'}
              selected={p.following}
              selectedColor={colors.mostaza}
              onPress={() => actions.follow.mutate(undefined, { onError: toast.error })}
            />
          </View>

          <StatBlobs
            items={[
              { value: p.counts.artworks, label: t.profile.counts.artworks, color: colors.coral },
              { value: p.counts.connections, label: t.profile.counts.connections, color: colors.mostaza },
              { value: p.counts.exhibitions, label: t.profile.counts.exhibitions, color: colors.verde },
            ]}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {actions.connectButton}
            <Button label={t.profile.message} variant="outline" size="md" flex onPress={actions.message} loading={actions.messaging} />
          </View>

          {p.bio ? <Txt size={15} lineHeight={22} style={{ marginTop: 18 }}>{p.bio}</Txt> : null}

          {p.techniques.length ? (
            <>
              <SectionTitle>{t.profile.techniques}</SectionTitle>
              <View style={{ gap: 8 }}>
                {p.techniques.map((tq) => {
                  const n = p.endorsements[tq] ?? 0;
                  const mine = p.endorsedByMe.includes(tq);
                  return (
                    <View key={tq} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.blanco }}>
                      <View style={{ flex: 1 }}>
                        <Txt size={15} weight="black">{capitalize(labels.technique[tq])}</Txt>
                        {n ? <HandNote size={18} color={colors.cobalto}>{t.profile.endorsements(n)}</HandNote> : null}
                      </View>
                      {mine ? (
                        <Tag small label={t.profile.endorsed} bg={colors.verde} color={colors.crema} />
                      ) : (
                        <Chip
                          label={t.profile.endorse}
                          size="sm"
                          icon="check"
                          accessibilityLabel={t.profile.endorseA11y(labels.technique[tq])}
                          onPress={() => endorse.mutate(tq, { onError: toast.error })}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {series.data?.length ? (
            <>
              <SectionTitle>{t.profile.series}</SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {series.data.map((s) => (
                  <Chip key={s.id} label={`${s.title} · ${t.profile.seriesCount(s.count)}`} size="sm" icon="arrowRight" bg={colors.crema} onPress={() => nav.navigate('Exhibition', { seriesId: s.id })} />
                ))}
              </View>
            </>
          ) : null}

          {p.career.length ? (
            <>
              <SectionTitle>{t.profile.career}</SectionTitle>
              {p.career.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                  <HandNote size={21} color={colors.anotacion} style={{ width: 48 }}>{c.year}</HandNote>
                  <Txt size={15} weight="bold" style={{ flex: 1 }}>{c.text}</Txt>
                </View>
              ))}
            </>
          ) : null}

          <SectionTitle size={32}>{t.profile.notebook}</SectionTitle>
          {artworks.data?.length ? (
            <NotebookGrid artworks={artworks.data} onOpen={(a) => nav.navigate('Artwork', { id: a.id })} />
          ) : (
            <Txt size={14}>{artworks.isPending ? t.common.loading : t.profile.notebookEmpty}</Txt>
          )}

          <TextLink label={t.common.report} color={colors.tintaSuave} size={13} onPress={() => setReporting(true)} style={{ marginTop: 24, alignSelf: 'flex-start' }} />
        </View>
      </ScrollView>
      {actions.confirm}
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} target={{ targetType: 'usuario', targetId: p.id }} title={t.profile.reportTitle} />
    </Screen>
  );
}

function OrgProfile({ p }: { p: UserProfile }) {
  const { nav, openUser } = useAppNavigation();
  const org = p.organization!;
  const actions = useProfileActions(p);
  const user = useUser(p.handle);
  const { refreshing, onRefresh } = usePullRefresh(user.refetch);
  const kind = labels.role[p.role].split(' ')[0].toLowerCase();
  const shown = org.artists.slice(0, 3);
  const more = org.artistsTotal - shown.length;
  const ex = org.currentExhibition;

  return (
    <Screen top={false}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} />}>
        <ProfileHero
          user={p}
          bg={colors.verde}
          height={250}
          kicker={t.profile.orgSince(kind, org.since)}
          decor={
            <>
              <Blob color={colors.mostaza} size={220} style={{ right: -40, top: -20 }} />
              <Leaf color={colors.coral} width={80} height={130} style={{ left: 170, bottom: -30 }} />
            </>
          }
          left={<IconButton icon="back" variant="cream" accessibilityLabel={t.common.back} onPress={() => nav.goBack()} />}
        />
        <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 }}>
          {p.bio ? <Txt size={15} lineHeight={22}>{p.bio}</Txt> : null}
          {org.address || org.openingHours ? (
            <HandNote size={21} style={{ marginTop: 8 }}>{[org.address, org.openingHours].filter(Boolean).join(' · ')}</HandNote>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button
              label={p.following ? t.profile.following : t.profile.follow}
              variant={p.following ? 'outline' : 'primary'}
              size="md"
              flex
              icon={p.following ? 'check' : undefined}
              onPress={() => actions.follow.mutate(undefined, { onError: toast.error })}
            />
            <Button label={t.profile.message} variant="outline" size="md" flex onPress={actions.message} loading={actions.messaging} />
          </View>

          {org.openCalls.length ? (
            <>
              <SectionTitle size={22}>{org.openCalls.length > 1 ? t.profile.openCalls : t.profile.openCall}</SectionTitle>
              <View style={{ gap: 14 }}>
                {org.openCalls.map((c, i) => {
                  const look = callTypeColors[c.type] ?? callTypeColors.premio;
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.title}. ${t.profile.closesOn(longDate(c.closesAt))}`}
                      onPress={() => nav.navigate('CallDetail', { id: c.id })}
                      style={({ pressed }) => ({
                        padding: 16, backgroundColor: i === 0 ? colors.coral : look.bg, opacity: pressed ? 0.9 : 1,
                        borderTopLeftRadius: 4, borderTopRightRadius: 32, borderBottomRightRadius: 4, borderBottomLeftRadius: 32,
                        transform: [{ rotate: `${i % 2 ? 1 : -1}deg` }],
                      })}
                    >
                      <HandNote size={21} color={i === 0 ? colors.tinta : look.fg}>{t.profile.closesOn(longDate(c.closesAt))}</HandNote>
                      <Headline size={24} em={-0.03} color={i === 0 ? colors.tinta : look.fg}>{c.title}</Headline>
                      <Txt size={14} weight="bold" color={i === 0 ? colors.tinta : look.fg}>
                        {[capitalize(labels.callType[c.type]), c.places ? t.profile.places(c.places) : c.prize].filter(Boolean).join(' · ')}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {ex ? (
            <>
              <SectionTitle size={22}>{t.profile.nowShowing}</SectionTitle>
              <CutoutCard rotate={1} padding={10} shadow="polaroid" onPress={() => nav.navigate('Exhibition', { exhibitionId: ex.id })} accessibilityLabel={ex.title}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <ArtworkImage image={ex.cover} title={ex.title} variant="thumb" style={{ width: 92, height: 92 }} />
                  <View style={{ flex: 1 }}>
                    <Txt size={20} weight="black">{ex.title}</Txt>
                    <Txt size={14}>{[ex.artist.name, ex.endsAt ? t.exhibition.until(shortDate(ex.endsAt)) : null].filter(Boolean).join(' · ')}</Txt>
                    {ex.virtual ? <HandNote size={19} color={colors.cobalto}>{t.profile.visitRoom}</HandNote> : null}
                  </View>
                </View>
              </CutoutCard>
            </>
          ) : null}

          {org.artists.length ? (
            <>
              <SectionTitle size={22}>{t.profile.artists}</SectionTitle>
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                {shown.map((a) => (
                  <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={t.a11y.openProfile(a.name)} onPress={() => openUser(a.handle)} style={{ alignItems: 'center', width: 70 }}>
                    <Avatar user={a} size={64} />
                    <Txt size={13} weight="bold" numberOfLines={1}>{a.name.split(' ')[0]}</Txt>
                  </Pressable>
                ))}
                {more > 0 ? (
                  <View style={{ alignItems: 'center', width: 70 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.tinta, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt size={15} weight="black">{t.profile.moreArtists(more)}</Txt>
                    </View>
                    <Txt size={13} weight="bold">{t.common.more}</Txt>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

export function ProfileScreen({ route }: RootScreenProps<'Profile'>) {
  const q = useUser(route.params.handle);
  const me = useMe().data;
  const view = useRecordView();
  // Cada visita cuenta para las estadísticas de la otra persona (RF-32).
  useEffect(() => {
    if (q.data && me && q.data.id !== me.id) view.mutate(q.data.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.id]);
  return <ScreenQuery query={q}>{(p) => (p.organization ? <OrgProfile p={p} /> : <ArtistProfile p={p} />)}</ScreenQuery>;
}
