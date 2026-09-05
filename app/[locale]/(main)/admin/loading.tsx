import { BloodDropLoading } from "@/components/ui/BloodDropLoading";
import { StatsBarSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-8 p-4">
      <div className="pt-6 pb-2">
        <BloodDropLoading
          label="Loading"
          sublabel="Admin Panel"
          size={64}
        />
      </div>
      <StatsBarSkeleton count={4} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}