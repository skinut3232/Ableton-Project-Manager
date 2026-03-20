import Image from "next/image";

export default function HeroScreenshot() {
  return (
    <div className="mx-auto max-w-[960px]">
      <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
        {/* Window titlebar with traffic light dots */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-border-secondary" />
          <div className="h-2 w-2 rounded-full bg-border-secondary" />
          <div className="h-2 w-2 rounded-full bg-border-secondary" />
        </div>
        {/* App screenshot */}
        <Image
          src="/screenshots/Project_List.jpg"
          alt="SetCrate project library showing tagged and organized Ableton sessions"
          width={960}
          height={540}
          className="block w-full"
          priority
        />
      </div>
    </div>
  );
}
