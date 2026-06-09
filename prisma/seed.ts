import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database data...');

  // Enable PostGIS extension
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS extension enabled.');
  } catch (e) {
    console.error('Failed to enable PostGIS extension:', e);
  }

  // Create test user if not exists
  const testEmail = 'test@safet.com';
  let user = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        name: 'Sujit Kumar',
        email: testEmail,
        password: hashedPassword,
        notificationSettings: {
          create: {
            alertThreshold: 'MEDIUM',
            sosInactivitySecs: 60,
            nightModeEnabled: true,
          }
        }
      }
    });
    console.log('Test user created:', testEmail);
  } else {
    console.log('Test user already exists:', testEmail);
  }

  // Clear and seed Guardian connections
  await prisma.guardianConnection.deleteMany({ where: { userId: user.id } });
  await prisma.guardianConnection.createMany({
    data: [
      { userId: user.id, guardianName: 'Mom', guardianStatus: 'Online' },
      { userId: user.id, guardianName: 'Dad', guardianStatus: 'Online' },
      { userId: user.id, guardianName: 'Rohit (Roommate)', guardianStatus: 'Offline' }
    ]
  });
  console.log('Guardian connections seeded.');

  // Clear and seed Safe Anchors (Odisha region - Bhubaneswar and Sambalpur)
  await prisma.safeAnchor.deleteMany({});
  await prisma.safeAnchor.createMany({
    data: [
      // Bhubaneswar KIIT Area
      {
        name: 'KIIT Police Station',
        type: 'Police Station',
        distanceStr: '0.4 km',
        statusStr: '24/7 Active',
        latitude: 20.3524,
        longitude: 85.8189
      },
      {
        name: 'Pradyumna Bal Memorial Hospital',
        type: 'Hospital',
        distanceStr: '0.8 km',
        statusStr: '24/7 ER Open',
        latitude: 20.3552,
        longitude: 85.8174
      },
      {
        name: 'KIIT Square 24/7 Food Court',
        type: '24/7 Store',
        distanceStr: '0.3 km',
        statusStr: 'Always Open',
        latitude: 20.3535,
        longitude: 85.8202
      },
      // Sambalpur/Burla Area
      {
        name: 'VSSUT Police Outpost',
        type: 'Police Station',
        distanceStr: '0.5 km',
        statusStr: '24/7 Active',
        latitude: 21.4984,
        longitude: 83.8992
      },
      {
        name: 'VIMSAR Hospital Burla',
        type: 'Hospital',
        distanceStr: '1.2 km',
        statusStr: '24/7 ER Open',
        latitude: 21.4965,
        longitude: 83.8931
      }
    ]
  });
  console.log('Safe anchors seeded.');

  // Clear and seed Network Alerts
  await prisma.networkAlert.deleteMany({});
  await prisma.networkAlert.createMany({
    data: [
      {
        type: 'Alert',
        location: 'Patia, Bhubaneswar',
        description: 'Street light outage reported near Patia Station road. Avoid dark alleys.',
        isVerified: true
      },
      {
        type: 'Traffic',
        location: 'VSSUT Gate, Burla',
        description: 'Heavy congestion and protest march near VSSUT gate. Rerouting recommended.',
        isVerified: true
      },
      {
        type: 'Safety',
        location: 'Sambalpur Highway',
        description: 'Road repair work underway on NH 53. Speed limits enforced.',
        isVerified: false
      }
    ]
  });
  console.log('Network alerts seeded.');

  // Check history
  await prisma.checkHistory.deleteMany({ where: { userId: user.id } });
  await prisma.checkHistory.createMany({
    data: [
      {
        userId: user.id,
        location: 'KIIT Campus 3, Bhubaneswar',
        score: 88,
        status: 'Verified Safe'
      },
      {
        userId: user.id,
        location: 'Burla Market, Sambalpur',
        score: 62,
        status: 'Caution Advised'
      }
    ]
  });
  console.log('Check history seeded.');

  // Seed Incident Reports in bulk
  console.log('Seeding incident reports in bulk...');
  await prisma.incidentReport.deleteMany({});
  
  const incidentData: any[] = [];
  const types = ["Accident", "Mugging", "Hazard", "Poor Lighting", "Theft"];
  
  // 1. General random incidents across Odisha (200 points) - filtered to avoid our local route test coordinates
  for (let i = 0; i < 200; i++) {
    let lat = 20.0 + Math.random() * 2.0;
    let lng = 83.0 + Math.random() * 3.5;

    // Shift away if too close to Bhubaneswar corridor
    if (Math.abs(lat - 20.35) < 0.15 && Math.abs(lng - 85.82) < 0.15) {
      lng -= 0.5;
    }
    // Shift away if too close to Burla corridor
    if (Math.abs(lat - 21.49) < 0.15 && Math.abs(lng - 83.89) < 0.15) {
      lng += 0.5;
    }

    incidentData.push({
      type: types[Math.floor(Math.random() * types.length)],
      severity: Math.floor(Math.random() * 10) + 1,
      description: 'Simulated historic incident data for demo',
      latitude: lat,
      longitude: lng
    });
  }

  // 2. High density cluster specifically around Burla Center / Main Road (21.498, 83.895) - 50 points
  for (let i = 0; i < 50; i++) {
    incidentData.push({
      type: 'Mugging',
      severity: 9,
      description: 'Burla Center High-Risk Hotspot',
      latitude: 21.498 + (Math.random() - 0.5) * 0.005,
      longitude: 83.895 + (Math.random() - 0.5) * 0.005
    });
  }

  // 3. High density cluster specifically on direct road from KIIT to Patia (20.356, 85.826) - 50 points (Hotspot!)
  // This ensures the direct/fastest route is RED, while the alternate paths bypassing this point remain GREEN.
  for (let i = 0; i < 50; i++) {
    incidentData.push({
      type: 'Theft',
      severity: 9,
      description: 'Bhubaneswar Direct Route High-Risk Hotspot',
      latitude: 20.356 + (Math.random() - 0.5) * 0.004,
      longitude: 85.826 + (Math.random() - 0.5) * 0.004
    });
  }

  await prisma.incidentReport.createMany({
    data: incidentData
  });
  console.log(`Successfully seeded ${incidentData.length} incident reports!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
