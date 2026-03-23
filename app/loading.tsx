import { PageLoading } from "@/components/common/page-loading";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background">
      <PageLoading />
    </div>
  );
}
