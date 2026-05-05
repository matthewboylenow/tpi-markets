"use client";

import { useState, useTransition } from "react";
import { Input, Label, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "./RichTextEditor";
import { saveSiteSettings, type SiteSettingsInput } from "@/actions/site-settings";
import type { SiteSettings } from "@/lib/db/schema";

export function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState<SiteSettingsInput>({
    heroPillText: initial.heroPillText,
    heroH1Part1: initial.heroH1Part1,
    heroH1Part2: initial.heroH1Part2,
    heroSubheading: initial.heroSubheading,
    emptyStateText: initial.emptyStateText,
    emptyStateLinkText: initial.emptyStateLinkText,
    stat1Value: initial.stat1Value,
    stat1Label: initial.stat1Label,
    stat2Value: initial.stat2Value,
    stat2Label: initial.stat2Label,
    stat3Value: initial.stat3Value,
    stat3Label: initial.stat3Label,
    stat4Value: initial.stat4Value,
    stat4Label: initial.stat4Label,
    footerTagline: initial.footerTagline,
  });

  function set<K extends keyof SiteSettingsInput>(k: K, val: SiteSettingsInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await saveSiteSettings(v);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-8">
      <Section title="Hero">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label required>Pill text</Label>
            <Input value={v.heroPillText} onChange={(e) => set("heroPillText", e.target.value)} />
          </Field>
          <Field>
            <Label hint="Example: 'Your Business' renders as 'Your <em>Business</em>'">H1 (regular + italic accent)</Label>
            <div className="flex gap-2">
              <Input
                value={v.heroH1Part1}
                onChange={(e) => set("heroH1Part1", e.target.value)}
                placeholder="Your"
              />
              <Input
                value={v.heroH1Part2}
                onChange={(e) => set("heroH1Part2", e.target.value)}
                placeholder="Business"
                className="font-serif-italic text-tpi-blue"
              />
            </div>
          </Field>
        </div>
        <Field>
          <Label>Subheading</Label>
          <RichTextEditor
            value={v.heroSubheading}
            onChange={(json) => set("heroSubheading", json)}
            variant="minimal"
            placeholder="Choose your business to get started."
          />
        </Field>
      </Section>

      <Section title="Empty state (under business grid)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label required>Prompt</Label>
            <Input value={v.emptyStateText} onChange={(e) => set("emptyStateText", e.target.value)} />
          </Field>
          <Field>
            <Label required>Link text</Label>
            <Input value={v.emptyStateLinkText} onChange={(e) => set("emptyStateLinkText", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Trust strip stats">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="grid grid-cols-[1fr_2fr] gap-2">
              <Field>
                <Label required>{`Stat ${n} value`}</Label>
                <Input
                  value={v[`stat${n}Value` as keyof SiteSettingsInput] as string}
                  onChange={(e) => set(`stat${n}Value` as keyof SiteSettingsInput, e.target.value as never)}
                />
              </Field>
              <Field>
                <Label required>{`Stat ${n} label`}</Label>
                <Input
                  value={v[`stat${n}Label` as keyof SiteSettingsInput] as string}
                  onChange={(e) => set(`stat${n}Label` as keyof SiteSettingsInput, e.target.value as never)}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Footer">
        <Field>
          <Label required>Footer tagline</Label>
          <Input value={v.footerTagline} onChange={(e) => set("footerTagline", e.target.value)} />
        </Field>
      </Section>

      <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-tpi-cream py-3 -mx-8 px-8 border-t border-tpi-ink/10">
        {error && <span className="text-sm text-red-600">{error}</span>}
        {saved && <span className="text-sm text-green-700">Saved.</span>}
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-tpi-ink/10 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-tpi-stone mb-5">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
