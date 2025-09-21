import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
   
  console.log('🌱 Seeding database...');

  // Create test company
  const testCompany = await prisma.company.upsert({
    where: { slug: 'test-firma' },
    update: {},
    create: {
      name: 'Test Firma',
      slug: 'test-firma',
      qrCode: 'test-qr-code-123',
      settings: {},
      geofence: {
        latitude: 48.1486,
        longitude: 17.1077,
        radius: 100
      }
    }
  });

   
  console.log('✅ Test company created:', testCompany.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.sk' },
    update: {},
    create: {
      email: 'admin@test.sk',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Testovací',
      role: 'COMPANY_ADMIN',
      companyId: testCompany.id,
      isActive: true,
      settings: {},
      notificationSettings: {
        push: {
          geofence: true,
          break: true,
          shift: true,
          corrections: true,
          businessTrips: true
        },
        email: {
          geofence: true,
          break: false,
          shift: false,
          corrections: true,
          businessTrips: true
        }
      }
    }
  });

   
  console.log('✅ Admin user created:', adminUser.email);

  // Create test employee
  const employeePassword = await bcrypt.hash('admin123', 12);
  
  const employeeUser = await prisma.user.upsert({
    where: { email: 'jan.novak@test.sk' },
    update: {},
    create: {
      email: 'jan.novak@test.sk',
      password: employeePassword,
      firstName: 'Ján',
      lastName: 'Novák',
      role: 'EMPLOYEE',
      companyId: testCompany.id,
      isActive: true,
      settings: {},
      notificationSettings: {
        push: {
          geofence: true,
          break: true,
          shift: true,
          corrections: true,
          businessTrips: true
        },
        email: {
          geofence: false,
          break: false,
          shift: false,
          corrections: false,
          businessTrips: false
        }
      }
    }
  });

   
  console.log('✅ Test employee created:', employeeUser.email);

   
  console.log('🎉 Database seeded successfully!');
   
  console.log('');
   
  console.log('📋 Test credentials:');
   
  console.log('Company slug: test-firma');
   
  console.log('Admin: admin@test.sk / admin123');
   
  console.log('Employee: jan.novak@test.sk / admin123');
}

main()
  .catch((error: unknown) => {
     
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    return prisma.$disconnect();
  });
