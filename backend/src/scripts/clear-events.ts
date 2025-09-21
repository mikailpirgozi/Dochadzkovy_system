import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
   
  console.log('🧹 Clearing attendance events...');
  
  await prisma.attendanceEvent.deleteMany({});
  await prisma.locationLog.deleteMany({});
  
   
  console.log('✅ All attendance events and location logs cleared');
}

main()
  .catch((error: unknown) => {
     
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    return prisma.$disconnect();
  });
