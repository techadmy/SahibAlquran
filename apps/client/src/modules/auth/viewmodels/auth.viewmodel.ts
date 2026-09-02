import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthResponseDto, LoginCredentialsDto, loginSchema } from '@sahibalquran/shared';
import { useApp } from '@/contexts/AppContext';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { storageService } from '@/services';
import authService from '../services/auth.service';

export const useAuthViewModel = () => {
  const navigate = useNavigate();
  const { setUser } = useApp();

  const loginForm = useForm<LoginCredentialsDto>({
    resolver: zodResolver(loginSchema()),
    defaultValues: {
      phone: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const loginMutation = useApiMutation<LoginCredentialsDto, AuthResponseDto>({
    mutationFn: (credentials: LoginCredentialsDto) => authService.login(credentials),
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { user, accessToken } = response.data;

        // Save to storage
        storageService.saveToken(accessToken);
        const userWithPhone = {
          ...user,
          phone: user.phone ?? '',
        };

        storageService.saveUser(userWithPhone);

        // Update context
        setUser(userWithPhone);

        // Show success message
        toast.success(`مرحباً، ${user.name}`);

        // Navigate to home or dashboard
        navigate('/');
      }
    },
  });

  const logout = async () => {
    try {
      await authService.logout();
      storageService.clearAll();
      setUser(null);

      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/login');
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
      // Still logout locally even if API fails
      storageService.clearAll();
      setUser(null);
      navigate('/login');
    }
  };

  return {
    loginForm,
    onLoginSubmit: loginForm.handleSubmit((data) => loginMutation.mutate(data)),
    canSubmit: loginForm.formState.isDirty && loginForm.formState.isValid,
    // Login mutation state
    login: loginMutation.mutate,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
    isError: loginMutation.isError,
    isSuccess: loginMutation.isSuccess,

    // Other functions
    logout,
  };
};
