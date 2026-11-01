import { Plus, Rss } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useAddRssSource } from "@/features/sources/hooks/useContentSources";
import styles from "@/pages/sources/SourcesPage.module.css";

export function CustomRssForm() {
  const { t } = useTranslation();
  const mutation = useAddRssSource();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await mutation.mutateAsync({ name, url });
    setName("");
    setUrl("");
  };

  return (
    <section className={styles.customSourcePanel} aria-labelledby="custom-rss-title">
      <header><span><Rss aria-hidden="true" size="var(--icon-size-lg)" /></span><div><h2 id="custom-rss-title">{t("sources.customRssTitle")}</h2><p>{t("sources.customRssDescription")}</p></div></header>
      <form onSubmit={(event) => void submit(event)}>
        <label><span>{t("sources.customRssName")}</span><input maxLength={80} minLength={2} onChange={(event) => setName(event.target.value)} required value={name} /></label>
        <label><span>{t("sources.customRssUrl")}</span><input onChange={(event) => setUrl(event.target.value)} pattern="https://.*" placeholder="https://example.com/feed.xml" required type="url" value={url} /></label>
        <button disabled={mutation.isPending} type="submit"><Plus aria-hidden="true" size="var(--icon-size-sm)" />{mutation.isPending ? t("sources.addingRss") : t("sources.addRss")}</button>
      </form>
      {mutation.isError ? <p className={styles.inlineError} role="alert">{t("sources.customRssError")}</p> : null}
    </section>
  );
}
