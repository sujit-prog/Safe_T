const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test IncidentReports for Route Safety Algorithm...");

  // clear old incidents
  await prisma.incidentReport.deleteMany({});
  
  // Odisha region (Bhubaneswar to Keonjhar corridor)
  const types = ["Accident", "Mugging", "Hazard", "Poor Lighting", "Theft"];
  let count = 0;
  
  for(let i = 0; i < 200; i++) {
    const lat = 20.0 + Math.random() * 2.0;    // Random between 20.0 and 22.0
    const lng = 83.0 + Math.random() * 3.5;    // Random between 83.0 and 86.5
    
    await prisma.incidentReport.create({
      data: {
        type: types[Math.floor(Math.random() * types.length)],
        severity: Math.floor(Math.random() * 10) + 1,
        description: "Simulated historic incident data for demo",
        latitude: lat,
        longitude: lng,
      }
    });
    count++;
  }

  // Add a very high density of incidents specifically around Burla to Sambalpur route
  for(let i = 0; i < 50; i++) {
    await prisma.incidentReport.create({
      data: {
        type: "Accident",
        severity: 9,
        description: "High Risk Area Cluster",
        latitude: 21.49 + Math.random() * 0.05,
        longitude: 83.85 + Math.random() * 0.1,
      }
    });
    count++;
  }

  console.log(`Successfully seeded ${count} incidents into the database!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
