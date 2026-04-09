import {z} from 'zod';

export const loginSchema = z.object({
    username: z.string().min(1, 'El nombre de usuario es requerido'),
    password: z.string().min(1, 'La contraseña es requerida'),
})

export const registerSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
    email: z.string().email('El correo electrónico no es válido'),
    first_name: z.string().min(1, 'El nombre es requerido'),
    last_name: z.string().min(1, 'El apellido es requerido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirm_password:z.string().min(6, 'La confirmación de la contraseña debe tener al menos 6 caracteres'),
}).refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
})