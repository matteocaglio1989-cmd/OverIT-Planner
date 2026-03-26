"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Avatar({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  src,
  alt = "",
  ref,
  onError,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  ref?: React.Ref<HTMLImageElement>
}) {
  const [hasError, setHasError] = React.useState(false)

  if (hasError || !src) return null

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={(e) => {
        setHasError(true)
        onError?.(e)
      }}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
