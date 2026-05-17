import { createSafeActionClient } from 'next-safe-action'
import { auth } from '@/lib/auth'

import * as Sentry from "@sentry/nextjs";

// Cliente público (sin autenticación requerida)
export const actionClient = createSafeActionClient({
    handleServerError(e, utils) {
        // Captura en Sentry con contexto de la action
        Sentry.captureException(e, {
            tags: {
                actionName: (utils as any)?.metadata?.actionName ?? "unknown_action",
            },
            extra: {
                clientInput: (utils as any)?.clientInput,
            },
        });

        // Log local existente — mantener
        console.error('Action error:', e)
        
        // Devolver mensaje al cliente — mantener el comportamiento actual
        if (e instanceof Error) {
            return e.message
        }
        return 'Error inesperado. Intenta de nuevo.'
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
