import { Plus, Rss } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useAddFeedSource } from "@/features/sources/hooks/useContentSources";
import styles from "@/pages/sources/SourcesPage.module.css";
import type { CustomFeedKind } from "@/types/content";

export function CustomFeedForm() {
  const { t } = useTranslation();
  const mutation = useAddFeedSource();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sourceKind, setSourceKind] = useState<CustomFeedKind>("rss");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await mutation.mutateAsync({ name, url, sourceKind });
    setName("");
    setUrl("");
  };

  return (
    <section aria-labelledby="custom-feed-title" className={styles.customSourcePanel}>
      <header>
        <span><Rss aria-hidden="true" size="var(--icon-size-lg)" /></span>
        <div>
          <h2 id="custom-feed-title">{t("sources.customFeedTitle")}</h2>
          <p>{t("sources.customFeedDescription")}</p>
        </div>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          <span>{t("sources.customFeedKind")}</span>
          <select onChange={(event) => setSourceKind(event.target.value as CustomFeedKind)} value={sourceKind}>
            <option value="rss">{t("sources.customFeedKinds.rss")}</option>
            <option value="forum">{t("sources.customFeedKinds.forum")}</option>
          </select>
        </label>
        <label>
          <span>{t("sources.customRssName")}</span>
          <input maxLength={80} minLength={2} onChange={(event) => setName(event.target.value)} required value={name} />
        </label>
        <label>
          <span>{t("sources.customRssUrl")}</span>
          <input onChange={(event) => setUrl(event.target.value)} pattern="https://.*" placeholder="https://example.com/feed.xml" required type="url" value={url} />
        </label>
        <button disabled={mutation.isPending} type="submit">
          <Plus aria-hidden="true" size="var(--icon-size-sm)" />
          {mutation.isPending ? t("sources.addingRss") : t("sources.addRss")}
        </button>
      </form>
      {mutation.isError ? <p className={styles.inlineError} role="alert">{t("sources.customRssError")}</p> : null}
    </section>
  );
}
