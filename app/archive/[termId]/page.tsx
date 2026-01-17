
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import { ArrowLeft, BookOpen, User, MapPin } from 'lucide-react';
import { notFound } from 'next/navigation';

import CourseBrowser from '@/components/CourseBrowser';

const prisma = new PrismaClient();

async function getTerm(id: string) {
    return await prisma.term.findUnique({
        where: { id },
    });
}

interface Props {
    params: Promise<{ termId: string }>;
}

export default async function TermPage({ params }: Props) {
    const { termId } = await params;
    const term = await getTerm(termId);

    if (!term) {
        notFound();
    }

    return (
        <CourseBrowser termId={term.id} termName={term.name} />
    );
}

