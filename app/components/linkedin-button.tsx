const LINKEDIN_URL = "https://www.linkedin.com/in/aymanmellouk/";

export function LinkedInButton() {
  return (
    <div className="flex w-full justify-center pb-1">
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ayman Mellouk on LinkedIn"
        className="group relative flex items-center justify-start gap-2 rounded bg-sky-700 p-2 pr-6 font-bold text-neutral-50 no-underline transition-colors duration-500 hover:bg-sky-600"
      >
        <svg
          className="h-8 w-8 shrink-0 fill-neutral-50"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <path d="M92.86,0H7.12A7.17,7.17,0,0,0,0,7.21V92.79A7.17,7.17,0,0,0,7.12,100H92.86A7.19,7.19,0,0,0,100,92.79V7.21A7.19,7.19,0,0,0,92.86,0ZM30.22,85.71H15.4V38H30.25V85.71ZM22.81,31.47a8.59,8.59,0,1,1,8.6-8.59A8.6,8.6,0,0,1,22.81,31.47Zm63,54.24H71V62.5c0-5.54-.11-12.66-7.7-12.66s-8.91,6-8.91,12.26V85.71H39.53V38H53.75v6.52H54c2-3.75,6.83-7.7,14-7.7,15,0,17.79,9.89,17.79,22.74Z" />
        </svg>

        <span className="border-l-2 border-neutral-50/40 px-1 text-sm sm:text-base">
          Ayman Mellouk
        </span>

        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-16 z-10 inline-block -translate-x-1/2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-500 before:absolute before:-top-1 before:left-1/2 before:h-3 before:w-3 before:-translate-x-1/2 before:rotate-45 before:bg-sky-600 before:content-[''] group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          See my profile!
        </span>
      </a>
    </div>
  );
}
