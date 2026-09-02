import { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Loader2, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { StudentTableItem } from '@/modules/learners/components/student-table-item';
import { StudentMainInfoModal } from '@/modules/learners/components/student-main-info-modal';
import type { StudentMainInfoSubmitArgs } from '@/modules/learners/components/student-main-info-modal';
import type { LearnerDto } from '@sahibalquran/shared';
import {
  LEARNER_DETAIL_FIELDS,
  PLATFORM_OPTIONS,
  RECITATION_OPTIONS,
  TIMEZONES,
} from '@sahibalquran/shared';
import { useLearnersViewModel } from '../viewmodels/learners.viewmodel';

export default function LearnersView() {
  const vm = useLearnersViewModel();

  const columns = useMemo<ColumnDef<LearnerDto>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'الاسم',
        enableSorting: true,
      },
      {
        id: 'timezone',
        accessorKey: 'timezone',
        header: 'المنطقة الزمنية',
        enableSorting: true,
      },
      {
        id: 'groups',
        accessorFn: (row) =>
          row.groups
            ?.filter((g) => !g.removedAt)
            .map((g) => g.name)
            .join(' / ') ?? '-',
        header: 'المجموعات',
        enableSorting: true,
      },
      ...LEARNER_DETAIL_FIELDS.map(({ key, label }) => ({
        id: key,
        accessorFn: (row: LearnerDto) => row.contact[key as keyof typeof row.contact] ?? '-',
        header:
          key === 'schedule'
            ? () => (
                <div className='flex flex-col gap-0.5'>
                  <span>الموعد</span>
                  <span className='text-[10px] font-normal text-muted-foreground tracking-wide'>
                    🇸🇦 KSA
                  </span>
                </div>
              )
            : label,
        enableSorting: true,
      })),
      {
        id: 'notes',
        accessorFn: (row) => row.contact.notes ?? '',
        header: 'ملاحظات',
        enableSorting: true,
      },
      {
        id: 'actions',
        header: 'الإجراءات',
        enableSorting: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: vm.learners,
    columns,
    state: { sorting: vm.sorting, columnFilters: vm.columnFilters },
    onSortingChange: vm.setSortingTable,
    onColumnFiltersChange: vm.setColumnFiltersTable,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
  });

  if (vm.queryError) {
    return (
      <Alert alertType='ERROR'>
        <AlertDescription>{vm.queryError}</AlertDescription>
      </Alert>
    );
  }

  const handleCreateSubmit = async (args: StudentMainInfoSubmitArgs) => {
    if (args.mode !== 'create') return;
    await vm.submitCreate(args.data);
  };

  return (
    <div className='space-y-4'>
      <PageHeader
        title='الطلاب'
        description='إدارة قائمة الطلاب'
        actions={
          vm.canManageLearners ? (
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                color='muted'
                className='gap-2'
                onClick={vm.handleExportLearners}
                disabled={vm.isExporting}
              >
                {vm.isExporting ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Download className='w-4 h-4' />
                )}
                تصدير XLS
              </Button>
              <Button onClick={vm.openCreateModal} className='gap-2'>
                <UserPlus className='w-4 h-4' />
                إضافة طالب
              </Button>
            </div>
          ) : null
        }
      />

      <SearchInput
        value={vm.searchQuery}
        onChange={vm.onSearchQueryChange}
        placeholder='بحث بالاسم فقط'
        className='w-full sm:max-w-md'
      />

      <div className='flex flex-wrap items-end gap-3'>
        <div className='flex flex-col gap-1'>
          <span className='text-xs font-medium text-muted-foreground px-0.5'>المنطقة الزمنية</span>
          <Select
            value={(table.getColumn('timezone')?.getFilterValue() as string | undefined) ?? 'all'}
            onValueChange={(val) =>
              table.getColumn('timezone')?.setFilterValue(val === 'all' ? undefined : val)
            }
          >
            <SelectTrigger className='w-48'>
              <SelectValue placeholder='الكل' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>الكل</SelectItem>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1'>
          <span className='text-xs font-medium text-muted-foreground px-0.5'>الرواية</span>
          <Select
            value={(table.getColumn('recitation')?.getFilterValue() as string | undefined) ?? 'all'}
            onValueChange={(val) =>
              table.getColumn('recitation')?.setFilterValue(val === 'all' ? undefined : val)
            }
          >
            <SelectTrigger className='w-36'>
              <SelectValue placeholder='الكل' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>الكل</SelectItem>
              {RECITATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1'>
          <span className='text-xs font-medium text-muted-foreground px-0.5'>الوسيلة</span>
          <Select
            value={(table.getColumn('platform')?.getFilterValue() as string | undefined) ?? 'all'}
            onValueChange={(val) =>
              table.getColumn('platform')?.setFilterValue(val === 'all' ? undefined : val)
            }
          >
            <SelectTrigger className='w-44'>
              <SelectValue placeholder='الكل' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>الكل</SelectItem>
              {PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1'>
          <span className='text-xs font-medium text-muted-foreground px-0.5'>الحلقة</span>
          <Select
            value={(table.getColumn('groups')?.getFilterValue() as string | undefined) ?? 'all'}
            onValueChange={(val) =>
              table.getColumn('groups')?.setFilterValue(val === 'all' ? undefined : val)
            }
            disabled={vm.isGroupNamesLoading}
          >
            <SelectTrigger className='w-44'>
              <SelectValue placeholder={vm.isGroupNamesLoading ? 'جاري التحميل...' : 'الكل'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>الكل</SelectItem>
              {vm.groupNames.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table className='rounded-lg border bg-card shadow-sm'>
        <TableHeader className='bg-muted/40'>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const isSortable = header.column.getCanSort();

                return (
                  <TableHead
                    key={header.id}
                    className='px-4 py-3 text-xs'
                    onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div
                      className={
                        isSortable
                          ? 'flex items-center gap-1 cursor-pointer select-none'
                          : 'flex items-center gap-1'
                      }
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {isSortable &&
                        (sorted === 'asc' ? (
                          <ArrowUp className='h-3.5 w-3.5 text-muted-foreground' />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className='h-3.5 w-3.5 text-muted-foreground' />
                        ) : (
                          <ArrowUpDown className='h-3.5 w-3.5 text-muted-foreground' />
                        ))}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {vm.isLoading ? (
            <TableRow>
              <TableCell colSpan={9}>
                <div className='flex items-center justify-center py-8 gap-2 text-muted-foreground'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  جاري التحميل...
                </div>
              </TableCell>
            </TableRow>
          ) : vm.learners.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9}>
                <div className='flex flex-col items-center justify-center py-10 text-muted-foreground gap-2'>
                  <Users className='w-6 h-6 opacity-70' />
                  <span>{vm.searchQuery ? 'لا توجد نتائج مطابقة' : 'لا يوجد طلاب حالياً'}</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table
              .getRowModel()
              .rows.map((row) => (
                <StudentTableItem
                  key={row.original.id}
                  learner={row.original}
                  showActions={vm.canManageLearners}
                  onClick={vm.openViewModal}
                  onEditSubmit={(data) => vm.updateLearner(row.original.id, data)}
                  onDeleteConfirm={() => vm.deleteLearner(row.original.id)}
                  isUpdating={vm.isUpdatingLearner}
                />
              ))
          )}
        </TableBody>
      </Table>

      <PaginationControls
        value={vm.page}
        totalPages={vm.totalPages}
        onValueChange={vm.setPage}
        limit={vm.limit}
        onLimitChange={vm.setLimit}
        disabled={vm.isLoading || vm.isRefreshing}
      />

      {/* View / Create modal */}
      <StudentMainInfoModal
        open={vm.isStudentModalOpen}
        onOpenChange={vm.setIsStudentModalOpen}
        mode={vm.studentModalMode}
        learner={vm.selectedLearner}
        onSubmit={vm.studentModalMode === 'create' ? handleCreateSubmit : undefined}
        isLoading={vm.isSubmittingCreate}
      />
    </div>
  );
}
