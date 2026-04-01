import { createSafeActionClient } from 'next-safe-action'
import { auth } from '@/lib/auth'

// Cliente público (sin autenticación requerida)
export const actionClient = createSafeActionClient({
    handleServerError(e) {
        console.error('Action error:', e)
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
