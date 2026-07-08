import { Helmet } from "react-helmet-async";
import { buildAppUrl } from "@/lib/siteUrl";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
}

/**
 * Per-route head tags. Sets unique title, description, canonical and og:* per page.
 */
export function SEO({ title, description, path, ogType = "website" }: SEOProps) {
  const url = buildAppUrl(path);
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
