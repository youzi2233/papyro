use crate::context::use_app_context;
use dioxus::prelude::*;
use papyro_core::models::{AccentColor, Theme};

pub const LIGHT_THEME_CLASS: &str = "theme-light";
pub const DARK_THEME_CLASS: &str = "theme-dark";

pub fn theme_dom_script(theme: &Theme, accent_color: &AccentColor) -> String {
    let theme_attr = match theme {
        Theme::System => "null".to_string(),
        _ => format!(r#""{}""#, theme.as_str()),
    };
    let explicit_dark = if theme.is_dark() { "true" } else { "false" };
    let accent_color =
        serde_json::to_string(accent_color.as_str()).unwrap_or_else(|_| "\"#2557d6\"".to_string());

    format!(
        r##"(function() {{
  var root = document.documentElement;
  var theme = {theme_attr};
  var accent = {accent_color};
  var query = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function parseHexColor(value) {{
    var match = /^#?([0-9a-f]{{6}})$/i.exec(String(value || "").trim());
    if (!match) return null;
    var hex = match[1];
    return {{
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    }};
  }}
  function toHex(channel) {{
    return Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, "0");
  }}
  function mixColor(color, target, targetAmount) {{
    var source = parseHexColor(color);
    var destination = parseHexColor(target);
    if (!source || !destination) return color;
    var amount = Math.max(0, Math.min(1, Number(targetAmount) || 0));
    return "#" +
      toHex(source.r * (1 - amount) + destination.r * amount) +
      toHex(source.g * (1 - amount) + destination.g * amount) +
      toHex(source.b * (1 - amount) + destination.b * amount);
  }}
  function rgbaColor(color, alpha) {{
    var parsed = parseHexColor(color);
    if (!parsed) return color;
    return "rgba(" + parsed.r + ", " + parsed.g + ", " + parsed.b + ", " + alpha + ")";
  }}
  function contrastInk(color) {{
    var parsed = parseHexColor(color);
    if (!parsed) return "#ffffff";
    var luminance = (0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b) / 255;
    return luminance > 0.58 ? "#0f172a" : "#ffffff";
  }}
  function applyPapyroAccent(dark) {{
    root.style.setProperty("--mn-accent", accent);
    root.style.setProperty(
      "--mn-accent-strong",
      mixColor(accent, dark ? "#ffffff" : "#0f172a", dark ? 0.22 : 0.18)
    );
    root.style.setProperty("--mn-accent-dim", rgbaColor(accent, dark ? 0.22 : 0.16));
    root.style.setProperty("--mn-accent-wash", rgbaColor(accent, dark ? 0.10 : 0.07));
    root.style.setProperty("--mn-accent-ink", contrastInk(accent));
    root.style.setProperty("--mn-selection", rgbaColor(accent, dark ? 0.30 : 0.20));
    root.style.setProperty("--mn-selection-bg", "var(--mn-selection)");
    root.style.setProperty("--mn-editor-selection", "var(--mn-selection)");
    root.style.setProperty("--mn-hybrid-selection", "var(--mn-selection)");
    root.style.setProperty("--mn-caret", accent);
    root.style.setProperty("--tt-selection-color", "var(--mn-selection)");
    root.style.setProperty("--tt-cursor-color", accent);
  }}
  function applyPapyroTheme() {{
    var dark = theme ? {explicit_dark} : !!(query && query.matches);
    if (theme) {{
      root.setAttribute("data-theme", theme);
    }} else {{
      root.removeAttribute("data-theme");
    }}
    root.classList.toggle("dark", dark);
    root.classList.toggle("{DARK_THEME_CLASS}", dark);
    root.classList.toggle("{LIGHT_THEME_CLASS}", !dark);
    applyPapyroAccent(dark);
  }}
  applyPapyroTheme();
  if (
    window.__papyroThemeMediaQuery &&
    window.__papyroThemeMediaListener &&
    window.__papyroThemeMediaQuery.removeEventListener
  ) {{
    window.__papyroThemeMediaQuery.removeEventListener(
      "change",
      window.__papyroThemeMediaListener
    );
  }}
  if (!theme && query && query.addEventListener) {{
    window.__papyroThemeMediaQuery = query;
    window.__papyroThemeMediaListener = applyPapyroTheme;
    query.addEventListener("change", applyPapyroTheme);
  }} else {{
    window.__papyroThemeMediaQuery = null;
    window.__papyroThemeMediaListener = null;
  }}
}})();"##
    )
}

#[component]
pub fn ThemeDomEffect() -> Element {
    let app = use_app_context();
    let theme = (app.theme)();
    let accent_color = (app.accent_color)();

    use_effect(use_reactive(
        (&theme, &accent_color),
        move |(theme, accent_color)| {
            document::eval(&theme_dom_script(&theme, &accent_color));
        },
    ));

    rsx! {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn theme_script_sets_official_dark_class_for_dark_themes() {
        let script = theme_dom_script(&Theme::GitHubDark, &AccentColor::new("#336699").unwrap());

        assert!(script.contains(r#"var theme = "github_dark";"#));
        assert!(script.contains(r##"var accent = "#336699";"##));
        assert!(script.contains(r#"var dark = theme ? true"#));
        assert!(script.contains(r#"root.classList.toggle("dark", dark)"#));
        assert!(script.contains(r#"root.style.setProperty("--mn-accent", accent)"#));
        assert!(script.contains(DARK_THEME_CLASS));
    }

    #[test]
    fn theme_script_tracks_system_theme_without_forcing_data_theme() {
        let script = theme_dom_script(&Theme::System, &AccentColor::default());

        assert!(script.contains("var theme = null;"));
        assert!(script.contains("prefers-color-scheme: dark"));
        assert!(script.contains(r#"root.removeAttribute("data-theme")"#));
        assert!(script
            .contains(r#"root.style.setProperty("--tt-selection-color", "var(--mn-selection)")"#));
        assert!(script.contains(LIGHT_THEME_CLASS));
    }
}
