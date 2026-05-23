import { useState } from "react";
import WoWPanel from "../components/wow/WoWPanel";
import WoWDivider from "../components/wow/WoWDivider";
import { loadPrefs, savePrefs } from "../services/preferences";
import { version } from "../../package.json";
import type { ColorScheme } from "../services/preferences";

interface SchemeOption {
  id: ColorScheme;
  label: string;
  desc: string;
  colors: { bg: string; accent: string; text: string };
}

const SCHEMES: SchemeOption[] = [
  {
    id: "default",
    label: "Default Gold",
    desc: "The classic WoW gold-on-dark theme",
    colors: { bg: "#0c0a09", accent: "#fbbf24", text: "#faf6f0" },
  },
  {
    id: "emerald",
    label: "Midnight Emerald",
    desc: "Deep forest greens and emerald accents",
    colors: { bg: "#0a0f0b", accent: "#34d973", text: "#ecfdf0" },
  },
  {
    id: "crimson",
    label: "Blood Elf Crimson",
    desc: "Rich reds fit for the Sin'dorei",
    colors: { bg: "#0f0808", accent: "#fb7185", text: "#fef2f2" },
  },
  {
    id: "nightelf",
    label: "Night Elf Purple",
    desc: "Arcane purples and violet hues",
    colors: { bg: "#0b0910", accent: "#a78bfa", text: "#f3e8ff" },
  },
  {
    id: "frost",
    label: "Frosty Blue",
    desc: "Icy blues from the Frozen Throne",
    colors: { bg: "#070b0f", accent: "#38bdf8", text: "#f0f9ff" },
  },
];

export default function SettingsPage() {
  const prefs = loadPrefs();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(prefs.colorScheme);

  function handleSchemeChange(scheme: ColorScheme) {
    setColorScheme(scheme);
    document.documentElement.setAttribute("data-theme", scheme);
    savePrefs({ colorScheme: scheme });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-wow-heading text-2xl tracking-wider text-wow-gold mb-6">
        Settings
      </h1>

      <WoWPanel className="p-6">
        <h2 className="font-wow-heading text-lg tracking-wider text-wow-gold mb-1">
          Color Scheme
        </h2>
        <p className="text-wow-text-dim text-sm mb-4">
          Choose the look and feel of WowAdder.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SCHEMES.map((scheme) => {
            const active = colorScheme === scheme.id;
            return (
              <button
                key={scheme.id}
                onClick={() => handleSchemeChange(scheme.id)}
                className={`group text-left rounded-sm border transition-all duration-150 p-3 ${
                  active
                    ? "border-wow-gold bg-wow-panel-hover shadow-[0_0_10px_rgba(251,191,36,0.1)]"
                    : "border-wow-border-light bg-wow-panel hover:border-wow-border-gold/50 hover:bg-wow-panel-hover"
                }`}
              >
                <div
                  className="h-12 rounded-sm border border-wow-border-light mb-2 overflow-hidden flex"
                >
                  <div
                    className="flex-1"
                    style={{ backgroundColor: scheme.colors.bg }}
                  />
                  <div
                    className="w-1/3"
                    style={{ backgroundColor: scheme.colors.accent }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border border-wow-border"
                    style={{ backgroundColor: scheme.colors.accent }}
                  />
                  <span
                    className={`font-wow-heading text-xs tracking-wider ${
                      active ? "text-wow-gold" : "text-wow-text-dim"
                    }`}
                  >
                    {scheme.label}
                  </span>
                </div>
                <p className="text-wow-text-muted text-[11px] mt-1 leading-tight">
                  {scheme.desc}
                </p>
              </button>
            );
          })}
        </div>

        <WoWDivider className="my-6" />

        <h2 className="font-wow-heading text-lg tracking-wider text-wow-gold mb-1">
          About WowAdder
        </h2>
        <p className="text-wow-text-dim text-sm leading-relaxed">
          A desktop addon manager for World of Warcraft. Browse, install, and
          manage addons from CurseForge directly from your desktop.
        </p>

        <div className="mt-4 flex items-center gap-4 text-xs text-wow-text-muted">
          <span>v{version}</span>
          <span className="w-px h-3 bg-wow-border-light" />
          <span>
            Data provided by{" "}
            <a
              href="https://www.curseforge.com/wow/addons"
              target="_blank"
              rel="noopener noreferrer"
              className="text-wow-gold hover:underline"
            >
              CurseForge
            </a>
          </span>
        </div>
      </WoWPanel>
    </div>
  );
}