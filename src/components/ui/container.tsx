import type { ElementType, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/**
 * The page "shell": centered, max 1500px, responsive gutters. Mirrors the
 * prototype's `.shell`. Sections that go full-bleed opt out by not using this.
 */
type ContainerProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export function Container<T extends ElementType = "div">({
  as,
  className,
  ...props
}: ContainerProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn(
        "mx-auto w-full max-w-[1500px] px-6 sm:px-14 xl:px-[92px]",
        className,
      )}
      {...props}
    />
  );
}
