import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicatesSafely() {
    console.log('🔧 Fixing duplicate emails safely...\n');

    try {
        // Get all users with duplicate email
        const duplicateUsers = await prisma.user.findMany({
            where: {
                email: 'dan@caliginous.com'
            },
            include: {
                orders: {
                    select: { id: true }
                }
            },
            orderBy: {
                id: 'asc'
            }
        });

        console.log(`📧 Found ${duplicateUsers.length} users with email: dan@caliginous.com`);

        duplicateUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. User ID: ${user.id} - Orders: ${user.orders.length}`);
        });

        if (duplicateUsers.length <= 1) {
            console.log('✅ No duplicates to fix');
            return;
        }

        // Keep the first user (oldest by ID), transfer orders from duplicates
        const mainUser = duplicateUsers[0];
        const usersToMerge = duplicateUsers.slice(1);

        console.log(`\n🎯 Keeping main user: ${mainUser.id}`);
        console.log(`📦 Transferring orders from ${usersToMerge.length} duplicate users`);

        // Transfer orders from each duplicate user to the main user
        for (const duplicateUser of usersToMerge) {
            if (duplicateUser.orders.length > 0) {
                console.log(`   Transferring ${duplicateUser.orders.length} orders from user ${duplicateUser.id}`);

                await prisma.order.updateMany({
                    where: {
                        userId: duplicateUser.id
                    },
                    data: {
                        userId: mainUser.id
                    }
                });
            }
        }

        // Now delete the duplicate users (their orders have been transferred)
        console.log(`\n🗑️  Deleting ${usersToMerge.length} duplicate users...`);

        for (const duplicateUser of usersToMerge) {
            await prisma.user.delete({
                where: { id: duplicateUser.id }
            });
            console.log(`   ✅ Deleted duplicate user: ${duplicateUser.id}`);
        }

        console.log('\n✅ Successfully fixed duplicate users');

        // Verify the fix
        const remainingUsers = await prisma.user.findMany({
            where: {
                email: 'dan@caliginous.com'
            }
        });

        console.log(`📊 Remaining users with this email: ${remainingUsers.length}`);

        if (remainingUsers.length === 1) {
            console.log('🎉 Duplicate issue resolved!');
        }

    } catch (error) {
        console.error('❌ Error fixing duplicates:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDuplicatesSafely();













