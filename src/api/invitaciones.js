import api from './axios'

// Invitar a un usuario a una tarea
export const invitarUsuario = async ({ tarea, invitado }) => {
    const { data } = await api.post('/invitaciones/', { tarea, invitado })
    return data
}

// Ver mis invitaciones (recibidas y enviadas)
export const fetchInvitaciones = async () => {
    const { data } = await api.get('/invitaciones/')
    return data
}

// Aceptar o rechazar invitación
export const responderInvitacion = async ({ id, estado }) => {
    const { data } = await api.patch(`/invitaciones/${id}/`, { estado })
    return data
}

// Cancelar invitación (solo el que invitó)
export const cancelarInvitacion = async (id) => {
    await api.delete(`/invitaciones/${id}/`)
}

// Buscar usuarios por username para invitar
export const buscarUsuarios = async (query) => {
    const { data } = await api.get(`/users/?search=${query}`)
    return data
}