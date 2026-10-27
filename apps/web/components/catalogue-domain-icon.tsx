export function CatalogueDomainIcon({ category }: { category: string }): React.ReactElement {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {category === "DEV" ? (
        <>
          <path d="m10 8-8 8 8 8m12-16 8 8-8 8M19 4l-6 24" />
        </>
      ) : category === "CYBERSEC" ? (
        <>
          <path d="M16 2 28 7v9c0 7-12 14-12 14S4 23 4 16V7L16 2Z" />
          <path d="m10 16 4 4 8-9" />
        </>
      ) : category === "NETWORK" ? (
        <>
          <path d="M16 9v7M6 23v-7h20v7" />
          <path d="M12 2h8v7h-8zM2 23h8v7H2zm20 0h8v7h-8z" />
        </>
      ) : (
        <path d="M3 3h10v10H3zm16 0h10v10H19zM3 19h10v10H3zm16 0h10v10H19z" />
      )}
    </svg>
  );
}
