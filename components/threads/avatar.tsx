export function Avatar({ className = "size-10" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block shrink-0 rounded-full bg-[#101010] ${className}`}
    />
  );
}
