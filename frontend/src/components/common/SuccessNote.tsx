interface SuccessNoteProps {
  message: string;
}

export function SuccessNote({ message }: SuccessNoteProps) {
  return (
    <div className="alert alert-success" role="status">
      {message}
    </div>
  );
}
