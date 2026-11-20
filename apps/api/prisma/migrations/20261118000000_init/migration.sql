-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('artista', 'galeria', 'coleccionista', 'institucion', 'admin');

-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('exposicion', 'privada', 'proceso');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('premio', 'exposicion', 'residencia', 'beca', 'feria');

-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('local', 'regional', 'nacional', 'internacional');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('borrador', 'abierta', 'cerrada', 'resuelta');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('borrador', 'enviada', 'en_revision', 'preseleccionada', 'aceptada', 'no_seleccionada', 'retirada');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('pendiente', 'aceptada', 'ignorada');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "appleId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'artista',
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "country" CHAR(2) DEFAULT 'ES',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "location" geography(Point,4326) GENERATED ALWAYS AS (CASE WHEN "lat" IS NOT NULL AND "lng" IS NOT NULL THEN ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography END) STORED,
    "techniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acceptsCommissions" BOOLEAN NOT NULL DEFAULT false,
    "openToCalls" BOOLEAN NOT NULL DEFAULT true,
    "career" JSONB NOT NULL DEFAULT '[]',
    "avatarKey" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "since" INTEGER,
    "address" TEXT,
    "openingHours" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "usedAt" TIMESTAMPTZ,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("orgId","userId")
);

-- CreateTable
CREATE TABLE "OrgArtist" (
    "orgId" UUID NOT NULL,
    "artistId" UUID NOT NULL,

    CONSTRAINT "OrgArtist_pkey" PRIMARY KEY ("orgId","artistId")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" UUID NOT NULL,
    "artistId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" UUID NOT NULL,
    "artistId" UUID NOT NULL,
    "seriesId" UUID,
    "seriesPosition" INTEGER,
    "title" VARCHAR(120) NOT NULL,
    "technique" TEXT NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "year" SMALLINT NOT NULL,
    "status" "ArtworkStatus" NOT NULL,
    "note" TEXT,
    "annotation" TEXT,
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "search" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('spanish', coalesce("title", '')), 'A') || setweight(to_tsvector('spanish', coalesce("technique", '')), 'B') || setweight(to_tsvector('spanish', coalesce("note", '')), 'C')) STORED,
    "publishedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkImage" (
    "id" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#E8DCC4',

    CONSTRAINT "ArtworkImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "userId" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("userId","artworkId")
);

-- CreateTable
CREATE TABLE "Save" (
    "userId" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Save_pkey" PRIMARY KEY ("userId","artworkId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" UUID NOT NULL,
    "followeeId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followeeId")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "receiverId" UUID NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMPTZ,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endorsement" (
    "endorserId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "technique" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Endorsement_pkey" PRIMARY KEY ("endorserId","userId","technique")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "type" "CallType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "edition" TEXT,
    "basesUrl" TEXT,
    "prize" TEXT,
    "places" INTEGER,
    "closesAt" TIMESTAMPTZ NOT NULL,
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" "Scope" NOT NULL,
    "city" TEXT,
    "country" CHAR(2) DEFAULT 'ES',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "techniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxArtworks" INTEGER NOT NULL DEFAULT 3,
    "maxFormatCm" INTEGER,
    "minYear" INTEGER,
    "requiresCv" BOOLEAN NOT NULL DEFAULT true,
    "requiresDossier" BOOLEAN NOT NULL DEFAULT true,
    "status" "CallStatus" NOT NULL DEFAULT 'abierta',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "callId" UUID NOT NULL,
    "artistId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'borrador',
    "match" SMALLINT,
    "letter" TEXT NOT NULL DEFAULT '',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "history" JSONB NOT NULL DEFAULT '[]',
    "feedback" TEXT,
    "submittedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationArtwork" (
    "applicationId" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApplicationArtwork_pkey" PRIMARY KEY ("applicationId","artworkId")
);

-- CreateTable
CREATE TABLE "Exhibition" (
    "id" UUID NOT NULL,
    "orgId" UUID,
    "artistId" UUID NOT NULL,
    "seriesId" UUID,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ,
    "endsAt" TIMESTAMPTZ,
    "virtual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exhibition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExhibitionArtwork" (
    "exhibitionId" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExhibitionArtwork_pkey" PRIMARY KEY ("exhibitionId","artworkId")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "callId" UUID,
    "applicationId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lastReadAt" TIMESTAMPTZ,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "artworkId" UUID,
    "sentAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMPTZ,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "actorId" UUID,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "link" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileView" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "viewerId" UUID,
    "viewerRole" "Role",
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkView" (
    "id" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "viewerId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtworkView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_family_idx" ON "RefreshToken"("family");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "Artwork_artistId_publishedAt_idx" ON "Artwork"("artistId", "publishedAt");

-- CreateIndex
CREATE INDEX "Artwork_publishedAt_idx" ON "Artwork"("publishedAt");

-- CreateIndex
CREATE INDEX "Connection_receiverId_status_idx" ON "Connection"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_requesterId_receiverId_key" ON "Connection"("requesterId", "receiverId");

-- CreateIndex
CREATE INDEX "Call_status_closesAt_idx" ON "Call"("status", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_callId_artistId_key" ON "Application"("callId", "artistId");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileView_userId_createdAt_idx" ON "ProfileView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ArtworkView_artworkId_createdAt_idx" ON "ArtworkView"("artworkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgArtist" ADD CONSTRAINT "OrgArtist_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgArtist" ADD CONSTRAINT "OrgArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkImage" ADD CONSTRAINT "ArtworkImage_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationArtwork" ADD CONSTRAINT "ApplicationArtwork_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationArtwork" ADD CONSTRAINT "ApplicationArtwork_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibition" ADD CONSTRAINT "Exhibition_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibition" ADD CONSTRAINT "Exhibition_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibition" ADD CONSTRAINT "Exhibition_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitionArtwork" ADD CONSTRAINT "ExhibitionArtwork_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitionArtwork" ADD CONSTRAINT "ExhibitionArtwork_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkView" ADD CONSTRAINT "ArtworkView_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Índices propios (Sección 6): distancia con PostGIS y texto completo en español
CREATE INDEX "User_location_gist" ON "User" USING GIST ("location");
CREATE INDEX "Artwork_search_gin" ON "Artwork" USING GIN ("search");
CREATE INDEX "User_name_trgm" ON "User" USING GIN ("name" gin_trgm_ops);
