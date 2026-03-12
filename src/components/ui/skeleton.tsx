import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "animate-shimmer bg-gradient-to-r from-white/0 via-white/10 to-white/0 bg-[length:200%_100%] rounded-md", 
        className
      )} 
      {...props} 
    />
  );
}

export { Skeleton };
