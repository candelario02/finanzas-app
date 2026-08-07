import "./Toast.css";

export default function Toast({ toast }) {
  if (!toast) return null;

  const icon =
    toast.type === "success"
      ? "\u2705"
      : toast.type === "error"
        ? "\u274C"
        : "\u2139\uFE0F";

  return (
    <div className="toast-overlay">
      <div className={`toast-box ${toast.type}`}>
        <span>{icon}</span>
        <div className="toast-text">{toast.msg}</div>
      </div>
    </div>
  );
}
