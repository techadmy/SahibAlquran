import { useState } from 'react';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import writeXlsxFile from 'write-excel-file/browser';
import type { Column } from 'write-excel-file/browser';
import {
  formatDate,
  getNowAsUTC,
  LEARNER_DETAIL_FIELDS,
  PLATFORM_OPTIONS,
  RECITATION_OPTIONS,
  TIMEZONES,
  minutesToInputTimeString,
  type CreateLearnerDto,
  type LearnerDto,
  type PlatformType,
  type QueryLearnersDto,
  type RecitationType,
  type TimeZoneType,
  type TimeMinutes,
  type UpdateLearnerDto,
} from '@sahibalquran/shared';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { queryClient, queryKeys } from '@/lib/query-client';
import { learnerService } from '../services/learner.service';
import { groupService } from '@/modules/groups/services/group.service';

export type LearnerModalMode = 'view' | 'create';

export function useLearnersViewModel() {
  const { user } = useApp();
  const canManageLearners = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const [searchQuery, setSearchQueryState] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState<LearnerDto | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState<LearnerModalMode>('view');

  const activeSort = sorting[0];
  const sortBy = activeSort?.id as QueryLearnersDto['sortBy'] | undefined;
  const sortOrder = activeSort ? (activeSort.desc ? 'desc' : 'asc') : undefined;

  const timezoneFilter = columnFilters.find((f) => f.id === 'timezone')?.value as
    | TimeZoneType
    | undefined;
  const recitationFilter = columnFilters.find((f) => f.id === 'recitation')?.value as
    | RecitationType
    | undefined;
  const platformFilter = columnFilters.find((f) => f.id === 'platform')?.value as
    | PlatformType
    | undefined;
  const groupIdFilter = columnFilters.find((f) => f.id === 'groups')?.value as string | undefined;

  const groupNamesQuery = useApiQuery({
    queryKey: queryKeys.groups.names(),
    queryFn: () => groupService.getGroupNames(),
  });

  const learnersQuery = useApiQuery<LearnerDto[]>({
    queryKey: queryKeys.learners.list({
      page,
      limit,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
      timezone: timezoneFilter,
      recitation: recitationFilter,
      platform: platformFilter,
      groupId: groupIdFilter,
    }),
    queryFn: () =>
      learnerService.queryLearners({
        page,
        limit,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
        timezone: timezoneFilter,
        recitation: recitationFilter,
        platform: platformFilter,
        groupId: groupIdFilter,
      }),
    placeholderData: (previousData) => previousData,
  });

  const createLearnerMutation = useApiMutation<CreateLearnerDto, LearnerDto>({
    mutationFn: learnerService.createLearner,
    onSuccess: async () => {
      toast.success('تمت إضافة الطالب بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.learners.all });
    },
  });

  const updateLearnerMutation = useApiMutation<{ id: string; data: UpdateLearnerDto }, LearnerDto>({
    mutationFn: ({ id, data }) => learnerService.updateLearner(id, data),
    onSuccess: async () => {
      toast.success('تم تعديل بيانات الطالب بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.learners.all });
    },
  });

  const deleteLearnerMutation = useApiMutation<string, null>({
    mutationFn: (learnerId: string) => learnerService.deleteLearner(learnerId),
    onSuccess: async () => {
      toast.success('تم حذف الطالب بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.learners.all });
    },
  });

  const handleSearchQueryChange = (value: string) => {
    setSearchQueryState(value);
    setPage(1);
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleSortingChange = (nextSorting: SortingState) => {
    setSorting(nextSorting);
    setPage(1);
  };

  // TanStack Table compatible updater function for sorting
  const handleSortingChangeTable = (
    updaterOrValue: SortingState | ((old: SortingState) => SortingState)
  ) => {
    const nextSorting =
      typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;
    setSorting(nextSorting);
    setPage(1);
  };

  // TanStack Table compatible updater function for column filters
  const handleColumnFiltersChangeTable = (
    updaterOrValue: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)
  ) => {
    const next =
      typeof updaterOrValue === 'function' ? updaterOrValue(columnFilters) : updaterOrValue;
    setColumnFilters(next);
    setPage(1);
  };

  const handleExportLearners = async () => {
    if (!canManageLearners) return;

    try {
      setIsExporting(true);
      const learners = await learnerService.exportLearnersData();

      type LearnerRow = {
        name: string;
        phone: string;
        timezone: string;
        groups: string;
        notes: string;
        age: string;
        platform: string;
        schedule: string;
        recitation: string;
      };

      const columns: Column<LearnerRow>[] = [
        { header: 'الاسم', cell: (r) => r.name },
        { header: 'رقم الهاتف', cell: (r) => r.phone },
        { header: 'البلد', cell: (r) => r.timezone },
        { header: 'المجموعات', cell: (r) => r.groups },
        { header: 'الملاحظات', cell: (r) => r.notes },
        ...LEARNER_DETAIL_FIELDS.map((field) => ({
          header: field.excelColumn,
          cell: (r: LearnerRow) => r[field.key as keyof LearnerRow],
        })),
      ];

      const rows: LearnerRow[] = learners.map((learner) => ({
        name: learner.name,
        phone: learner.phone ?? '',
        timezone: TIMEZONES.find((tz) => tz.value === learner.timezone)?.label ?? learner.timezone,
        groups: (learner.groups ?? [])
          .filter((g) => !g.removedAt)
          .map((g) => g.name)
          .join('; '),
        notes: learner.contact.notes ?? '',
        age: learner.contact.age != null ? String(learner.contact.age) : '',
        platform:
          PLATFORM_OPTIONS.find((o) => o.value === learner.contact.platform)?.label ??
          learner.contact.platform ??
          '',
        schedule:
          learner.contact.schedule != null
            ? minutesToInputTimeString(learner.contact.schedule as TimeMinutes)
            : '',
        recitation:
          RECITATION_OPTIONS.find((o) => o.value === learner.contact.recitation)?.label ??
          learner.contact.recitation ??
          '',
      }));

      const exportDate = formatDate({ date: getNowAsUTC(), token: 'yyyy-MM-dd' });
      const result = writeXlsxFile<LearnerRow>(rows, { columns });
      await result.toFile(`learners-${exportDate}.xlsx`);

      toast.success('تم تصدير بيانات الطلاب بنجاح');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تصدير بيانات الطلاب';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedLearner(null);
    setStudentModalMode('create');
    setIsStudentModalOpen(true);
  };

  const openViewModal = (learner: LearnerDto) => {
    setSelectedLearner(learner);
    setStudentModalMode('view');
    setIsStudentModalOpen(true);
  };

  const submitCreate = async (data: CreateLearnerDto) => {
    if (!canManageLearners) throw new Error('غير مصرح لك بتنفيذ العملية');
    await createLearnerMutation.mutateAsync(data);
  };

  const updateLearner = async (id: string, data: UpdateLearnerDto) => {
    if (!canManageLearners) throw new Error('غير مصرح لك بتنفيذ العملية');
    await updateLearnerMutation.mutateAsync({ id, data });
  };

  const deleteLearner = async (id: string) => {
    if (!canManageLearners) return;
    await deleteLearnerMutation.mutateAsync(id);
  };

  return {
    learners: learnersQuery.data?.data ?? [],
    totalPages: Math.max(learnersQuery.data?.meta?.totalPages ?? 1, 1),
    isLoading: learnersQuery.isPending,
    isRefreshing: learnersQuery.isFetching,
    queryError: learnersQuery.error?.message ?? null,

    groupNames: groupNamesQuery.data?.data ?? [],
    isGroupNamesLoading: groupNamesQuery.isPending,

    page,
    setPage,
    limit,
    setLimit: handleLimitChange,
    sorting,
    setSorting: handleSortingChange,
    setSortingTable: handleSortingChangeTable,
    columnFilters,
    setColumnFiltersTable: handleColumnFiltersChangeTable,
    searchQuery,
    onSearchQueryChange: handleSearchQueryChange,

    canManageLearners,

    selectedLearner,
    isStudentModalOpen,
    setIsStudentModalOpen,
    studentModalMode,
    openCreateModal,
    openViewModal,
    submitCreate,

    updateLearner,
    deleteLearner,

    isSubmittingCreate: createLearnerMutation.isPending,
    isUpdatingLearner: updateLearnerMutation.isPending,
    isDeletingLearner: deleteLearnerMutation.isPending,
    handleExportLearners,
    isExporting,
  };
}
