import { COLLEGE_NAME, SYSTEM_NAME } from "../../constants/branding";
import { CollegeLogo } from "./CollegeLogo";

interface InstitutionBannerProps {
  compact?: boolean;
}

export function InstitutionBanner({ compact = false }: InstitutionBannerProps) {
  return (
    <header
      className={`institution-banner${compact ? " institution-banner-compact" : ""}`}
      aria-label="Institution"
    >
      <CollegeLogo size="lg" />
      <div className="institution-banner-text">
        <p className="institution-name">{COLLEGE_NAME}</p>
        {!compact ? <p className="institution-system">{SYSTEM_NAME}</p> : null}
      </div>
    </header>
  );
}
