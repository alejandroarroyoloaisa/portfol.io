/**
 * Enlaces profundos (esquema portfolio:// y, en la web, la URL del navegador).
 * Permiten abrir directamente una obra, un perfil o una convocatoria.
 */
import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'portfolio://'],
  config: {
    screens: {
      Splash: 'bienvenida',
      Auth: 'acceso',
      ForgotPassword: 'recuperar',
      Role: 'rol',
      Onboarding: 'onboarding',
      Tabs: {
        screens: {
          Feed: '',
          Explore: 'explorar',
          PublishTab: 'publicar-tab',
          Calls: 'convocatorias',
          MyProfile: 'yo',
        },
      },
      Artwork: 'obra/:id',
      Comments: 'obra/:artworkId/comentarios',
      Profile: 'perfil/:handle',
      Exhibition: 'sala',
      CallDetail: 'convocatoria/:id',
      Apply: 'convocatoria/:callId/solicitud',
      Applications: 'solicitudes',
      Network: 'red',
      Inbox: 'mensajes',
      Chat: 'mensajes/:conversationId',
      Notifications: 'avisos',
      EditProfile: 'yo/editar',
      Stats: 'yo/estadisticas',
      Settings: 'ajustes',
      Saved: 'yo/guardadas',
      Filters: 'explorar/filtros',
      Publish: 'publicar',
    },
  },
};
