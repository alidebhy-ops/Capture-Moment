import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DataLoadNotice({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="data-load-notice" role="alert">
      <span><AlertTriangle size={20} /></span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <a href=""><RotateCcw size={15} /> Muat ulang</a>
    </div>
  );
}
