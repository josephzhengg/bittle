import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useMemo } from 'react';

interface FormStatusBadgeProps {
  deadline?: string | null;
}

export default function FormStatusBadge({ deadline }: FormStatusBadgeProps) {
  const isDeadlineApproaching = useMemo(() => {
    if (!deadline) return false;
    const now = new Date('2025-08-02T17:36:00-04:00'); // Updated to current time
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const hoursUntilDeadline = timeDiff / (1000 * 3600);
    return hoursUntilDeadline > 0 && hoursUntilDeadline <= 24;
  }, [deadline]);

  const isDeadlinePassed = useMemo(() => {
    if (!deadline) return false;
    const now = new Date('2025-08-02T17:36:00-04:00'); // Updated to current time
    const deadlineDate = new Date(deadline);
    return deadlineDate.getTime() < now.getTime();
  }, [deadline]);

  const getDeadlineStatusColor = () => {
    if (isDeadlinePassed) return 'text-red-600'; // Removed parentheses
    if (isDeadlineApproaching) return 'text-amber-600'; // Removed parentheses
    return 'text-green-600';
  };

  const getDeadlineStatusText = () => {
    if (isDeadlinePassed) return 'Expired'; // Removed parentheses
    if (isDeadlineApproaching) return 'Ending Soon'; // Removed parentheses
    return 'Active';
  };

  if (!deadline) return null;

  return (
    <Badge
      variant="outline"
      className={`text-xs w-fit ${
        isDeadlinePassed
          ? 'bg-red-50 text-red-700 border-red-200'
          : isDeadlineApproaching
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-green-50 text-green-700 border-green-200'
      }`}>
      <Clock className={`w-3 h-3 mr-1 ${getDeadlineStatusColor()}`} />
      {getDeadlineStatusText()}
    </Badge>
  );
}