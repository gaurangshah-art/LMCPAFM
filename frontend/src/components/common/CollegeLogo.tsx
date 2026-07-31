import { COLLEGE_LOGO_URL, COLLEGE_NAME } from "../../constants/branding";

interface CollegeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClass: Record<NonNullable<CollegeLogoProps["size"]>, string> = {
  sm: "college-logo-sm",
  md: "college-logo-md",
  lg: "college-logo-lg",
};

export function CollegeLogo({ className = "", size = "md" }: CollegeLogoProps) {
  return (
    <img
      src={COLLEGE_LOGO_URL}
      alt={`${COLLEGE_NAME} logo`}
      className={`college-logo ${sizeClass[size]} ${className}`.trim()}
    />
  );
}
