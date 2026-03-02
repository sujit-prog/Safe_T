import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        // In a real app, this would use the logged-in user's session ID
        // For our simulation, we grab the first user (the seeded "Test Setup" user)
        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const [history, networkAlerts, guardians, anchors] = await Promise.all([
            prisma.checkHistory.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.networkAlert.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.guardianConnection.findMany({
                where: { userId: user.id }
            }),
            prisma.safeAnchor.findMany({
                take: 3
            })
        ]);

        return NextResponse.json({
            history: history.map(h => ({
                id: h.id,
                location: h.location,
                score: h.score,
                status: h.status,
                date: new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            })),
            networkAlerts,
            guardians,
            anchors
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
