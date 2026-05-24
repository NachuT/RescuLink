const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('../client_secret.json');

// The client_secret provided is an OAuth2 client, but for seeding we need a Service Account or to use ADC.
// Since I'm in the environment where I can run commands, I'll use firebase-admin with ADC if possible,
// or just use the CLI to add documents if there's a command for that.
// Actually, I'll use the firebase-tools firestore:data:import if I had a json, 
// but it's easier to just run a node script that uses ADC.

process.env.GOOGLE_CLOUD_PROJECT = 'synthesis-hack26svl-115';

initializeApp();

const db = getFirestore();

const volunteers = [
  { name: 'Paramedic Sarah', role: 'Paramedic', status: 'available', distance: 450, mapX: 45, mapY: 55, tasks: [], meshNeighbors: 3 },
  { name: 'Rescue Dave', role: 'Rescue Specialist', status: 'available', distance: 1200, mapX: 60, mapY: 40, tasks: [], meshNeighbors: 2 },
  { name: 'Lead Mike', role: 'Firefighter', status: 'available', distance: 800, mapX: 35, mapY: 65, tasks: [], meshNeighbors: 4 },
];

async function seed() {
  const batch = db.batch();
  volunteers.forEach(vol => {
    const ref = db.collection('volunteers').doc();
    batch.set(ref, vol);
  });
  await batch.commit();
  console.log('Seeded volunteers successfully');
}

seed().catch(console.error);
