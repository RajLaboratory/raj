import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        secondary: "border border-[var(--line)] bg-[var(--surface)] hover:bg-brand-50 dark:hover:bg-white/5",
        danger: "bg-red-600 text-white hover:bg-red-700",
        ghost: "hover:bg-brand-50 dark:hover:bg-white/5",
      },
      size: { md: "h-10 px-4", lg: "h-12 px-6 text-base", sm: "h-8 px-3" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({ className, variant, size, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size }), className)} {...p} />;
}
