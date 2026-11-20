/**
 * Datos de demostración coherentes con el diseño «Recortes».
 * Usuaria principal: Nora Vidal (nora@portfol.io / portfolio123).
 * Organización: Galería Alcaná (alcana@portfol.io) y su comisaria Elena Sáez (elena@portfol.io).
 */
import { PrismaClient, Prisma, Role, ApplicationStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import sharp from 'sharp';
import { rmSync } from 'fs';
import { StorageService } from '../src/uploads/storage.service';
import { config } from '../src/config';
import { paintingSvg } from './art';

const prisma = new PrismaClient();
const storage = new StorageService();
const DAY = 86_400_000;
const now = Date.now();
const ago = (d: number, h = 0) => new Date(now - d * DAY - h * 3_600_000);
const inDays = (d: number) => new Date(now + d * DAY);
const PASSWORD = 'portfolio123';

const C = {
  malaga: { city: 'Málaga', lat: 36.7213, lng: -4.4214 },
  granada: { city: 'Granada', lat: 37.1773, lng: -3.5986 },
  jaen: { city: 'Jaén', lat: 37.7796, lng: -3.7849 },
  sevilla: { city: 'Sevilla', lat: 37.3891, lng: -5.9845 },
  cordoba: { city: 'Córdoba', lat: 37.8882, lng: -4.7794 },
  almeria: { city: 'Almería', lat: 36.834, lng: -2.4637 },
  cadiz: { city: 'Cádiz', lat: 36.5271, lng: -6.2886 },
  madrid: { city: 'Madrid', lat: 40.4168, lng: -3.7038 },
  ubeda: { city: 'Úbeda', lat: 38.0133, lng: -3.3705 },
  monachil: { city: 'Monachil', lat: 37.133, lng: -3.536 },
  huelva: { city: 'Huelva', lat: 37.2614, lng: -6.9447 },
  valencia: { city: 'Valencia', lat: 39.4699, lng: -0.3763 },
  barcelona: { city: 'Barcelona', lat: 41.3874, lng: 2.1686 },
  bilbao: { city: 'Bilbao', lat: 43.263, lng: -2.935 },
};
type Place = (typeof C)[keyof typeof C];

let hash = '';
async function user(d: {
  name: string; handle: string; email?: string; role?: Role; headline?: string; bio?: string; place?: Place;
  techniques?: string[]; themes?: string[]; acceptsCommissions?: boolean; verified?: boolean; career?: object[];
  since?: number; address?: string; openingHours?: string; createdAt?: Date;
}) {
  return prisma.user.create({
    data: {
      name: d.name, handle: d.handle, email: d.email ?? `${d.handle}@portfol.io`, passwordHash: hash, role: d.role ?? 'artista',
      headline: d.headline, bio: d.bio, city: d.place?.city, lat: d.place?.lat, lng: d.place?.lng, country: 'ES',
      techniques: d.techniques ?? [], themes: d.themes ?? [], acceptsCommissions: d.acceptsCommissions ?? false,
      verified: d.verified ?? false, onboarded: true, career: (d.career ?? []) as Prisma.InputJsonValue,
      since: d.since, address: d.address, openingHours: d.openingHours, createdAt: d.createdAt ?? ago(400),
    },
  });
}

async function image(title: string, w: number, h: number, palette?: number) {
  const png = await sharp(Buffer.from(paintingSvg(title, w, h, palette))).png().toBuffer();
  const r = await storage.saveImage(png, 'img');
  return { key: r.key, width: r.width, height: r.height, color: r.color };
}

async function artwork(artistId: string, d: {
  title: string; technique: string; w: number; h: number; year: number; status?: 'exposicion' | 'privada' | 'proceso';
  note?: string; annotation?: string; themes?: string[]; seriesId?: string; pos?: number; daysAgo: number; palette?: number; draft?: boolean;
}) {
  const img = await image(d.title, d.w, d.h, d.palette);
  return prisma.artwork.create({
    data: {
      artistId, title: d.title, technique: d.technique, widthCm: d.w, heightCm: d.h, year: d.year, status: d.status ?? 'exposicion',
      note: d.note, annotation: d.annotation, themes: d.themes ?? [], seriesId: d.seriesId, seriesPosition: d.pos,
      draft: d.draft ?? false, publishedAt: d.draft ? null : ago(d.daysAgo, 2), createdAt: ago(d.daysAgo, 3),
      images: { create: [{ ...img, order: 0 }] },
    },
  });
}

async function connect(a: string, b: string, status: 'aceptada' | 'pendiente' = 'aceptada', daysAgo = 60) {
  await prisma.connection.create({ data: { requesterId: a, receiverId: b, status, createdAt: ago(daysAgo), respondedAt: status === 'aceptada' ? ago(daysAgo - 1) : null } });
}

async function conversation(a: string, b: string, msgs: { from: string; text: string; at: Date; artworkId?: string }[], opts: { callId?: string; applicationId?: string; readA?: Date; readB?: Date } = {}) {
  const c = await prisma.conversation.create({
    data: {
      callId: opts.callId, applicationId: opts.applicationId, createdAt: msgs[0].at, updatedAt: msgs[msgs.length - 1].at,
      participants: { create: [{ userId: a, lastReadAt: opts.readA ?? msgs[msgs.length - 1].at }, { userId: b, lastReadAt: opts.readB ?? msgs[msgs.length - 1].at }] },
    },
  });
  for (const m of msgs) await prisma.message.create({ data: { conversationId: c.id, authorId: m.from, text: m.text, sentAt: m.at, artworkId: m.artworkId } });
  return c;
}

async function main() {
  console.log('Limpiando base de datos y ficheros…');
  await prisma.$executeRawUnsafe(`TRUNCATE "User", "Series", "Artwork", "Call", "Conversation", "Report" RESTART IDENTITY CASCADE`);
  rmSync(`${config.uploadDir}/public`, { recursive: true, force: true });
  rmSync(`${config.uploadDir}/private`, { recursive: true, force: true });
  const s2 = new StorageService();
  Object.assign(storage, s2);
  hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  console.log('Usuarios y organizaciones…');
  const nora = await user({
    name: 'Nora Vidal', handle: 'noravidal', email: 'nora@portfol.io', headline: 'Pintora · acrílico y collage', place: C.malaga,
    bio: 'Trabajo el interior doméstico como paisaje: ventanas, plantas y luz de tarde recortadas en planos de color. Taller en el Soho de Málaga.',
    techniques: ['acrilico', 'collage'], themes: ['interior', 'figuracion', 'bodegon'], acceptsCommissions: true,
    career: [
      { year: 2026, text: 'Muestra individual «Casa abierta», Centro Cultural La Atalaya (Málaga)' },
      { year: 2025, text: 'Residencia de verano en La Térmica, Málaga' },
      { year: 2024, text: 'Mención de honor, Certamen Joven de Pintura de Andalucía' },
      { year: 2021, text: 'Grado en Bellas Artes, Universidad de Granada' },
    ],
  });
  const lucia = await user({
    name: 'Lucía Montero', handle: 'luciamontero', headline: 'Pintora figurativa · óleo y acuarela', place: C.granada,
    bio: 'Pinto el litoral de Granada reducido a franjas de color. Represento la hora, no el lugar.',
    techniques: ['oleo', 'acuarela'], themes: ['mar', 'paisaje', 'figuracion'], acceptsCommissions: true,
    career: [
      { year: 2026, text: '«Mareas», Galería Alcaná (Granada)' },
      { year: 2024, text: 'Premio Adquisición, Bienal de Pintura de Motril' },
      { year: 2019, text: 'Máster en Producción Artística, Universidad de Granada' },
    ],
  });
  const martin = await user({ name: 'Martín Ibarra', handle: 'martinibarra', headline: 'Pintor · óleo y temple', place: C.granada, techniques: ['oleo', 'temple'], themes: ['retrato', 'figuracion'] });
  const sara = await user({ name: 'Sara Molina', handle: 'saramolina', headline: 'Acuarelista · paisaje urbano', place: C.sevilla, techniques: ['acuarela', 'dibujo'], themes: ['urbano', 'paisaje'], acceptsCommissions: true });
  const pablo = await user({ name: 'Pablo Ruiz', handle: 'pabloruiz', headline: 'Pintura abstracta · técnica mixta', place: C.cordoba, techniques: ['tecnica_mixta', 'acrilico'], themes: ['abstraccion'] });
  const carmen = await user({ name: 'Carmen Ortega', handle: 'carmenortega', headline: 'Grabadora y pintora', place: C.almeria, techniques: ['grabado', 'acrilico'], themes: ['naturaleza', 'abstraccion'] });
  const irene = await user({ name: 'Irene Castillo', handle: 'irenecastillo', headline: 'Acuarela y gouache · bodegón', place: C.jaen, techniques: ['acuarela', 'gouache'], themes: ['bodegon', 'interior'], acceptsCommissions: true });
  const javier = await user({ name: 'Javier Soto', handle: 'javiersoto', headline: 'Pintor · collage y acrílico', place: C.cadiz, techniques: ['collage', 'acrilico'], themes: ['mar', 'urbano'] });
  const andres = await user({ name: 'Andrés Lozano', handle: 'andreslozano', role: 'coleccionista', headline: 'Coleccionista de pintura contemporánea', place: C.madrid });
  const elena = await user({ name: 'Elena Sáez', handle: 'elenasaez', email: 'elena@portfol.io', role: 'galeria', headline: 'Comisaria en Galería Alcaná', place: C.granada, verified: true });
  const alcana = await user({
    name: 'Galería Alcaná', handle: 'galeriaalcana', email: 'alcana@portfol.io', role: 'galeria', place: C.granada, verified: true,
    headline: 'Galería · desde 1998', since: 1998, address: 'calle Elvira 48, Granada', openingHours: 'de martes a sábado',
    bio: 'Pintura figurativa contemporánea del sur. Representamos a 14 artistas y abrimos dos convocatorias al año.',
  });
  const olivar = await user({
    name: 'Fundación Olivar', handle: 'fundacionolivar', role: 'institucion', place: C.jaen, verified: true, headline: 'Fundación cultural · Jaén',
    since: 2004, address: 'plaza de Santa María 3, Jaén', bio: 'Fomentamos la creación contemporánea en Andalucía oriental. Convocamos el Premio de Pintura «Olivar».',
  });
  const atalaya = await user({ name: 'Centro Cultural La Atalaya', handle: 'laatalaya', role: 'institucion', place: C.malaga, verified: true, headline: 'Centro cultural municipal · Málaga', address: 'calle Alcazabilla 2, Málaga' });
  const cumbres = await user({ name: 'Casa-Taller Las Cumbres', handle: 'lascumbres', role: 'institucion', place: C.monachil, verified: true, headline: 'Residencia artística · Sierra Nevada' });
  const ubeda = await user({ name: 'Ayuntamiento de Úbeda', handle: 'ubedacultura', role: 'institucion', place: C.ubeda, verified: true, headline: 'Área de Cultura' });
  const otherOrgs = await Promise.all([
    user({ name: 'Sala Marte', handle: 'salamarte', role: 'galeria', place: C.sevilla, verified: true, headline: 'Galería · Sevilla' }),
    user({ name: 'Fundación Mar de Plata', handle: 'mardeplata', role: 'institucion', place: C.cadiz, verified: true, headline: 'Fundación · Cádiz' }),
    user({ name: 'Espacio Norte', handle: 'espacionorte', role: 'galeria', place: C.bilbao, verified: true, headline: 'Galería · Bilbao' }),
    user({ name: 'Centro de Arte Levante', handle: 'artelevante', role: 'institucion', place: C.valencia, verified: true, headline: 'Centro de arte · Valencia' }),
    user({ name: 'Galería Pliegue', handle: 'galeriapliegue', role: 'galeria', place: C.barcelona, verified: false, headline: 'Galería · Barcelona (pendiente de verificar)' }),
  ]);
  await prisma.user.create({ data: { name: 'Administración', handle: 'admin', email: 'admin@portfol.io', passwordHash: hash, role: 'admin', onboarded: true } });
  await prisma.orgMember.create({ data: { orgId: alcana.id, userId: elena.id, role: 'admin' } });
  for (const a of [lucia, martin, sara]) await prisma.orgArtist.create({ data: { orgId: alcana.id, artistId: a.id } });

  // Comunidad amplia para que la plataforma tenga actividad (valoraciones, visitas, sugerencias)
  const first = ['Ana', 'Marta', 'Laura', 'Paula', 'Clara', 'Rocío', 'Inés', 'Alba', 'Julia', 'Celia', 'Hugo', 'Diego', 'Álvaro', 'Rubén', 'Óscar', 'Raúl', 'Teresa', 'Pilar', 'Noelia', 'Gonzalo', 'Mario', 'Lola', 'Adela', 'Blanca', 'Ramón', 'Tomás', 'Elisa', 'Sofía', 'Daniel', 'Victoria'];
  const last = ['García', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Gil', 'Vázquez', 'Serrano', 'Ramos', 'Blanco', 'Suárez', 'Molina', 'Morales', 'Ortiz', 'Delgado', 'Castro', 'Rubio', 'Marín', 'Sanz', 'Iglesias'];
  const places = Object.values(C);
  const techs = ['oleo', 'acrilico', 'acuarela', 'gouache', 'collage', 'tecnica_mixta', 'grabado', 'dibujo', 'pastel'];
  const community = [];
  for (let i = 0; i < 48; i++) {
    const name = `${first[i % first.length]} ${last[(i * 7) % last.length]}`;
    const role: Role = i % 6 === 0 ? 'coleccionista' : 'artista';
    community.push(await user({
      name, handle: `${name.split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}${last[(i * 7) % last.length].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}${i}`,
      role, place: places[i % places.length], headline: role === 'artista' ? `Pintora · ${techs[i % techs.length].replace('_', ' ')}` : 'Coleccionista',
      techniques: role === 'artista' ? [techs[i % techs.length], techs[(i + 3) % techs.length]] : [],
      themes: role === 'artista' ? [['paisaje', 'retrato', 'abstraccion', 'figuracion', 'urbano'][i % 5]] : [],
      createdAt: ago(300 - i),
    }));
  }

  console.log('Series y obras (generando imágenes)…');
  const casa = await prisma.series.create({ data: { artistId: nora.id, title: 'Casa abierta', description: 'Interiores domésticos como paisaje.', createdAt: ago(200) } });
  const nInterior = await artwork(nora.id, { title: 'Interior con ventana', technique: 'acrilico', w: 81, h: 100, year: 2025, seriesId: casa.id, pos: 1, daysAgo: 40, themes: ['interior'], note: 'La ventana del taller a las seis de la tarde, cuando la luz entra plana y todo se vuelve recorte.', annotation: 'mi favorita' });
  const nLimonero = await artwork(nora.id, { title: 'Limonero', technique: 'acrilico', w: 60, h: 73, year: 2025, seriesId: casa.id, pos: 2, daysAgo: 25, themes: ['naturaleza', 'interior'], note: 'El limonero del patio de mi abuela, en Coín.', annotation: '¡recién terminado!' });
  const nPersiana = await artwork(nora.id, { title: 'Persiana', technique: 'collage', w: 50, h: 50, year: 2026, seriesId: casa.id, pos: 3, daysAgo: 12, themes: ['interior', 'abstraccion'], note: 'Papel pintado a mano y acrílico sobre tabla.' });
  const nBanista = await artwork(nora.id, { title: 'Bañista', technique: 'acrilico', w: 73, h: 92, year: 2026, daysAgo: 4, themes: ['figuracion', 'cuerpo'], note: 'Primera figura en mucho tiempo. Quería que fuese solo una silueta.', annotation: 'nueva etapa' });
  await artwork(nora.id, { title: 'Mesa de verano', technique: 'acrilico', w: 65, h: 54, year: 2024, daysAgo: 160, themes: ['bodegon'], palette: 4, status: 'privada' });
  await artwork(nora.id, { title: 'Estudio para «Patio»', technique: 'collage', w: 30, h: 40, year: 2026, daysAgo: 0, themes: ['interior'], draft: true, status: 'proceso' });

  const mareas = await prisma.series.create({ data: { artistId: lucia.id, title: 'Mareas', description: 'Doce vistas de la costa de Almuñécar a distintas horas.', createdAt: ago(240) } });
  const mareasTitles = ['Marea alta', 'Bajamar', 'Poniente', 'Marea ocre', 'Levante', 'Marea verde', 'Las cinco', 'Resaca'];
  const mareasArt = [];
  for (let i = 0; i < mareasTitles.length; i++) {
    const t = mareasTitles[i];
    mareasArt.push(await artwork(lucia.id, {
      title: t, technique: i % 3 === 2 ? 'acuarela' : 'oleo', w: 100, h: 81, year: 2025, seriesId: mareas.id, pos: i + 1,
      daysAgo: t === 'Marea ocre' ? 0 : 90 - i * 8, palette: 0, themes: ['mar', 'paisaje'],
      note: t === 'Marea ocre' ? 'La luz de las cinco de la tarde sobre la playa de Almuñécar, reducida a tres franjas de color.' : undefined,
      annotation: t === 'Marea ocre' ? '¡recién salida del taller!' : undefined,
    }));
  }
  const marea = mareasArt[3];
  // texto del post del muro
  await prisma.artwork.update({ where: { id: marea.id }, data: { note: 'La luz de las cinco de la tarde sobre la playa de Almuñécar, reducida a tres franjas de color. Cierro la serie «Mareas» antes de la muestra de otoño en Sala Alcaná.' } });

  const others: [typeof martin, string, string, number, number, number][] = [
    [martin, 'Retrato de Celia', 'oleo', 46, 55, 2], [martin, 'El sastre', 'temple', 60, 80, 4], [martin, 'Autorretrato con gorra', 'oleo', 38, 46, 5],
    [sara, 'Alameda, lluvia', 'acuarela', 31, 41, 3], [sara, 'Triana a mediodía', 'acuarela', 56, 38, 3], [sara, 'Azotea', 'dibujo', 29, 42, 2],
    [pablo, 'Campo de fuerzas', 'tecnica_mixta', 146, 114, 1], [pablo, 'Sin título (azul)', 'acrilico', 100, 100, 1], [pablo, 'Partitura', 'tecnica_mixta', 130, 97, 5],
    [carmen, 'Chumberas', 'grabado', 40, 50, 2], [carmen, 'Cabo de Gata I', 'acrilico', 81, 65, 6],
    [irene, 'Granadas', 'acuarela', 30, 40, 4], [irene, 'Mesa con loza', 'gouache', 42, 30, 4], [irene, 'Membrillos', 'acuarela', 36, 26, 4],
    [javier, 'Bahía en recortes', 'collage', 70, 50, 1], [javier, 'La Caleta', 'acrilico', 92, 73, 3],
  ];
  const otherArt = [];
  let d = 1;
  for (const [u, title, technique, w, h, pal] of others) {
    otherArt.push(await artwork(u.id, { title, technique, w, h, year: 2025 + (d % 2), daysAgo: d * 3, palette: pal, themes: u.themes.slice(0, 1) }));
    d++;
  }
  // Algunas obras de la comunidad
  const communityArt = [];
  for (let i = 0; i < 16; i++) {
    const u = community[i * 2 + 1];
    if (u.role !== 'artista') continue;
    communityArt.push(await artwork(u.id, { title: ['Huerto', 'Tarde en el puerto', 'Figura sentada', 'Cosecha', 'Ventanal', 'Noche de feria', 'Lavanderas', 'Patio azul'][i % 8] + (i > 7 ? ' II' : ''), technique: u.techniques[0], w: 60 + (i % 4) * 15, h: 50 + (i % 3) * 20, year: 2025, daysAgo: 10 + i * 5, palette: i % 7, themes: u.themes }));
  }

  console.log('Valoraciones, comentarios y guardados…');
  const likers = [...community, martin, sara, pablo, carmen, irene, javier, andres, elena];
  async function likes(artId: string, n: number) {
    for (const u of likers.slice(0, Math.min(n, likers.length))) await prisma.like.create({ data: { userId: u.id, artworkId: artId, createdAt: ago(Math.random() * 20) } });
  }
  await likes(marea.id, 54);
  await likes(nLimonero.id, 32);
  await likes(nInterior.id, 27);
  await likes(nPersiana.id, 15);
  await likes(nBanista.id, 9);
  for (const a of [...mareasArt.slice(0, 3), ...otherArt]) await likes(a.id, 3 + Math.floor(Math.random() * 20));
  await prisma.like.create({ data: { userId: nora.id, artworkId: mareasArt[0].id } });
  const comments = [
    [marea.id, martin.id, 'Esa franja clara del centro es la hora exacta. Enorme.'], [marea.id, sara.id, '¡Qué ganas de ver la serie completa en Alcaná!'],
    [marea.id, nora.id, 'La tercera franja me recuerda a Rothko pero con sal.'], [nLimonero.id, lucia.id, 'Me encanta cómo resuelves las hojas con un solo trazo.'],
    [nLimonero.id, irene.id, 'Ese amarillo…'], [nBanista.id, elena.id, 'Nora, ¿la tendrás terminada para enero? Me interesa para la colectiva.'],
  ] as const;
  for (const [artworkId, authorId, text] of comments) await prisma.comment.create({ data: { artworkId, authorId, text, createdAt: ago(Math.random() * 3) } });
  for (const u of [andres, elena, ...community.slice(0, 18)]) await prisma.save.create({ data: { userId: u.id, artworkId: nLimonero.id, createdAt: ago(Math.random() * 25) } });
  for (const u of community.slice(0, 9)) await prisma.save.create({ data: { userId: u.id, artworkId: nInterior.id, createdAt: ago(Math.random() * 25) } });
  await prisma.save.create({ data: { userId: nora.id, artworkId: marea.id } });

  console.log('Red de contactos…');
  for (const u of [lucia, martin, elena, javier, irene, carmen, alcana, atalaya]) await connect(nora.id, u.id, 'aceptada', 30 + Math.floor(Math.random() * 200));
  for (const u of community.slice(0, 22)) await connect(u.id, nora.id, 'aceptada', 100);
  await connect(sara.id, nora.id, 'pendiente', 1);
  await connect(pablo.id, nora.id, 'pendiente', 2);
  await connect(community[30].id, nora.id, 'pendiente', 3);
  for (const u of [martin, sara, elena, alcana, irene]) await connect(lucia.id, u.id, 'aceptada', 120);
  for (const u of community.slice(10, 30)) await connect(u.id, lucia.id, 'aceptada', 150);
  await connect(martin.id, sara.id); await connect(pablo.id, carmen.id); await connect(elena.id, martin.id); await connect(javier.id, carmen.id);
  await connect(irene.id, community[40].id); await connect(irene.id, community[41].id);
  for (const u of [alcana, olivar, atalaya, lucia]) await prisma.follow.create({ data: { followerId: nora.id, followeeId: u.id } });
  for (const u of [andres, ...community.slice(0, 12)]) await prisma.follow.create({ data: { followerId: u.id, followeeId: nora.id } });
  for (const [e, t] of [[lucia, 'collage'], [martin, 'collage'], [javier, 'collage'], [irene, 'acrilico'], [elena, 'acrilico']] as const) {
    await prisma.endorsement.create({ data: { endorserId: e.id, userId: nora.id, technique: t } });
  }
  await prisma.endorsement.create({ data: { endorserId: nora.id, userId: lucia.id, technique: 'oleo' } });

  console.log('Convocatorias…');
  const call = (orgId: string, place: Place, d: Omit<Prisma.CallUncheckedCreateInput, 'orgId'>) =>
    prisma.call.create({ data: { ...d, orgId, city: d.city ?? place.city, lat: place.lat, lng: place.lng, country: 'ES' } });
  const premioOlivar = await call(olivar.id, C.jaen, {
    type: 'premio', title: 'Premio de Pintura «Olivar»', edition: 'XII edición', prize: '6.000 €', closesAt: inDays(27), scope: 'nacional',
    summary: 'Premio de adquisición para pintura figurativa contemporánea. La obra ganadora pasa a la colección de la Fundación.',
    basesUrl: 'https://example.org/bases-premio-olivar.pdf', techniques: ['acrilico', 'oleo', 'collage'], themes: ['figuracion', 'interior'],
    maxArtworks: 3, maxFormatCm: 150, minYear: 2024,
    requirements: ['Hasta 3 obras realizadas a partir de 2024', 'Carta de presentación (máx. 300 palabras)', 'CV artístico y dossier en PDF'],
    timeline: [{ date: inDays(27).toISOString().slice(0, 10), text: 'Cierre de solicitudes' }, { date: inDays(63).toISOString().slice(0, 10), text: 'Fallo del jurado' }, { date: 'marzo', text: 'Exposición de las obras seleccionadas' }],
    createdAt: ago(20),
  });
  const nuevosRealismos = await call(alcana.id, C.granada, {
    type: 'exposicion', title: '«Nuevos realismos»', places: 8, closesAt: inDays(12), scope: 'regional',
    summary: 'Exposición colectiva de pintura figurativa joven del sur. Inauguración en febrero en Galería Alcaná.',
    techniques: ['oleo', 'acrilico', 'temple'], themes: ['figuracion', 'retrato', 'interior'], maxArtworks: 3, maxFormatCm: 120,
    requirements: ['Hasta 3 obras disponibles para exposición', 'Carta de presentación', 'CV artístico'], requiresDossier: false,
    timeline: [{ date: inDays(12).toISOString().slice(0, 10), text: 'Cierre de solicitudes' }, { date: 'enero', text: 'Selección' }, { date: 'febrero', text: 'Inauguración' }],
    createdAt: ago(25),
  });
  const residencia = await call(cumbres.id, C.monachil, {
    type: 'residencia', title: 'Residencia Casa-Taller Las Cumbres', prize: 'alojamiento y taller', places: 4, closesAt: inDays(52), scope: 'nacional', city: 'Sierra Nevada',
    summary: 'Cuatro semanas de residencia en la montaña con taller propio y visitas de comisarios.', techniques: [], themes: ['paisaje', 'naturaleza'],
    maxArtworks: 5, requirements: ['Hasta 5 obras recientes', 'Proyecto para la residencia (en la carta)', 'CV y dossier'], timeline: [{ date: inDays(52).toISOString().slice(0, 10), text: 'Cierre' }, { date: 'abril', text: 'Inicio de la residencia' }],
    createdAt: ago(15),
  });
  const extra: [string, Place, Prisma.CallUncheckedCreateInput['type'], string, number, string | null, string[], string[], 'local' | 'regional' | 'nacional' | 'internacional'][] = [
    [otherOrgs[0].id, C.sevilla, 'exposicion', 'Colectiva «Luz de patio»', 18, null, ['acuarela', 'acrilico'], ['interior', 'urbano'], 'regional'],
    [otherOrgs[1].id, C.cadiz, 'beca', 'Beca de creación Mar de Plata', 35, '4.000 €', [], ['mar', 'paisaje'], 'nacional'],
    [otherOrgs[2].id, C.bilbao, 'exposicion', 'Open call «Superficies»', 40, null, ['tecnica_mixta', 'collage'], ['abstraccion'], 'nacional'],
    [otherOrgs[3].id, C.valencia, 'premio', 'Premio Levante de Acuarela', 22, '3.000 €', ['acuarela'], [], 'nacional'],
    [atalaya.id, C.malaga, 'exposicion', 'Muros abiertos 2027', 30, null, ['acrilico', 'collage'], ['urbano', 'figuracion'], 'local'],
    [olivar.id, C.jaen, 'beca', 'Beca Olivar de producción', 45, '2.500 €', ['oleo', 'acrilico'], [], 'regional'],
    [otherOrgs[0].id, C.sevilla, 'feria', 'Feria de Arte Joven de Sevilla', 25, 'stand gratuito', [], [], 'regional'],
    [otherOrgs[3].id, C.valencia, 'residencia', 'Residencia Levante–Lisboa', 60, 'bolsa de 1.500 €', [], [], 'internacional'],
    [ubeda.id, C.ubeda, 'premio', 'Certamen Ciudad de Úbeda 2027', 70, '2.000 €', ['oleo', 'acrilico', 'acuarela'], ['paisaje'], 'nacional'],
    [otherOrgs[1].id, C.cadiz, 'exposicion', 'Retratos del Sur', 16, null, ['oleo', 'temple'], ['retrato'], 'regional'],
    [alcana.id, C.granada, 'exposicion', 'Pequeño formato · invierno', 33, null, [], [], 'regional'],
  ];
  for (const [orgId, place, type, title, days, prize, techniques, themes, scope] of extra) {
    await call(orgId, place, {
      type, title, closesAt: inDays(days), prize, techniques, themes, scope, maxArtworks: 3, maxFormatCm: type === 'exposicion' ? 120 : null,
      requirements: ['Hasta 3 obras', 'Carta de presentación', 'CV artístico'], requiresDossier: false,
      timeline: [{ date: inDays(days).toISOString().slice(0, 10), text: 'Cierre de solicitudes' }], createdAt: ago(10),
    });
  }
  const casaAbiertaCall = await call(atalaya.id, C.malaga, {
    type: 'exposicion', title: 'Muestra individual «Casa abierta»', closesAt: ago(90), status: 'resuelta', scope: 'local',
    summary: 'Programa de muestras individuales para artistas de Málaga.', requirements: ['Proyecto expositivo'], createdAt: ago(150),
  });
  const ubedaOld = await call(ubeda.id, C.ubeda, {
    type: 'premio', title: 'Certamen Ciudad de Úbeda', edition: '2026', prize: '2.000 €', closesAt: ago(50), status: 'resuelta', scope: 'nacional', createdAt: ago(120),
  });
  await prisma.call.create({ data: { orgId: alcana.id, type: 'exposicion', title: 'Dibujo contemporáneo (borrador)', closesAt: inDays(90), scope: 'regional', status: 'borrador', city: 'Granada', lat: C.granada.lat, lng: C.granada.lng } });

  console.log('Solicitudes…');
  const hist = (...items: [ApplicationStatus, Date, string, string?][]) =>
    items.map(([status, at, by, note]) => ({ status, at: at.toISOString(), by, ...(note ? { note } : {}) })) as Prisma.InputJsonValue;
  const pdf = (title: string) => Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${title.length + 40}>>stream
BT /F1 24 Tf 60 760 Td (${title}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`);
  const cv = await storage.saveDocument(pdf('CV artistico - Nora Vidal'), 'CV_artistico_NoraVidal.pdf');
  const dossier = await storage.saveDocument(pdf('Dossier 2026 - Nora Vidal'), 'Dossier_2026.pdf');
  const docs = [{ kind: 'cv', ...cv }, { kind: 'dossier', ...dossier }];
  async function application(callId: string, artistId: string, status: ApplicationStatus, arts: string[], d: { letter?: string; submitted?: Date; history?: Prisma.InputJsonValue; feedback?: string; match?: number; docs?: object[] }) {
    return prisma.application.create({
      data: {
        callId, artistId, status, letter: d.letter ?? '', submittedAt: d.submitted, history: d.history ?? [], feedback: d.feedback, match: d.match,
        documents: (d.docs ?? docs) as Prisma.InputJsonValue, updatedAt: d.submitted ?? new Date(),
        artworks: { create: arts.map((artworkId, order) => ({ artworkId, order })) },
      },
    });
  }
  const letter = 'Trabajo el interior doméstico como paisaje: ventanas, plantas y luz de tarde recortadas en planos de color. Presento tres piezas de la serie «Casa abierta» (2025).';
  await application(premioOlivar.id, nora.id, 'enviada', [nInterior.id, nLimonero.id], { letter, submitted: ago(0, 3), match: 86, history: hist(['enviada', ago(0, 3), nora.id]) });
  const appNR = await application(nuevosRealismos.id, nora.id, 'en_revision', [nInterior.id, nLimonero.id, nPersiana.id], {
    letter, submitted: ago(8), match: 82, history: hist(['enviada', ago(8), nora.id], ['en_revision', ago(6), elena.id]),
  });
  await application(casaAbiertaCall.id, nora.id, 'aceptada', [nInterior.id, nLimonero.id, nPersiana.id], {
    letter: 'Propongo una muestra con la serie «Casa abierta».', submitted: ago(140), match: 91, feedback: 'Inaugura el 12 de febrero. ¡Enhorabuena!',
    history: hist(['enviada', ago(140), nora.id], ['en_revision', ago(120), atalaya.id], ['preseleccionada', ago(100), atalaya.id], ['aceptada', ago(80), atalaya.id]),
  });
  await application(residencia.id, nora.id, 'borrador', [nLimonero.id], { letter: 'Me gustaría investigar el paisaje de montaña desde el interior del taller…', docs: [] });
  await application(ubedaOld.id, nora.id, 'no_seleccionada', [nInterior.id], {
    letter, submitted: ago(60), match: 64, feedback: 'muy cerca, volved a presentaros',
    history: hist(['enviada', ago(60), nora.id], ['en_revision', ago(55), ubeda.id], ['no_seleccionada', ago(35), ubeda.id, 'muy cerca, volved a presentaros']),
  });
  // Candidaturas de otras artistas a «Nuevos realismos» para el panel de la galería
  const pool: [typeof martin, ApplicationStatus, number][] = [[martin, 'preseleccionada', 88], [sara, 'enviada', 61], [pablo, 'enviada', 47], [carmen, 'en_revision', 66], [irene, 'en_revision', 74], [javier, 'enviada', 79]];
  for (const [u, status, match] of pool) {
    const arts = [...otherArt.filter((a) => a.artistId === u.id)].slice(0, 3).map((a) => a.id);
    const h: [ApplicationStatus, Date, string][] = [['enviada', ago(9), u.id]];
    if (status !== 'enviada') h.push(['en_revision', ago(6), elena.id]);
    if (status === 'preseleccionada') h.push(['preseleccionada', ago(3), elena.id]);
    await application(nuevosRealismos.id, u.id, status, arts, { letter: `Hola, soy ${u.name}. ${u.headline}. Presento obra reciente que dialoga con el realismo contemporáneo.`, submitted: ago(9), match, history: hist(...h), docs: [{ kind: 'cv', ...(await storage.saveDocument(pdf(`CV - ${u.name}`), `CV_${u.handle}.pdf`)) }] });
  }
  for (let i = 0; i < 6; i++) {
    const u = community[i * 2 + 1];
    const art = communityArt.find((a) => a.artistId === u.id);
    if (!art) continue;
    await application(premioOlivar.id, u.id, 'enviada', [art.id], { letter: 'Presento mi obra más reciente.', submitted: ago(2 + i), match: 50 + i * 6, history: hist(['enviada', ago(2 + i), u.id]) });
  }

  console.log('Exposiciones…');
  const expo = await prisma.exhibition.create({
    data: { title: '«Mareas»', orgId: alcana.id, artistId: lucia.id, seriesId: mareas.id, startsAt: ago(20), endsAt: inDays(32), virtual: true },
  });
  for (const [i, a] of mareasArt.entries()) await prisma.exhibitionArtwork.create({ data: { exhibitionId: expo.id, artworkId: a.id, order: i } });
  const expoNora = await prisma.exhibition.create({ data: { title: '«Casa abierta»', orgId: atalaya.id, artistId: nora.id, seriesId: casa.id, startsAt: inDays(86), endsAt: inDays(140), virtual: false } });
  for (const [i, a] of [nInterior, nLimonero, nPersiana].entries()) await prisma.exhibitionArtwork.create({ data: { exhibitionId: expoNora.id, artworkId: a.id, order: i } });

  console.log('Conversaciones…');
  const today = (h: number, m: number) => { const x = new Date(); x.setHours(h, m, 0, 0); return x > new Date() ? ago(0, 1) : x; };
  await conversation(nora.id, lucia.id, [
    { from: lucia.id, text: '¡Hola Nora! He visto «Persiana» en tu perfil. ¿Te animarías a una muestra a dos en primavera?', at: ago(1, 5) },
    { from: nora.id, text: '¡Hola Lucía! Me encantaría. Tus mareas y mis interiores pueden dialogar muy bien.', at: ago(1, 4) },
    { from: nora.id, text: 'Te paso la obra que estaba pensando:', at: ago(1, 4), artworkId: nPersiana.id },
    { from: lucia.id, text: 'Es perfecta. Hablo con Elena en Alcaná.', at: today(10, 20) },
    { from: lucia.id, text: '¡Me encanta la idea! ¿Hablamos el jueves?', at: today(10, 31) },
  ], { readA: ago(1, 4) });
  await conversation(nora.id, elena.id, [
    { from: elena.id, text: 'Hola Nora, he recibido tu solicitud a «Nuevos realismos». ¿Podrías enviarme el dossier actualizado?', at: ago(3) },
    { from: nora.id, text: 'Claro, te lo adjunto en la solicitud y te lo mando también por aquí.', at: ago(2, 6) },
    { from: elena.id, text: 'Gracias por el dossier, lo reviso esta semana.', at: ago(1, 2) },
  ], { callId: nuevosRealismos.id, applicationId: appNR.id });
  await conversation(nora.id, alcana.id, [{ from: alcana.id, text: 'Recordatorio: «Nuevos realismos» cierra el día 30.', at: ago(2, 1) }], { callId: nuevosRealismos.id });
  await conversation(nora.id, martin.id, [
    { from: nora.id, text: '¿Vas a llevar obra a Granada para lo de Alcaná?', at: ago(6) },
    { from: martin.id, text: '¿Compartimos transporte de obra a Granada?', at: ago(6, -2) },
  ]);
  await conversation(nora.id, olivar.id, [
    { from: nora.id, text: 'Buenos días, ¿las obras deben estar enmarcadas para la preselección?', at: ago(9) },
    { from: olivar.id, text: 'Hemos recibido tu consulta sobre las bases.', at: ago(8) },
  ], { callId: premioOlivar.id });

  console.log('Avisos…');
  const notif = (userId: string, type: string, text: string, link: string | null, at: Date, actorId?: string, read = false) =>
    prisma.notification.create({ data: { userId, type, text, link, createdAt: at, actorId, read } });
  await notif(nora.id, 'convocatoria_encaje', 'Nueva convocatoria que encaja contigo: Premio de Pintura «Olivar» · 6.000 €', `call:${premioOlivar.id}`, ago(0, 1), olivar.id);
  await notif(nora.id, 'conexion_aceptada', 'Lucía Montero aceptó tu solicitud de conexión', 'user:luciamontero', ago(0, 3), lucia.id);
  await notif(nora.id, 'visita_perfil', 'Elena Sáez, comisaria en Galería Alcaná, ha visto tu perfil', 'user:elenasaez', ago(0, 5), elena.id);
  await notif(nora.id, 'valoraciones', 'Tu obra «Limonero» ha recibido 32 valoraciones', `artwork:${nLimonero.id}`, ago(2), undefined, true);
  await notif(nora.id, 'validacion_tecnica', '3 profesionales han validado tu técnica collage', 'user:noravidal', ago(3), undefined, true);
  await notif(nora.id, 'expo_abierta', 'Galería Alcaná ha abierto la sala virtual de «Mareas»', `series:${mareas.id}`, ago(4), alcana.id, true);
  await notif(nora.id, 'solicitud_estado', 'Tu solicitud a «Nuevos realismos» está en revisión', `application:${appNR.id}`, ago(6), alcana.id, true);

  console.log('Visitas y vistas para las estadísticas…');
  const roles: Role[] = ['artista', 'artista', 'artista', 'artista', 'artista', 'galeria', 'galeria', 'coleccionista', 'coleccionista', 'institucion'];
  const views: Prisma.ProfileViewCreateManyInput[] = [];
  for (let i = 0; i < 1400; i++) {
    // más visitas en las últimas semanas (+18 % este mes)
    const dAgo = Math.floor(Math.pow(Math.random(), 1.25) * 90);
    views.push({ userId: nora.id, viewerRole: roles[Math.floor(Math.random() * roles.length)], createdAt: ago(dAgo, Math.random() * 24) });
  }
  for (let i = 0; i < 900; i++) views.push({ userId: lucia.id, viewerRole: roles[i % roles.length], createdAt: ago(Math.random() * 90) });
  await prisma.profileView.createMany({ data: views });
  const aviews: Prisma.ArtworkViewCreateManyInput[] = [];
  for (const [a, n] of [[nLimonero, 1840], [nInterior, 1320], [nBanista, 880], [nPersiana, 410], [marea, 2100]] as const) {
    for (let i = 0; i < n; i++) aviews.push({ artworkId: a.id, createdAt: ago(Math.pow(Math.random(), 1.4) * 90) });
    await prisma.artwork.update({ where: { id: a.id }, data: { viewsCount: n } });
  }
  await prisma.artworkView.createMany({ data: aviews });

  console.log(`\nListo. Usuarios de prueba (contraseña «${PASSWORD}»):`);
  console.log('  nora@portfol.io      artista (usuaria principal de la app móvil)');
  console.log('  alcana@portfol.io    Galería Alcaná (panel web de organización)');
  console.log('  elena@portfol.io     Elena Sáez, comisaria de Alcaná');
  console.log('  admin@portfol.io     administración');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
