const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function grantEmailPermissions() {
  try {
    // Get the main admin user
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: 'admin@jvs.org.uk' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('Found admin user:', adminUser.email);
    
    // Parse current permissions
    const currentReadRights = adminUser.readRights ? JSON.parse(adminUser.readRights) : [];
    const currentWriteRights = adminUser.writeRights ? JSON.parse(adminUser.writeRights) : [];
    
    console.log('Current read permissions:', currentReadRights);
    console.log('Current write permissions:', currentWriteRights);
    
    // Add EmailManagement if not already present
    const updatedReadRights = currentReadRights.includes('EmailManagement') 
      ? currentReadRights 
      : [...currentReadRights, 'EmailManagement'];
      
    const updatedWriteRights = currentWriteRights.includes('EmailManagement')
      ? currentWriteRights
      : [...currentWriteRights, 'EmailManagement'];
    
    // Update the user with new permissions
    await prisma.adminUser.update({
      where: { email: 'admin@jvs.org.uk' },
      data: {
        readRights: JSON.stringify(updatedReadRights),
        writeRights: JSON.stringify(updatedWriteRights)
      }
    });
    
    console.log('\n✅ Successfully updated permissions!');
    console.log('New read permissions:', updatedReadRights);
    console.log('New write permissions:', updatedWriteRights);
    console.log('\nYou should now be able to access the email admin page at /admin/email');
    
  } catch (error) {
    console.error('Error granting permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

grantEmailPermissions();











