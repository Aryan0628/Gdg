import * as React from "react"

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative overflow-hidden ${className || ""}`}
    {...props}
  >
    <div className="h-full w-full overflow-y-auto scrollbar-hide">
      {children}
    </div>
    <style jsx>{`
      .scrollbar-hide::-webkit-scrollbar {
          display: none;
      }
      .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
      }
    `}</style>
  </div>
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }