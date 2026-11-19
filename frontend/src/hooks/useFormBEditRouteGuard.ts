import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useFormBEditRouteGuard(
  formBId: number | null,
  submitted: boolean,
  validating: boolean,
) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!validating && formBId && submitted) {
      navigate(`/form-b/view?formBId=${formBId}`, { replace: true });
    }
  }, [formBId, submitted, validating, navigate]);
}
