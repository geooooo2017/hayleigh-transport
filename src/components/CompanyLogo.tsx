import { COMPANY_SHORT_NAME, LOGO_PATH } from "../lib/companyBrand";

type Props = {
  className?: string;
  alt?: string;
};

/** Hayleigh Transport wordmark (`public/ht-logo.png`). */
export function CompanyLogo({ className, alt = COMPANY_SHORT_NAME }: Props) {
  return <img src={LOGO_PATH} alt={alt} className={className} decoding="async" />;
}
