import 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: number;
            username: string;
            displayName: string | null;
        };
        family?: {
            id: number;
            name: string;
        };
    }
}
