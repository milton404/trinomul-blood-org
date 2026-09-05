import { BloodDropLoading } from "@/components/ui/BloodDropLoading";
import { StatsBarSkeleton, CardGridSkeleton } from "@/components/ui/Skeleton";

export default function MainLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-4">
      <div className="pt-6 pb-2">
        <BloodDropLoading
          label="Loading"
          sublabel="Trinomul Blood Bank Rangpur"
        />
      </div>
      <StatsBarSkeleton count={4} />
      <CardGridSkeleton count={6} />
    </div>
  );
}