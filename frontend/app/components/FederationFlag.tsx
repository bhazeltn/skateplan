/**
 * FederationFlag Component
 *
 * Displays country flags using the flagcdn.com API based on ISO country codes.
 *
 * Usage:
 *   <FederationFlag iso_code="ca" size="small" />
 *   <FederationFlag iso_code="us" size="medium" />
 *
 * API: https://flagcdn.com/{size}/{iso_code}.svg
 * Sizes: w20 (20px), w40 (40px), w80 (80px)
 */

interface FederationFlagProps {
  iso_code: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function FederationFlag({
  iso_code,
  size = 'small',
  className = ''
}: FederationFlagProps) {
  const sizeMap = {
    small: { cdn: 'w20', px: 20 },
    medium: { cdn: 'w40', px: 40 },
    large: { cdn: 'w80', px: 80 }
  };

  const sizeConfig = sizeMap[size];
  const flagUrl = `https://flagcdn.com/${sizeConfig.cdn}/${iso_code.toLowerCase()}.svg`;

  return (
    <img
      src={flagUrl}
      alt={`${iso_code} flag`}
      className={`inline-block ${className}`}
      style={{
        width: `${sizeConfig.px}px`,
        height: 'auto',
        verticalAlign: 'middle'
      }}
      onError={(e) => {
        // Hide if flag doesn't load (fallback to no icon)
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
