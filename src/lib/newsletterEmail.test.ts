import { describe, expect, it } from "vitest";
import { markdownToEmailHtml, renderNewsletterEmail, NEWSLETTER_FROM } from "../../supabase/functions/_shared/newsletter-email";

const md = `Intro paragraph.
Second line.

## What is homeschooling?

- **Flexibility** — you choose.
- *Personalized* learning

1. First
2. Second

Visit [our site](https://www.independentmindsedu.org) today.`;

describe("newsletter email template", () => {
  it("turns Markdown into HTML: headings, bold, italic, lists, links, line breaks", () => {
    const html = markdownToEmailHtml(md);
    expect(html).toMatch(/<h3[^>]*>What is homeschooling\?<\/h3>/);
    expect(html).toMatch(/<ul[^>]*><li[^>]*><strong[^>]*>Flexibility<\/strong> — you choose\.<\/li><li[^>]*><em>Personalized<\/em> learning<\/li><\/ul>/);
    expect(html).toMatch(/<ol[^>]*><li[^>]*>First<\/li><li[^>]*>Second<\/li><\/ol>/);
    expect(html).toContain('<a href="https://www.independentmindsedu.org"');
    expect(html).toContain("Intro paragraph.<br>Second line.");
    // no raw Markdown markers left in the output
    expect(html).not.toMatch(/\*\*|^#|>#|\]\(/m);
  });

  it("escapes HTML in the draft and ignores non-http links", () => {
    const html = markdownToEmailHtml('<script>alert(1)</script> [x](javascript:alert(1))');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="javascript');
  });

  it("renders the full email in the recipient's language, RTL for Arabic", () => {
    const en = renderNewsletterEmail({ title: "Hello & welcome", markdown: md, language: "EN" });
    expect(en.from).toBe(NEWSLETTER_FROM);
    // Newsletter sender is hello@ (transactional emails stay on noreply@).
    expect(NEWSLETTER_FROM).toBe("Independent Minds EDU <hello@independentmindsedu.org>");
    expect(en.subject).toBe("Hello & welcome");
    expect(en.html).toContain('<html lang="en" dir="ltr">');
    expect(en.html).toContain("Hello &amp; welcome</h1>");
    expect(en.html).toContain("Visit Independent Minds EDU");
    expect(en.html).not.toContain("Unsubscribe"); // only with a per-recipient link
    const ht = renderNewsletterEmail({ title: "Bonjou", markdown: md, language: "ht", unsubscribeUrl: "https://x.test/u?t=1&a=2" });
    expect(ht.html).toContain('<html lang="ht"');
    expect(ht.html).toContain("Vizite Independent Minds EDU");
    expect(ht.html).toContain('href="https://x.test/u?t=1&amp;a=2"');
    expect(ht.html).toContain("Dezabòne");
    const ar = renderNewsletterEmail({ title: "مرحبا", markdown: "نص", language: "AR" });
    expect(ar.html).toContain('dir="rtl"');
    expect(renderNewsletterEmail({ title: "x", markdown: "y", language: "xx" }).html).toContain('lang="en"');
  });
});
