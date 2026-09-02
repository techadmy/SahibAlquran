import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type {
  CreateWeekScheduleDto,
  ISODateOnlyString,
  ScheduleImageDto,
  WeekDto,
} from '@sahibalquran/shared';
import { getNowAsUTC, formatDate } from '@sahibalquran/shared';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { groupService } from '../services/group.service';
import {
  uploadFormSchema,
  type UploadFormInput,
  type UploadFormValues,
} from '../utils/groups.validation';

export type EditingImageContext = {
  imageId: string;
  imageName: string;
  weekNumber: number;
  weekStartDate: ISODateOnlyString;
};

export function useWeeklyScheduleViewModel(groupId: string, isOpen: boolean) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingCtx, setEditingCtx] = useState<EditingImageContext | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  const schedulesQuery = useApiQuery<WeekDto[]>({
    queryKey: queryKeys.groups.schedules(groupId),
    queryFn: () => groupService.getGroupSchedules(groupId),
    enabled: isOpen,
  });

  const uploadScheduleMutation = useApiMutation<
    { dto: CreateWeekScheduleDto; file: File },
    WeekDto
  >({
    mutationFn: ({ dto, file }) => groupService.createScheduleImage(groupId, dto, file),
    onSuccess: async () => {
      toast.success('تم رفع صورة الجدول بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.schedules(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.wirds.weeks(groupId) });
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ أثناء رفع الصورة'),
  });

  const updateScheduleImageMutation = useApiMutation<
    { imageId: string; file: File | null; name?: string },
    ScheduleImageDto
  >({
    mutationFn: ({ imageId, file, name }) =>
      groupService.updateScheduleImage(groupId, imageId, file, name),
    onSuccess: async () => {
      toast.success('تم تحديث صورة الجدول');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.schedules(groupId) });
      setEditingCtx(null);
      setEditFile(null);
      setEditName('');
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ أثناء تحديث الصورة'),
  });

  const form = useForm<UploadFormInput, unknown, UploadFormValues>({
    resolver: zodResolver(uploadFormSchema()),
    defaultValues: { saturdayDate: undefined, scheduleName: '' },
  });

  const weeks = schedulesQuery.data?.data ?? [];
  const isFirstWeek = weeks.length === 0;

  const today = formatDate({ date: getNowAsUTC(), token: 'yyyy-MM-dd' });
  const currentWeeks = weeks.filter((w) => w.endDate >= today);
  const pastWeeks = weeks.filter((w) => w.endDate < today);

  const handleUpload = async (data: UploadFormValues) => {
    await uploadScheduleMutation.mutateAsync({
      dto: { saturdayDate: data.saturdayDate, scheduleName: data.scheduleName },
      file: data.file,
    });
    form.reset();
    setShowUploadForm(false);
  };

  const handleUpdateImage = async () => {
    if (!editingCtx) return;
    if (!editFile && !editName.trim()) return;
    await updateScheduleImageMutation.mutateAsync({
      imageId: editingCtx.imageId,
      file: editFile,
      name: editName.trim() || undefined,
    });
  };

  const openEditImage = (week: WeekDto) => {
    setEditingCtx({
      imageId: week.scheduleImage.id,
      imageName: week.scheduleImage.name,
      weekNumber: week.weekNumber,
      weekStartDate: week.startDate,
    });
    setEditFile(null);
    setEditName(week.scheduleImage.name);
    setShowUploadForm(false);
  };

  const cancelEdit = () => {
    setEditingCtx(null);
    setEditFile(null);
    setEditName('');
  };

  const resetAll = () => {
    form.reset();
    setShowUploadForm(false);
    setEditingCtx(null);
    setEditFile(null);
    setEditName('');
    setActiveTab('current');
  };

  return {
    weeks,
    currentWeeks,
    pastWeeks,
    activeTab,
    setActiveTab,
    isFirstWeek,
    isLoadingSchedules: schedulesQuery.isLoading,

    // Upload form
    form,
    showUploadForm,
    setShowUploadForm,
    handleUpload,
    isUploading: uploadScheduleMutation.isPending,

    // Edit image
    editingCtx,
    editFile,
    setEditFile,
    editName,
    setEditName,
    openEditImage,
    cancelEdit,
    handleUpdateImage,
    isUpdatingImage: updateScheduleImageMutation.isPending,

    // Image preview
    selectedImage,
    setSelectedImage,

    resetAll,
  };
}
