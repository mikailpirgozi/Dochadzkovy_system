import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestAdmin() {
  try {
     
    console.log('🚀 Creating test admin user for dashboard...');

    // Check if test company exists
    let testCompany = await prisma.company.findUnique({
      where: { slug: 'test-firma' }
    });

    if (!testCompany) {
       
      console.log('📝 Creating test company...');
      testCompany = await prisma.company.create({
        data: {
          name: 'Test Firma',
          slug: 'test-firma',
          qrCode: 'TEST-QR-CODE-123',
          settings: {},
          geofence: {
            latitude: 48.1486,
            longitude: 17.1077,
            radius: 100
          }
        }
      });
       
      console.log('✅ Test company created:', testCompany.name);
    } else {
       
      console.log('✅ Test company already exists:', testCompany.name);
    }

    // Check if test admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        email: 'admin@test.sk',
        companyId: testCompany.id
      }
    });

    if (existingAdmin) {
       
      console.log('✅ Test admin already exists: admin@test.sk');
       
      console.log('📋 Login credentials:');
       
      console.log('   Company: test-firma');
       
      console.log('   Email: admin@test.sk');
       
      console.log('   Password: admin123');
       
      console.log('   Dashboard: http://localhost:3001');
      return;
    }

    // Create test admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await prisma.user.create({
      data: {
        email: 'admin@test.sk',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: 'COMPANY_ADMIN',
        companyId: testCompany.id,
        isActive: true
      }
    });

     
    console.log('✅ Test admin created successfully!');
     
    console.log('');
     
    console.log('📋 Login credentials:');
     
    console.log('   Company: test-firma');
     
    console.log('   Email: admin@test.sk');
     
    console.log('   Password: admin123');
     
    console.log('   Dashboard: http://localhost:3001');
     
    console.log('');

    // Create some test employees
     
    console.log('👥 Creating test employees...');
    
    const employees = [
      { firstName: 'Ján', lastName: 'Novák', email: 'jan.novak@test.sk' },
      { firstName: 'Mária', lastName: 'Svobodová', email: 'maria.svobodova@test.sk' },
      { firstName: 'Peter', lastName: 'Kováč', email: 'peter.kovac@test.sk' }
    ];

    for (const emp of employees) {
      const existingEmp = await prisma.user.findFirst({
        where: { email: emp.email, companyId: testCompany.id }
      });

      if (!existingEmp) {
        await prisma.user.create({
          data: {
            email: emp.email,
            password: hashedPassword, // Same password for testing
            firstName: emp.firstName,
            lastName: emp.lastName,
            role: 'EMPLOYEE',
            companyId: testCompany.id,
            isActive: true
          }
        });
         
        console.log(`   ✅ Created employee: ${emp.firstName} ${emp.lastName}`);
      }
    }

     
    console.log('');
     
    console.log('🎉 Test setup complete! You can now login to the dashboard.');

  } catch (error) {
     
    console.error('❌ Error creating test admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export { createTestAdmin };

// Run if called directly
createTestAdmin().catch(console.error);
