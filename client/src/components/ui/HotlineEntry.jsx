import { isDialable } from "../../utils/hotline";

// The only way a hotline is rendered. A dialable row (non-sample with a tel) is a tel: link whose
// target is the shown number without spaces and dashes; a sample row is plain text with a tag,
// for every role, so no consumer can turn a placeholder into a dial link.

export function SampleTag({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-current/40 px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none whitespace-nowrap ${className}`}
    >
      Sample, not yet configured
    </span>
  );
}

// className applies to both forms; linkClassName (underline, hover) only to the tel: link.
// children may be a function that receives the sample tag (null when dialable) to place it.
export default function HotlineEntry({ contact, className = "", linkClassName = "", tagClassName = "", children, ...linkProps }) {
  const dialable = isDialable(contact);
  const tag = dialable ? null : <SampleTag className={tagClassName} />;
  const placed = typeof children === "function";
  const content = placed ? children(tag) : (children ?? contact.phone);
  if (dialable) {
    return (
      <a href={`tel:${contact.tel}`} className={`${className} ${linkClassName}`} {...linkProps}>
        {content}
      </a>
    );
  }
  if (placed) return <div className={className}>{content}</div>;
  return (
    <span className={`${className} flex-wrap gap-x-2 gap-y-1`}>
      <span>{content}</span>
      {tag}
    </span>
  );
}
