import { createSafeActionClient } from 'next-safe-action'
import { auth } from '@/lib/auth'

import * as Sentry from "@sentry/nextjs";

/**
 * Throw this inside a server action to surface a structured error code to the
 * client without leaking internal details. The `message` is shown to users;
 * `code` lets the client branch on the error type.
 *
 * Example:
 *   throw new ActionError("Sesión expirada.", "SESSION_EXPIRED")
 */
export class ActionError extends Error {
    constructor(
        message: string,
        public readonly code: string = "ACTION_ERROR",
    ) {
        super(message);
        this.name = "ActionError";
    }
}

// Cliente público (sin autenticación requerida)
export const actionClient = createSafeActionClient({
    handleServerError(e, utils) {
        // Captura en Sentry con contexto de la action (non-ActionError only)
        if (!(e instanceof ActionError)) {
            Sentry.captureException(e, {
                tags: {
                    actionName: (utils as any)?.metadata?.actionName ?? "unknown_action",
                },
                extra: {
                    clientInput: (utils as any)?.clientInput,
                },
            });
        }

        // ActionError: trusted, user-facing message, structured code
        if (e instanceof ActionError) {
            return `[${e.code}] ${e.message}`;
        }

        // Any other error: generic message — never expose e.message to the client
        return 'Error inesperado. Intenta de nuevo.';
    },
})

// Cliente autenticado
export const authenticatedActionClient = actionClient.use(async ({ next }) => {
    const session = await auth()
    if (!session?.user) {
        throw new Error('No autorizado')
    }
    return next({ ctx: { user: session.user } })
})

// Cliente de administrador
export const adminActionClient = authenticatedActionClient.use(
    async ({ next, ctx }) => {
        if (ctx.user.role !== 'admin') {
            throw new Error('No autorizado - Se requiere rol de administrador')
        }
        return next({ ctx })
    }
)

// Cliente de personal (admin, mesero, cocina)
export const staffActionClient = authenticatedActionClient.use(
    async ({ next, ctx }) => {
        const role = ctx.user.role || ''
        if (!['admin', 'waiter', 'kitchen'].includes(role)) {
            throw new Error('No autorizado - Se requiere rol de personal')
        }
        return next({ ctx })
    }
)
