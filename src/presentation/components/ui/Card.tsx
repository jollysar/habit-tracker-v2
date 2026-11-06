import type { HTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("solid-panel rounded-[1.75rem] shadow-soft", className)}
      {...props}
    />
  );
}
