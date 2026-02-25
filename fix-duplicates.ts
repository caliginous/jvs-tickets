import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicates() {
    console.log('🔧 Fixing duplicate emails...\n');

    try {
        // Get all users with duplicate email
        const duplicateUsers = await prisma.user.findMany({
            where: {
                email: 'dan@caliginous.com'
            },
            orderBy: {
                id: 'asc'
            }
        });

        console.log(`📧 Found ${duplicateUsers.length} users with email: dan@caliginous.com`);

        if (duplicateUsers.length <= 1) {
            console.log('✅ No duplicates to fix');
            return;
        }

        // Keep the first user (oldest by ID), delete the rest
        const usersToDelete = duplicateUsers.slice(1);

        console.log(`🗑️  Will delete ${usersToDelete.length} duplicate users, keeping user ID: ${duplicateUsers[0].id}`);

        // Delete duplicate users
        const deletePromises = usersToDelete.map(user =>
            prisma.user.delete({
                where: { id: user.id }
            })
        );

        await Promise.all(deletePromises);

        console.log('✅ Successfully removed duplicate users');

        // Verify the fix
        const remainingUsers = await prisma.user.findMany({
            where: {
                email: 'dan@caliginous.com'
            }
        });

        console.log(`📊 Remaining users with this email: ${remainingUsers.length}`);

    } catch (error) {
        console.error('❌ Error fixing duplicates:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDuplicates();
