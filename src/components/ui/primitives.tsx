import * as React from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "wine";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cn(
        "touch inline-flex items-center justify-center gap-2 px-5 text-[15px] font-semibold tracking-wide transition active:scale-[0.98] disabled:opacity-60",
        variant === "primary" && "bg-[#2B2622] text-[#FAF6EF] hover:bg-[#4A423B]",
        variant === "secondary" && "bg-[#FFFDF7] text-[#2B2622] border border-[#E5DAC6] hover:bg-[#F3EBDD]",
        variant === "ghost" && "bg-transparent text-[#4A423B] hover:bg-[#F3EBDD] px-3",
        variant === "wine" && "bg-[#7D2E3B] text-[#FFFDF7] hover:bg-[#64232e]",
        "rounded-[3px]",
        className
      )}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[#8A7F72] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[13px] text-[#8A7F72]">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "touch w-full bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] px-4 text-[16px] text-[#2B2622] placeholder:text-[#B6AA99] outline-none focus:border-[#7D2E3B] focus:ring-2 focus:ring-[#7D2E3B]/15";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "min-h-[110px] py-3 leading-relaxed", props.className)} />;
}

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus the panel for a11y
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={title ? "sheet-title" : undefined}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#2B2622]/55 backdrop-blur-[1px]" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full sm:max-w-lg bg-[#FAF6EF] border-t sm:border border-[#E5DAC6] rounded-t-[14px] sm:rounded-[6px] max-h-[92dvh] overflow-y-auto no-scrollbar shadow-2xl outline-none"
      >
        <div className="sticky top-0 bg-[#FAF6EF]/95 backdrop-blur px-5 pt-3 pb-3 border-b border-[#E5DAC6] z-10">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#E5DAC6] sm:hidden" aria-hidden />
          <div className="flex items-center justify-between">
            <h3 id="sheet-title" className="font-display text-[20px] font-semibold">{title}</h3>
            <button onClick={onClose} className="touch min-h-[44px] px-3 text-[15px] font-semibold text-[#8A7F72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] rounded-[3px]">
              Close
            </button>
          </div>
        </div>
        <div className="px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="paper-card px-6 py-10 text-center">
      <div className="font-hand text-[30px] leading-none text-[#7D2E3B] mb-2">♡</div>
      <h3 className="font-display text-[19px] font-semibold mb-1">{title}</h3>
      <p className="text-[14.5px] text-[#8A7F72] max-w-[30ch] mx-auto">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
