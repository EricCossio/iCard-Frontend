import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    invitarUsuario,
    fetchInvitaciones,
    responderInvitacion,
    cancelarInvitacion,
    buscarUsuarios,
} from '../api/invitaciones'

// ── Ver todas mis invitaciones ──────────────────────────
export const useInvitaciones = () => {
    return useQuery({
        queryKey: ['invitaciones'],
        queryFn: fetchInvitaciones,
    })
}

// ── Invitar usuario a una tarea ─────────────────────────
export const useInvitar = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: invitarUsuario,
        onSuccess: () => {
            qc.invalidateQueries(['invitaciones'])
            qc.invalidateQueries(['tareas'])
        },
    })
}

// ── Aceptar o rechazar ──────────────────────────────────
export const useResponderInvitacion = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: responderInvitacion,
        onSuccess: () => {
            qc.invalidateQueries(['invitaciones'])
            qc.invalidateQueries(['tareas'])
        },
    })
}

// ── Cancelar invitación ─────────────────────────────────
export const useCancelarInvitacion = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: cancelarInvitacion,
        onSuccess: () => {
            qc.invalidateQueries(['invitaciones'])
        },
    })
}

// ── Buscar usuarios para invitar ────────────────────────
export const useBuscarUsuarios = (query) => {
    return useQuery({
        queryKey: ['usuarios', query],
        queryFn: () => buscarUsuarios(query),
        enabled: query?.length >= 2,  // solo busca si escribe 2+ caracteres
        staleTime: 30000,
    })
}