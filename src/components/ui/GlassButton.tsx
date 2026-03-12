import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const variants = {
      default: "glass-button text-foreground",
      primary: "glass-button bg-primary/90 text-primary-foreground border-primary/30 hover:bg-primary",
      accent: "glass-button bg-accent/90 text-accent-foreground border-accent/30 hover:bg-accent",
      ghost: "glass-button bg-transparent border-transparent hover:bg-foreground/5",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          variants[variant],
          sizes[size],
          "font-medium",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";
