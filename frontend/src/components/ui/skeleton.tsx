import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", className)}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="glassmorphism p-6 space-y-4">
      <div className="skeleton skeleton-heading"></div>
      <div className="skeleton skeleton-text w-full"></div>
      <div className="skeleton skeleton-text w-3/4"></div>
      <div className="skeleton skeleton-text w-1/2"></div>
      <div className="flex space-x-2 mt-4">
        <div className="skeleton h-10 w-24"></div>
        <div className="skeleton h-10 w-24"></div>
      </div>
    </div>
  )
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="skeleton h-12 w-12 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="skeleton skeleton-text w-3/4"></div>
            <div className="skeleton skeleton-text w-1/2"></div>
          </div>
          <div className="skeleton h-8 w-20"></div>
        </div>
      ))}
    </div>
  )
}

