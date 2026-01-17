
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const termCount = await prisma.term.count();
    const courseCount = await prisma.course.count();

    console.log('--- Verification Results ---');
    console.log(`Terms found: ${termCount}`);
    console.log(`Courses found: ${courseCount}`);
    console.log('----------------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
