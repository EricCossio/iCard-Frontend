import {useMutation} from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { loginUser,registerUser } from '../api/auth';


export const useLogin = () => {
    const navigate = useNavigate();
    return useMutation({
        mutationFn: loginUser,
        onSuccess: (data) => {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            navigate('/itinerario');
        },
    })
}

export const useRegister = () => {
    const navigate = useNavigate();
    return useMutation({
        mutationFn: registerUser,
        onSuccess: () => navigate('/itinerario'),
    })
}

export const useLogout = () => {
    const navigate = useNavigate();
    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
    }
    return {logout};
}
