import { INSTITUTIONAL_DEFAULTS } from "../../constants/institution";

interface Props {
  establishmentName?: string;
  establishmentAddress?: string;
  registrationNumber?: string;
  registrationDate?: string;
  animalHousingLocation?: string;
  experimentLocation?: string;
}

export function InstitutionalFieldsPanel({
  establishmentName = INSTITUTIONAL_DEFAULTS.establishmentName,
  establishmentAddress = INSTITUTIONAL_DEFAULTS.establishmentAddress,
  registrationNumber = INSTITUTIONAL_DEFAULTS.registrationNumber,
  registrationDate = INSTITUTIONAL_DEFAULTS.registrationDate,
  animalHousingLocation = INSTITUTIONAL_DEFAULTS.animalHousingLocation,
  experimentLocation = INSTITUTIONAL_DEFAULTS.experimentLocation,
}: Props) {
  return (
    <div className="info-card full-width">
      <strong>Institutional details (applied automatically)</strong>
      <p><strong>Establishment:</strong> {establishmentName}</p>
      <p><strong>Address:</strong> {establishmentAddress}</p>
      <p><strong>CPCSEA registration:</strong> {registrationNumber}</p>
      <p><strong>Registration date:</strong> {registrationDate}</p>
      <p><strong>Animals housed at:</strong> {animalHousingLocation}</p>
      <p><strong>Experiment location:</strong> {experimentLocation}</p>
    </div>
  );
}
