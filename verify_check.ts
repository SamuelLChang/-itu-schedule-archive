
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const termName = '2023-2024_Yaz_Dönemi_Ders_Programları';
    const term = await prisma.term.findFirst({
        where: { name: termName }
    });

    if (!term) {
        console.log(`Term '${termName}' not found.`);
        return;
    }

    const courses = await prisma.course.findMany({
        where: { termId: term.id },
        select: { code: true }
    });

    const subjects = new Set<string>();
    courses.forEach(c => {
        const subject = c.code.split(' ')[0];
        subjects.add(subject);
    });

    const numericSubjects = Array.from(subjects).filter(s => /^\d+$/.test(s));

    if (numericSubjects.length > 0) {
        console.log("RESULT_FAILURE");
        console.log("Count: " + numericSubjects.length);
    } else {
        console.log("RESULT_SUCCESS");
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
