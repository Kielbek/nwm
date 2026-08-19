/** Matches the breakpoint AppShellComponent uses to switch the sidebar/ask panel between push and overlay layouts. */
export const MOBILE_BREAKPOINT = 780;

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
}
