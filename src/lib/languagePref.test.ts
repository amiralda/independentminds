import { describe, expect, it } from "vitest";
import { fromDbLang, initialLanguageAction, toDbLang } from "./languagePref";

describe("languagePref", () => {
  it("converts UI codes to lowercase DB codes", () => {
    expect(toDbLang("HT")).toBe("ht");
    expect(toDbLang("ZH")).toBe("zh");
  });

  it("reads DB codes back, whatever the case or region suffix", () => {
    expect(fromDbLang("ht")).toBe("HT");
    expect(fromDbLang("EN")).toBe("EN");
    expect(fromDbLang(" pt-BR ")).toBe("PT");
    expect(fromDbLang("zh_CN")).toBe("ZH");
    expect(fromDbLang("xx")).toBeNull();
    expect(fromDbLang("")).toBeNull();
    expect(fromDbLang(null)).toBeNull();
  });

  it("restores the saved profile language at login", () => {
    expect(initialLanguageAction("ht", true, "EN")).toEqual({ type: "apply", lang: "HT" });
    expect(initialLanguageAction("en", true, "FR")).toEqual({ type: "apply", lang: "EN" });
    expect(initialLanguageAction("fr", false, "EN")).toEqual({ type: "apply", lang: "FR" });
  });

  it("keeps the UI language when there is nothing to restore", () => {
    expect(initialLanguageAction("ht", true, "HT")).toEqual({ type: "keep" });
    expect(initialLanguageAction("", true, "HT")).toEqual({ type: "keep" });
    // brand-new account still on the 'en' default: the language picked before signup wins
    expect(initialLanguageAction("en", false, "HT")).toEqual({ type: "keep" });
  });
});
