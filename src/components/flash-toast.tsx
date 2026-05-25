"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = params.get("success");
    const error = params.get("error");
    if (!success && !error) return;

    if (success) toast.success(decodeURIComponent(success));
    if (error) toast.error(decodeURIComponent(error));

    // Remove the flash params from the URL without a navigation
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());
  }, [params, router]);

  return null;
}
