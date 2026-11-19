import { useEffect } from "react";

const DEFAULT_TITLE = "L. M. College of Pharmacy, Ahmedabad — LMCPAFM";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}