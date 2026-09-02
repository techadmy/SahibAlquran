import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateStaffUserDto,
  DEFAULT_TIMEZONE,
  LearnerDto,
  PromoteLearnersToModeratorDto,
  StaffUserDto,
  UpdateStaffUserDto,
  UserAuthRole,
} from '@sahibalquran/shared';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { queryClient, queryKeys } from '@/lib/query-client';
import { createStaffSchema, updateStaffSchema } from '@sahibalquran/shared';
import { userService } from '../services/user.service';
import { learnerService } from '@/modules/learners/services/learner.service';

const createStaffUserSchema = createStaffSchema();
const updateStaffUserSchema = updateStaffSchema();

const DEFAULT_FORM_VALUES: CreateStaffUserDto = {
  name: '',
  phone: '',
  role: 'MODERATOR' as UserAuthRole,
  password: '',
  timezone: DEFAULT_TIMEZONE,
};

const FORM_FIELDS = ['name', 'phone', 'role', 'timezone', 'password'] as const;
type FormFieldName = (typeof FORM_FIELDS)[number];

export function useUsersViewModel() {
  const { user } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUserDto | null>(null);
  const [pendingSavePayload, setPendingSavePayload] = useState<{
    mode: 'create' | 'update';
    data: CreateStaffUserDto | UpdateStaffUserDto;
  } | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<StaffUserDto | null>(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const staffUsersQuery = useApiQuery<StaffUserDto[]>({
    queryKey: queryKeys.users.list({ scope: 'staff' }),
    queryFn: userService.getStaffUsers,
    enabled: Boolean(user),
  });

  const activeSchema = editingUser ? updateStaffUserSchema : createStaffUserSchema;

  const form = useForm({
    resolver: zodResolver(activeSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onTouched',
  });

  const createMutation = useApiMutation<CreateStaffUserDto, StaffUserDto>({
    mutationFn: userService.createStaffUser,
    onSuccess: async () => {
      toast.success('تم إضافة المستخدم بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setIsDialogOpen(false);
      setConfirmSaveOpen(false);
      setPendingSavePayload(null);
      form.reset(DEFAULT_FORM_VALUES);
    },
    onError: (error) => {
      toast.error(error.message || 'فشل إضافة المستخدم');
    },
  });

  const updateMutation = useApiMutation<{ id: string; data: UpdateStaffUserDto }, StaffUserDto>({
    mutationFn: ({ id, data }) => userService.updateStaffUser(id, data),
    onSuccess: async () => {
      toast.success('تم تعديل المستخدم بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setIsDialogOpen(false);
      setConfirmSaveOpen(false);
      setPendingSavePayload(null);
      setEditingUser(null);
      form.reset(DEFAULT_FORM_VALUES);
    },
    onError: (error) => {
      toast.error(error.message || 'فشل تعديل المستخدم');
    },
  });

  const deleteMutation = useApiMutation<string, null>({
    mutationFn: userService.deleteStaffUser,
    onSuccess: async () => {
      toast.success('تم حذف المستخدم بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setPendingDeleteUser(null);
    },
    onError: (error) => {
      toast.error(error.message || 'فشل حذف المستخدم');
    },
  });

  const learnersQuery = useApiQuery<LearnerDto[]>({
    queryKey: queryKeys.learners.list({ limit: 100 }),
    queryFn: () => learnerService.queryLearners({ page: 1, limit: 100 }),
    enabled: isPromoteModalOpen,
  });

  const promoteMutation = useApiMutation<PromoteLearnersToModeratorDto, null>({
    mutationFn: userService.promoteLearners,
    onSuccess: async () => {
      toast.success('تم ترقية المتعلمين بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.learners.all });
      setIsPromoteModalOpen(false);
      setSelectedStudentIds([]);
    },
    onError: (error) => {
      toast.error(error.message || 'فشل ترقية المتعلمين');
    },
  });

  const onPromote = async () => {
    if (selectedStudentIds.length === 0) return;
    await promoteMutation.mutateAsync({ studentIds: selectedStudentIds });
  };

  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const availableRoles: UserAuthRole[] = isAdmin ? ['ADMIN', 'MODERATOR'] : ['MODERATOR'];

  const canManageRole = (role: UserAuthRole) => {
    if (isAdmin) {
      return true;
    }
    if (isModerator) {
      return role === 'MODERATOR';
    }
    return false;
  };

  const canManageUser = (targetUser: StaffUserDto) => {
    if (!user) {
      return false;
    }
    if (targetUser.id === user.id) {
      return false;
    }
    return canManageRole(targetUser.role);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    form.reset({
      ...DEFAULT_FORM_VALUES,
      role: availableRoles[0],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (targetUser: StaffUserDto) => {
    if (!canManageUser(targetUser)) {
      return;
    }
    setEditingUser(targetUser);
    form.reset({
      name: targetUser.name,
      phone: targetUser.phone,
      role: targetUser.role,
      password: '',
      timezone: targetUser.timezone || DEFAULT_TIMEZONE,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = form.handleSubmit((values) => {
    const mode = editingUser ? 'update' : 'create';

    const result =
      mode === 'update'
        ? updateStaffUserSchema.safeParse(values)
        : createStaffUserSchema.safeParse(values);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && FORM_FIELDS.includes(field as FormFieldName)) {
          form.setError(field as FormFieldName, {
            message: issue.message,
          });
        }
      }
      return;
    }

    setPendingSavePayload({
      mode,
      data: result.data,
    });
    setConfirmSaveOpen(true);
  });

  const confirmSave = async () => {
    if (!pendingSavePayload) {
      return;
    }

    if (pendingSavePayload.mode === 'create') {
      await createMutation.mutateAsync(pendingSavePayload.data as CreateStaffUserDto);
      return;
    }

    if (!editingUser) {
      return;
    }

    await updateMutation.mutateAsync({
      id: editingUser.id,
      data: pendingSavePayload.data as UpdateStaffUserDto,
    });
  };

  const confirmDelete = async () => {
    if (!pendingDeleteUser) {
      return;
    }
    await deleteMutation.mutateAsync(pendingDeleteUser.id);
  };

  return {
    user,
    form,
    users: staffUsersQuery.data?.data ?? [],
    queryError: staffUsersQuery.error?.message ?? null,
    isLoading: staffUsersQuery.isPending,
    isRefreshing: staffUsersQuery.isFetching,

    isDialogOpen,
    setIsDialogOpen,
    editingUser,
    openCreateDialog,
    openEditDialog,
    onSubmit,

    availableRoles,
    canManageUser,

    confirmSaveOpen,
    setConfirmSaveOpen,
    confirmSave,
    pendingSavePayload,

    pendingDeleteUser,
    setPendingDeleteUser,
    confirmDelete,

    isSubmitting: createMutation.isPending || updateMutation.isPending,
    canSubmitForm: form.formState.isDirty && form.formState.isValid,

    isDeleting: deleteMutation.isPending,

    isPromoteModalOpen,
    setIsPromoteModalOpen,
    selectedStudentIds,
    setSelectedStudentIds,
    learners: learnersQuery.data?.data ?? [],
    isLearnersLoading: learnersQuery.isPending,
    onPromote,
    isPromoting: promoteMutation.isPending,
  };
}
