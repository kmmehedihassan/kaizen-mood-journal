// src/app/settings/page.tsx
import type { Metadata } from "next";
import { ReminderSettingsCard } from "@/components/settings/ReminderSettingsCard";
import { SyncSettingsCard } from "@/components/settings/SyncSettingsCard";
import { AppearanceCard } from "@/components/settings/AppearanceCard";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-ink-2">Reminders, syncing between devices, and how Kaizen looks.</p>
      </header>
      <ReminderSettingsCard />
      <SyncSettingsCard />
      <AppearanceCard />
    </div>
  );
}
