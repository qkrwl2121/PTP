import type { ButtonProps } from "./Button.types";

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-90 disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)]",
  secondary:
    "bg-surface-2 text-text shadow-[inset_0_0_0_1px_var(--color-border)] hover:opacity-90",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-[56px] items-center justify-center rounded-pill px-[22px]",
        "text-sm font-bold uppercase tracking-[1.4px]",
        "transition-opacity duration-[180ms]",
        fullWidth ? "w-full" : "w-fit",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
