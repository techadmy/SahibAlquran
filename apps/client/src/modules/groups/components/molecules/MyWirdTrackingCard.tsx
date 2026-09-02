import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WirdTrackingTable } from '../organisms/WirdTrackingTable';
import type { GroupWirdTrackingRowDto, TimeZoneType } from '@sahibalquran/shared';

type Props = {
  rows: GroupWirdTrackingRowDto[];
  weekId: string;
  groupId: string;
  userTimezone: TimeZoneType;
};

export function MyWirdTrackingCard({ rows, weekId, groupId, userTimezone }: Props) {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>سجل ورد المجموعة</CardTitle>
      </CardHeader>
      <CardContent>
        <WirdTrackingTable
          rows={rows}
          isLoading={false}
          weekId={weekId}
          groupId={groupId}
          userTimezone={userTimezone}
          canManage={false}
        />
      </CardContent>
    </Card>
  );
}
