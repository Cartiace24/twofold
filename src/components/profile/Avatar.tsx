import { cn } from "../../lib/utils";

export function Avatar({
  src,
  alt,
  name,
  size = 72,
  className,
  frame = "square",
}: {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: number;
  className?: string;
  frame?: "square" | "polaroid";
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const isPolaroid = frame === "polaroid";

  return (
    <span
      aria-hidden={src ? undefined : true}
      className={cn(
        "relative inline-grid place-items-center overflow-hidden bg-[#F3EBDD] border border-[#E5DAC6] shadow-sm shrink-0",
        isPolaroid ? "p-1.5 pb-3 bg-[#FFFEFA] rotate-[-0.7deg]" : "rotate-[0.5deg]",
        className
      )}
      style={{ width: size, height: isPolaroid ? size + 14 : size }}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? (name ? `${name}'s profile photo` : "Profile photo")}
          className={cn("w-full h-full object-cover", isPolaroid ? "border border-[#E5DAC6]" : "")}
          loading="lazy"
        />
      ) : (
        <span className="grid place-items-center w-full h-full font-display font-bold text-[#8B5E3C]" style={{ fontSize: Math.round(size * 0.32) }}>
          {initial}
        </span>
      )}
      {/* subtle paper grain overlay */}
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: "radial-gradient(rgba(139,94,60,0.5) 1px, transparent 1.5px)", backgroundSize: "14px 14px" }} />
    </span>
  );
}
