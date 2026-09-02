import { useState } from 'react';
import { Check, X, FileText, UserCheck, Calendar, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate } from '@sahibalquran/shared';
import type {
  RequestDto,
  RequestType,
  TimeZoneType,
  RequestPayloadMap,
  ISODateString,
} from '@sahibalquran/shared';

type RequestsTableProps = {
  requests: RequestDto[];
  userTimezone: TimeZoneType;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  isReviewing?: boolean;
  showActions?: boolean;
};

const TYPE_CONFIG: Record<
  RequestType,
  { label: string; icon: typeof FileText; color: 'warning' | 'primary' }
> = {
  EXCUSE: { label: 'عذر', icon: FileText, color: 'warning' },
  ACTIVATION: { label: 'تفعيل', icon: UserCheck, color: 'primary' },
};

const STATUS_CONFIG = {
  PENDING: { label: 'قيد المراجعة', color: 'warning' as const },
  ACCEPTED: { label: 'مقبول', color: 'success' as const },
  REJECTED: { label: 'مرفوض', color: 'danger' as const },
};

export function RequestsTable({
  requests,
  userTimezone,
  onAccept,
  onReject,
  isReviewing = false,
  showActions = false,
}: RequestsTableProps) {
  const [acceptTargetId, setAcceptTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-center'>
        <Typography size='sm' className='text-muted-foreground'>
          لا توجد طلبات
        </Typography>
      </div>
    );
  }

  return (
    <>
      <Table className='bg-card'>
        <TableHeader className='bg-muted/40'>
          <TableRow>
            <TableHead className='px-4 py-3 text-right text-xs'>النوع</TableHead>
            <TableHead className='px-4 py-3 text-right text-xs'>الطالب</TableHead>
            <TableHead className='px-4 py-3 text-right text-xs'>المجموعة</TableHead>
            <TableHead className='px-4 py-3 text-right text-xs'>التفاصيل</TableHead>
            <TableHead className='px-4 py-3 text-right text-xs'>الحالة</TableHead>
            <TableHead className='px-4 py-3 text-right text-xs'>التاريخ</TableHead>
            {showActions && (
              <TableHead className='px-4 py-3 text-left text-xs'>الإجراءات</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const { label, icon: Icon, color } = TYPE_CONFIG[request.type];
            const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.PENDING;

            return (
              <TableRow key={request.id}>
                <TableCell className='px-4 py-3'>
                  <Badge variant='soft' color={color} className='gap-1'>
                    <Icon className='h-3 w-3' />
                    {label}
                  </Badge>
                </TableCell>

                <TableCell className='px-4 py-3'>
                  <Typography size='sm' weight='medium'>
                    {request.studentName}
                  </Typography>
                </TableCell>

                <TableCell className='px-4 py-3'>
                  <Typography size='sm'>{request.groupName}</Typography>
                </TableCell>

                <TableCell className='px-4 py-3'>
                  {request.type === 'EXCUSE' &&
                    (() => {
                      const payload = request.payload as RequestPayloadMap['EXCUSE'];
                      return (
                        <div className='flex flex-col gap-0.5'>
                          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                            <Calendar className='h-3 w-3' />
                            <span>
                              ينتهي{' '}
                              {formatDate({
                                date: payload.expiresAt as ISODateString,
                                token: 'dd/MM/yyyy',
                                timezone: userTimezone,
                              })}
                            </span>
                          </div>
                          {payload.reason && (
                            <Typography size='xs' className='text-muted-foreground line-clamp-1'>
                              {payload.reason}
                            </Typography>
                          )}
                        </div>
                      );
                    })()}
                </TableCell>

                <TableCell className='px-4 py-3'>
                  <Badge variant='soft' color={statusCfg.color}>
                    {statusCfg.label}
                  </Badge>
                </TableCell>

                <TableCell className='px-4 py-3'>
                  <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                    <Clock className='h-3 w-3' />
                    {formatDate({
                      date: request.createdAt,
                      token: 'dd/MM/yyyy',
                      timezone: userTimezone,
                    })}
                  </div>
                </TableCell>

                {showActions && (
                  <TableCell className='px-4 py-3'>
                    {request.status === 'PENDING' ? (
                      <div className='flex items-center gap-1'>
                        <Button
                          size='sm'
                          color='success'
                          variant='ghost'
                          onClick={() => setAcceptTargetId(request.id)}
                          disabled={isReviewing}
                        >
                          <Check className='h-4 w-4' />
                          قبول
                        </Button>
                        <Button
                          size='sm'
                          color='danger'
                          variant='ghost'
                          onClick={() => setRejectTargetId(request.id)}
                          disabled={isReviewing}
                        >
                          <X className='h-4 w-4' />
                          رفض
                        </Button>
                      </div>
                    ) : request.reviewerName ? (
                      <Typography size='xs' className='text-muted-foreground'>
                        بواسطة {request.reviewerName}
                      </Typography>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!acceptTargetId}
        onOpenChange={(o) => !o && setAcceptTargetId(null)}
        title='قبول الطلب'
        description='هل أنت متأكد من قبول هذا الطلب؟ سيتم تنفيذ الإجراء المطلوب تلقائياً.'
        confirmText='قبول'
        cancelText='إلغاء'
        intent='default'
        onConfirm={() => {
          if (acceptTargetId && onAccept) {
            onAccept(acceptTargetId);
            setAcceptTargetId(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!rejectTargetId}
        onOpenChange={(o) => !o && setRejectTargetId(null)}
        title='رفض الطلب'
        description='هل أنت متأكد من رفض هذا الطلب؟'
        confirmText='رفض'
        cancelText='إلغاء'
        intent='destructive'
        onConfirm={() => {
          if (rejectTargetId && onReject) {
            onReject(rejectTargetId);
            setRejectTargetId(null);
          }
        }}
      />
    </>
  );
}
