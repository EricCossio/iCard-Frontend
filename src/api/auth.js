import api from './axios'
import { useQuery } from '@tanstack/react-query';


export const loginUser = async ({ username, password }) => {
    const response = await api.post('/auth/login/', { username, password }) // ← corregido
    return response.data
}

export const registerUser = async (userData) => {
    // eslint-disable-next-line no-unused-vars
    const { confirm_password, ...data } = userData
    const response = await api.post('/auth/register/', data)  // ← corregido
    return response.data
}

export const useMe = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me/')
      return data
    },
  })
}