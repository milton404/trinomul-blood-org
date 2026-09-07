import { BloodDropLoading } from "@/components/ui/BloodDropLoading";

export default function MainLoading() {
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-6">
      <BloodDropLoading
        label="Loading"
        sublabel="Trinomul Blood Bank Rangpur"
        size={88}
      />
    </div>
  );
}
