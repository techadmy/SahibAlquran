import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChangeOwnPasswordDto,
  UpdateOwnProfileDto,
  User,
  UserAuthType,
  changeOwnPasswordSchema,
  updateOwnProfileSchema,
  DEFAULT_TIMEZONE,
} from '@sahibalquran/shared';
import { toast } from 'sonner';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { userProfileService } from '../services/user-profile.service';

type UseUserProfileViewModelArgs = {
  user: User | null;
  setUser: (nextUser: User | null) => void;
};

export const useUserProfileViewModel = ({ user, setUser }: UseUserProfileViewModelArgs) => {
  const [pendingProfileData, setPendingProfileData] = useState<UpdateOwnProfileDto | null>(null);
  const [pendingPasswordData, setPendingPasswordData] = useState<ChangeOwnPasswordDto | null>(null);
  const [confirmProfileOpen, setConfirmProfileOpen] = useState(false);
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);

  const profileForm = useForm<UpdateOwnProfileDto>({
    resolver: zodResolver(updateOwnProfileSchema()) as unknown as Resolver<UpdateOwnProfileDto>,
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      timezone: user?.timezone || DEFAULT_TIMEZONE,
      age: user?.age,
      platform: user?.platform || undefined,
      schedule: user?.schedule,
      recitation: user?.recitation || undefined,
    },
    mode: 'onTouched',
  });

  const passwordForm = useForm<ChangeOwnPasswordDto>({
    resolver: zodResolver(changeOwnPasswordSchema()),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const updateProfileMutation = useApiMutation<UpdateOwnProfileDto, UserAuthType>({
    mutationFn: async (data) => {
      if (!user) {
        throw new Error('المستخدم غير متوفر');
      }

      return userProfileService.updateProfile(data);
    },
    onSuccess: (response) => {
      if (!response.data) {
        return;
      }

      if (user) {
        setUser({
          ...user,
          ...response.data,
          phone: response.data.phone ?? '',
        });
      }
      toast.success('تم تحديث الملف الشخصي بنجاح');
      setConfirmProfileOpen(false);
      setPendingProfileData(null);
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
    },
  });

  const changePasswordMutation = useApiMutation<ChangeOwnPasswordDto, void>({
    mutationFn: async (data) => {
      if (!user) {
        throw new Error('المستخدم غير متوفر');
      }

      return userProfileService.changePassword(data);
    },
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح');
      passwordForm.reset();
      setConfirmPasswordOpen(false);
      setPendingPasswordData(null);
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    },
  });

  const requestProfileUpdate = (data: UpdateOwnProfileDto) => {
    setPendingProfileData(data);
    setConfirmProfileOpen(true);
  };

  const requestPasswordChange = (data: ChangeOwnPasswordDto) => {
    setPendingPasswordData(data);
    setConfirmPasswordOpen(true);
  };

  const confirmProfileUpdate = async () => {
    if (!pendingProfileData) {
      return;
    }

    await updateProfileMutation.mutateAsync(pendingProfileData);
  };

  const confirmPasswordChange = async () => {
    if (!pendingPasswordData) {
      return;
    }

    await changePasswordMutation.mutateAsync(pendingPasswordData);
  };

  return {
    profileForm,
    passwordForm,
    confirmProfileOpen,
    setConfirmProfileOpen,
    confirmPasswordOpen,
    setConfirmPasswordOpen,
    requestProfileUpdate,
    requestPasswordChange,
    confirmProfileUpdate,
    confirmPasswordChange,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
  };
};
