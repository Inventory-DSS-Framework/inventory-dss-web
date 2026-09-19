/**
 * Onboarding state. A brand-new account is sent to the full-screen welcome flow
 * (/welcome); from there the user can launch the in-app guided tour. Both can be
 * replayed from Ajustes or the command palette. Completion is also saved server-side
 * (preference "onboarding") so a second device doesn't repeat it.
 */

const ONBOARDING_KEY = "dss-onboarding";
const TOUR_KEY = "dss-tour";
export const ONBOARDING_PREF = "onboarding";
export const TOUR_EVENT = "dss:tour";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the flow still works for this session */
  }
}

/** Call right after a successful registration. */
export const markOnboardingPending = () => write(ONBOARDING_KEY, "pending");
export const isOnboardingPending = () => read(ONBOARDING_KEY) === "pending";
export const completeOnboarding = () => write(ONBOARDING_KEY, "done");

/** Queue the coach-mark tour; it starts on the next app screen (or now, if mounted). */
export function startGuidedTour() {
  write(TOUR_KEY, "pending");
  window.dispatchEvent(new Event(TOUR_EVENT));
}
export const isTourPending = () => read(TOUR_KEY) === "pending";
export const finishTour = () => write(TOUR_KEY, "done");
