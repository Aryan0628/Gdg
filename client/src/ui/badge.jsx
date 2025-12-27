// src/components/ui/badge.jsx
export function Badge({ children, className = "", ...props }) {
  return (
    <span
      {...props}
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-800 ${className}`}
    >
      {children}
    </span>
  )
}
