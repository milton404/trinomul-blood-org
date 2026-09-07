import { BloodDropLoading } from "@/components/ui/BloodDropLoading";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-6">
      <BloodDropLoading
        label="Loading"
        sublabel="Admin Panel"
        size={80}
      />
    </div>
  );
}
