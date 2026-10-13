import { Link } from "react-router-dom";

interface FormBSubmittedNoticeProps {
  formBId: number;
}

export function FormBSubmittedNotice({ formBId }: FormBSubmittedNoticeProps) {
  return (
    <div className="notice-banner warning-banner" role="status">
      <p>
        This Form B has been submitted to IAEC and cannot be edited. You can review the saved
        application or download the PDF.
      </p>
      <div className="table-actions">
        <Link className="btn btn-sm" to={`/form-b/view?formBId=${formBId}`}>
          View submitted Form B
        </Link>
      </div>
    </div>
  );
}
