import { Link } from "react-router-dom";

/**
 * Renders the consent sentence with the two document names as links.
 *
 * Word order differs across the ten languages — Arabic, Japanese and German do
 * not put the document names where English does — so the sentence is split on
 * its {terms} and {privacy} placeholders rather than assembled from fragments.
 *
 * The links open in a new tab and stop propagation, so reading the Terms does
 * not toggle the checkbox they sit inside, or lose what the user has typed.
 *
 * Shared by the signup form and the consent gate so both render it identically.
 */
export function renderLegalLinks(template: string, termsLabel: string, privacyLabel: string) {
  const linkClass = "underline hover:text-primary";
  return template.split(/(\{terms\}|\{privacy\})/g).map((part, i) => {
    if (part === "{terms}" || part === "{privacy}") {
      const isTerms = part === "{terms}";
      return (
        <Link
          key={i}
          to={isTerms ? "/terms" : "/privacy"}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {isTerms ? termsLabel : privacyLabel}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
