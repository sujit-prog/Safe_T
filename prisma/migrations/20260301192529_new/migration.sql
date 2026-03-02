-- CreateTable
CREATE TABLE "CheckHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NetworkAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeAnchor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "distanceStr" TEXT NOT NULL,
    "statusStr" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafeAnchor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CheckHistory" ADD CONSTRAINT "CheckHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianConnection" ADD CONSTRAINT "GuardianConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
