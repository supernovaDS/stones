import clsx from "clsx";

export function BentoCard({ children, className = "", span, ...props }) {
  return (
    <section
      className={clsx(
        "bento-card hover-static bg-white text-black dark:bg-[#12151a] dark:text-[#c8c3ba]",
        span && `span-${span}`,
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
