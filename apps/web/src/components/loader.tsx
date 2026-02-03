import { Loading03 } from "@untitledui/icons";

export default function Loader() {
  return (
    <div className="flex h-full items-center justify-center pt-8">
      <Loading03 className="size-5 animate-spin text-fg-brand-primary" />
    </div>
  );
}
