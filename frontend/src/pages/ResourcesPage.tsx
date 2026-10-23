import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import {
  getResourceCatalog,
  getResourceDocument,
  type ResourceCatalogItem,
  type ResourceDocument,
} from "../api/resourcesApi";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";
import { QaSopPackDownloadPanel } from "../components/common/QaSopPackDownloadPanel";
import type { User } from "../api/types";

interface ResourcesPageProps {
  currentUser: User | null;
}

function groupByCategory(items: ResourceCatalogItem[]): Map<string, ResourceCatalogItem[]> {
  const map = new Map<string, ResourceCatalogItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}

export function ResourcesPage({ currentUser }: ResourcesPageProps) {
  const { docSlug } = useParams<{ docSlug?: string }>();
  const [catalog, setCatalog] = useState<ResourceCatalogItem[]>([]);
  const [guide, setGuide] = useState<ResourceDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => groupByCategory(catalog), [catalog]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const items = await getResourceCatalog();
        if (cancelled) return;
        setCatalog(items);

        if (docSlug) {
          const doc = await getResourceDocument(docSlug);
          if (!cancelled) setGuide(doc);
        } else {
          setGuide(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
          setGuide(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [docSlug]);

  if (loading) {
    return <LoadingState label="Loading guides..." />;
  }

  if (error && !guide && docSlug) {
    return (
      <div className="page-grid">
        <ErrorAlert message={error} />
        <Link to="/resources" className="btn btn-secondary">
          Back to guide list
        </Link>
      </div>
    );
  }

  function handleSaveAsPdf() {
    document.body.classList.add("resources-print-mode");
    window.print();
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("resources-print-mode");
      },
      { once: true },
    );
  }

  return (
    <div className={`page-grid resources-page${guide ? " resources-page--doc" : ""}`}>
      <PageHeader
        eyebrow="Ready reference"
        title={guide ? guide.title : "SOPs & user guides"}
        subtitle={
          guide
            ? guide.summary
            : "Standard operating procedures for your role. Do not share outside the college."
        }
        actions={
          guide ? (
            <div className="inline-actions">
              <button type="button" className="btn" onClick={handleSaveAsPdf}>
                Save as PDF
              </button>
              <Link to="/resources" className="btn btn-secondary">
                All guides
              </Link>
            </div>
          ) : null
        }
      />

      {error && !docSlug ? <ErrorAlert message={error} /> : null}

      {guide ? (
        <>
          <p className="field-help resources-pdf-hint">
            <strong>Save as PDF:</strong> use the button above, or press{" "}
            <kbd>Ctrl</kbd>+<kbd>P</kbd> (Mac: <kbd>⌘</kbd>+<kbd>P</kbd>), choose{" "}
            <strong>Save as PDF</strong> / <strong>Microsoft Print to PDF</strong> as the printer,
            then Save.
          </p>
          <article
            className="page-card markdown-doc resources-print-target"
            dangerouslySetInnerHTML={{ __html: guide.html }}
          />
        </>
      ) : (
        <>
          <QaSopPackDownloadPanel />

          <p className="field-help">
            To read online, open a guide below. To share with QA, prefer{" "}
            <strong>Download QA SOP pack (zip)</strong> above.
          </p>
          {catalog.length === 0 ? (
            <div className="page-card">
              <p>No guides are available on this server. Contact the LMCPAFM coordinator.</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <section key={category} className="page-section">
                <h3>{category}</h3>
                <ul className="resources-doc-list">
                  {items.map((item) => (
                    <li key={item.slug}>
                      <Link to={`/resources/${item.slug}`} className="resources-doc-link">
                        <strong>{item.title}</strong>
                        <span>{item.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          {currentUser?.roles.some((role) => role === "staff" || role === "admin") ? (
            <section className="page-card">
              <h3>Facility SOP zip</h3>
              <p className="muted-text">
                Staff may also download the bundled facility markdown pack for offline PDF export.
              </p>
              <Link to="/staff/sop-pack" className="btn btn-secondary">
                Download facility SOP pack
              </Link>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
