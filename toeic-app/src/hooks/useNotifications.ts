import { useState, useEffect, useCallback } from "react";

export type NotificationState = "unsupported" | "default" | "granted" | "denied";

/**
 * Manages notification permission and schedules the daily nag via the SW.
 *
 * Returns:
 *  - permission: current Notification.permission state
 *  - requestPermission: call this from a user click to trigger the browser prompt
 */
export function useNotifications(studyDone: boolean | null, targetHour = 21) {
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;

  const [permission, setPermission] = useState<NotificationState>(
    supported ? (Notification.permission as NotificationState) : "unsupported"
  );

  // After permission changes or studyDone changes, update the SW schedule
  useEffect(() => {
    if (!supported || studyDone === null || permission !== "granted") return;

    async function syncSW() {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: "SCHEDULE_NAG", studyDone, targetHour });
    }
    syncSW().catch(() => {});
  }, [supported, permission, studyDone, targetHour]);

  // Must be called from a user gesture (button click) to show the browser prompt
  const requestPermission = useCallback(async () => {
    if (!supported || permission !== "default") return;
    const result = await Notification.requestPermission();
    setPermission(result as NotificationState);
  }, [supported, permission]);

  return { permission, requestPermission };
}
