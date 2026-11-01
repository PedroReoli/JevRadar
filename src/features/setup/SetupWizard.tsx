import { ArrowLeft, ArrowRight, Check, KeyRound, Radar, ShieldCheck } from "lucide-react";
import { useState, type CSSProperties, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useSaveSecret, useSecretStatusQuery, useUpdateAppSettings } from "@/hooks/useAppSettings";
import styles from "@/features/setup/SetupWizard.module.css";
import type { AppSettings, ExperienceLevel, InvestmentRange } from "@/types/settings";

interface SetupWizardProps {
  initialSettings: AppSettings;
}

const totalSteps = 5;

export function SetupWizard({ initialSettings }: SetupWizardProps) {
  const { i18n, t } = useTranslation();
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState(initialSettings);
  const [typesafeApiKey, setTypesafeApiKey] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const updateSettings = useUpdateAppSettings();
  const saveSecret = useSaveSecret();
  const secretStatus = useSecretStatusQuery();

  const changeLanguage = (language: AppSettings["language"]) => {
    setSettings((current) => ({ ...current, language }));
    void i18n.changeLanguage(language);
  };

  const finishSetup = async () => {
    setSubmissionError(null);
    try {
      if (typesafeApiKey.trim()) {
        await saveSecret.mutateAsync({ kind: "typesafeApiKey", value: typesafeApiKey });
      }
      await updateSettings.mutateAsync({ ...settings, setupCompleted: true });
    } catch {
      setSubmissionError(t("setup.finishError"));
    }
  };

  const isSubmitting = updateSettings.isPending || saveSecret.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < totalSteps - 1) {
      setStep((current) => current + 1);
      return;
    }
    void finishSetup();
  };

  return (
    <main className={styles.shell}>
      <form className={styles.wizard} aria-labelledby="setup-title" onSubmit={handleSubmit}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <Radar size="var(--icon-size-lg)" />
            </span>
            <strong>JevRadar</strong>
          </div>
          <div className={styles.progressText}>
            {t("setup.progress", { current: step + 1, total: totalSteps })}
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ "--setup-progress": `${((step + 1) / totalSteps) * 100}%` } as CSSProperties} />
          </div>
        </header>

        <div className={styles.content}>
          {step === 0 && (
            <div className={styles.step}>
              <span className={styles.stepIcon}><Radar aria-hidden="true" size="var(--icon-size-xl)" /></span>
              <span className={styles.eyebrow}>{t("setup.welcomeEyebrow")}</span>
              <h1 id="setup-title">{t("setup.welcomeTitle")}</h1>
              <p>{t("setup.welcomeDescription")}</p>
              <div className={styles.notice}>
                <ShieldCheck aria-hidden="true" size="var(--icon-size-md)" />
                <span>{t("setup.disclosure")}</span>
              </div>
              <fieldset className={styles.languageFieldset}>
                <legend>{t("settings.language")}</legend>
                <div className={styles.choiceGrid}>
                  <ChoiceButton
                    active={settings.language === "pt-BR"}
                    label={t("settings.portuguese")}
                    onClick={() => changeLanguage("pt-BR")}
                  />
                  <ChoiceButton
                    active={settings.language === "en"}
                    label={t("settings.english")}
                    onClick={() => changeLanguage("en")}
                  />
                </div>
              </fieldset>
            </div>
          )}

          {step === 1 && (
            <div className={styles.step}>
              <span className={styles.eyebrow}>{t("setup.profileEyebrow")}</span>
              <h1 id="setup-title">{t("setup.profileTitle")}</h1>
              <p>{t("setup.profileDescription")}</p>
              <SelectField
                label={t("setup.experienceLabel")}
                onChange={(value) => setSettings((current) => ({ ...current, experienceLevel: value as ExperienceLevel }))}
                options={[
                  ["beginner", t("setup.experienceBeginner")],
                  ["intermediate", t("setup.experienceIntermediate")],
                  ["advanced", t("setup.experienceAdvanced")],
                ]}
                value={settings.experienceLevel}
              />
              <SelectField
                label={t("setup.investmentLabel")}
                onChange={(value) => setSettings((current) => ({ ...current, investmentRange: value as InvestmentRange }))}
                options={[
                  ["undisclosed", t("setup.investmentUndisclosed")],
                  ["upTo5k", t("setup.investmentUpTo5k")],
                  ["from5kTo20k", t("setup.investment5kTo20k")],
                  ["from20kTo100k", t("setup.investment20kTo100k")],
                  ["above100k", t("setup.investmentAbove100k")],
                ]}
                value={settings.investmentRange}
              />
              <p className={styles.helper}>{t("setup.investmentPrivacy")}</p>
            </div>
          )}

          {step === 2 && (
            <div className={styles.step}>
              <span className={styles.stepIcon}><KeyRound aria-hidden="true" size="var(--icon-size-xl)" /></span>
              <span className={styles.eyebrow}>{t("setup.jevEyebrow")}</span>
              <h1 id="setup-title">{t("setup.jevTitle")}</h1>
              <p>{t("setup.jevDescription")}</p>
              <label className={styles.inputField}>
                <span>{t("setup.jevKeyLabel")}</span>
                <input
                  autoComplete="off"
                  onChange={(event) => setTypesafeApiKey(event.target.value)}
                  placeholder={secretStatus.data?.typesafeApiKey ? t("setup.jevKeyConfigured") : "ts_••••••••"}
                  type="password"
                  value={typesafeApiKey}
                />
              </label>
              <p className={styles.helper}>{t("setup.jevKeySecurity")}</p>
            </div>
          )}

          {step === 3 && (
            <div className={styles.step}>
              <span className={styles.eyebrow}>{t("setup.operationEyebrow")}</span>
              <h1 id="setup-title">{t("setup.operationTitle")}</h1>
              <p>{t("setup.operationDescription")}</p>
              <ToggleRow
                checked={settings.backgroundCollectionEnabled}
                description={t("setup.backgroundDescription")}
                label={t("setup.backgroundLabel")}
                onChange={(checked) => setSettings((current) => ({ ...current, backgroundCollectionEnabled: checked }))}
              />
              <ToggleRow
                checked={settings.launchOnStartupEnabled}
                description={t("setup.startupDescription")}
                label={t("setup.startupLabel")}
                onChange={(checked) => setSettings((current) => ({ ...current, launchOnStartupEnabled: checked }))}
              />
              <ToggleRow
                checked={settings.localApiEnabled}
                description={t("setup.localApiDescription")}
                label={t("setup.localApiLabel")}
                onChange={(checked) => setSettings((current) => ({ ...current, localApiEnabled: checked }))}
              />
            </div>
          )}

          {step === 4 && (
            <div className={styles.step}>
              <span className={styles.stepIcon}><Check aria-hidden="true" size="var(--icon-size-xl)" /></span>
              <span className={styles.eyebrow}>{t("setup.reviewEyebrow")}</span>
              <h1 id="setup-title">{t("setup.reviewTitle")}</h1>
              <p>{t("setup.reviewDescription")}</p>
              <dl className={styles.summary}>
                <SummaryItem label={t("settings.language")} value={settings.language} />
                <SummaryItem label={t("setup.experienceLabel")} value={t(`setup.experience${capitalize(settings.experienceLevel)}`)} />
                <SummaryItem label={t("setup.jevKeyLabel")} value={typesafeApiKey || secretStatus.data?.typesafeApiKey ? t("setup.configured") : t("setup.notConfigured")} />
                <SummaryItem label={t("setup.backgroundLabel")} value={settings.backgroundCollectionEnabled ? t("setup.enabled") : t("setup.disabled")} />
                <SummaryItem label={t("setup.telemetryLabel")} value={t("setup.disabled")} />
              </dl>
              {submissionError && <p className={styles.error} role="alert">{submissionError}</p>}
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <button className={styles.secondaryButton} disabled={step === 0 || isSubmitting} onClick={() => setStep((current) => current - 1)} type="button">
            <ArrowLeft aria-hidden="true" size="var(--icon-size-sm)" />
            {t("setup.back")}
          </button>
          {step < totalSteps - 1 ? (
            <button className={styles.primaryButton} type="submit">
              {t("setup.continue")}
              <ArrowRight aria-hidden="true" size="var(--icon-size-sm)" />
            </button>
          ) : (
            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? t("setup.finishing") : t("setup.finish")}
              <Check aria-hidden="true" size="var(--icon-size-sm)" />
            </button>
          )}
        </footer>
      </form>
    </main>
  );
}

interface ChoiceButtonProps { active: boolean; label: string; onClick: () => void }
function ChoiceButton({ active, label, onClick }: ChoiceButtonProps) {
  return <button aria-pressed={active} className={styles.choiceButton} onClick={onClick} type="button">{label}</button>;
}

interface SelectFieldProps { label: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]>; value: string }
function SelectField({ label, onChange, options, value }: SelectFieldProps) {
  return (
    <label className={styles.inputField}>
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

interface ToggleRowProps { checked: boolean; description: string; label: string; onChange: (checked: boolean) => void }
function ToggleRow({ checked, description, label, onChange }: ToggleRowProps) {
  return (
    <label className={styles.toggleRow}>
      <span><strong>{label}</strong><small>{description}</small></span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
