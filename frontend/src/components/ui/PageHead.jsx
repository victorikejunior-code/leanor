/** Shared page banner used by every non-home page. */
export default function PageHead({ eyebrow, title, lead }) {
  return (
    <header className="page-head">
      <div className="container">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="fx-shimmer">{title}</h1>
        {lead && <p>{lead}</p>}
      </div>
    </header>
  );
}