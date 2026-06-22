import React from "react";
import { B } from "./brand";

/**
 * Skeleton Screen Components for smooth loading states
 * These provide visual feedback while data is loading
 */

export function SkeletonCard({
  lines = 3,
  height = 200,
}: {
  lines?: number;
  height?: number;
}) {
  return (
    <div
      style={{
        padding: 16,
        background: B.white,
        border: `1px solid ${B.line}`,
        borderRadius: 12,
        height,
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 12,
            background: "linear-gradient(90deg, rgba(0,0,0,.05) 25%, rgba(0,0,0,.1) 50%, rgba(0,0,0,.05) 75%)",
            borderRadius: 6,
            marginBottom: i === lines - 1 ? 0 : 12,
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite",
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ columns = 3, count = 3 }: { columns?: number; count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} style={{ padding: 12, textAlign: "left", borderBottom: `1px solid ${B.line}` }}>
                <div
                  style={{
                    height: 12,
                    width: `${60 + Math.random() * 40}%`,
                    background: "linear-gradient(90deg, rgba(0,0,0,.05) 25%, rgba(0,0,0,.1) 50%, rgba(0,0,0,.05) 75%)",
                    borderRadius: 6,
                    animation: "shimmer 2s infinite",
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} style={{ padding: 12, borderBottom: `1px solid ${B.line}` }}>
                  <div
                    style={{
                      height: 12,
                      width: `${50 + Math.random() * 50}%`,
                      background: "linear-gradient(90deg, rgba(0,0,0,.05) 25%, rgba(0,0,0,.1) 50%, rgba(0,0,0,.05) 75%)",
                      borderRadius: 6,
                      animation: "shimmer 2s infinite",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Smooth Tab Container with fade-in transitions
 */
export function SmoothTabContent({
  isLoading,
  children,
  skeleton = <SkeletonCard />,
}: {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  return (
    <div
      style={{
        opacity: isLoading ? 0 : 1,
        transform: isLoading ? "translateY(4px)" : "translateY(0)",
        transition: "opacity 300ms ease, transform 300ms ease",
        pointerEvents: isLoading ? "none" : "auto",
      }}
    >
      {isLoading ? skeleton : children}
    </div>
  );
}

/**
 * Smooth carousel/slider transition wrapper
 */
export function SmoothCarousel({
  children,
  activeIndex,
}: {
  children: React.ReactNode[];
  activeIndex: number;
}) {
  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {React.Children.map(children, (child, idx) => (
        <div
          key={idx}
          style={{
            opacity: idx === activeIndex ? 1 : 0,
            transform: idx === activeIndex ? "translateX(0)" : "translateX(100%)",
            position: idx === 0 ? "relative" : "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transition: "opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {child}
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/**
 * Page transition wrapper for smooth navigation
 */
export function SmoothPageTransition({
  children,
  key,
}: {
  children: React.ReactNode;
  key?: string;
}) {
  return (
    <div
      key={key}
      style={{
        animation: "fadeInUp 400ms ease-out",
      }}
    >
      {children}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Optimized list item with staggered animation
 */
export function AnimatedListItem({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      style={{
        animation: `fadeInUp 400ms ease-out ${delay}ms both`,
      }}
    >
      {children}
    </div>
  );
}
