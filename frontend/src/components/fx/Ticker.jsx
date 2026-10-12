/**
 * Endless horizontal ticker. The list is rendered twice so the -50%
 * translate loops seamlessly; the duplicate is hidden from assistive tech.
 */
export default function Ticker({ items }) {
  if (!items?.length) return null;

  const group = (ariaHidden) => (
    <ul className="ticker__group" aria-hidden={ariaHidden || undefined}>
      {items.map((label) => (
        <li className="ticker__item" key={`${ariaHidden}-${label}`}>
          {label}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="ticker" aria-label="What the form accepts">
      <div className="ticker__track">
        {group("a")}
        {group("b")}
      </div>
    </div>
  );
}
