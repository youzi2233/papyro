use anyhow::{Context, Result};
use std::ffi::OsString;
use std::path::PathBuf;

const APP_DATA_DIR_ENV: &str = "PAPYRO_APP_DATA_DIR";

pub(crate) fn app_data_base_dir(default_base: Option<PathBuf>) -> Option<PathBuf> {
    app_data_base_dir_from_env(default_base, std::env::var_os(APP_DATA_DIR_ENV))
}

fn app_data_base_dir_from_env(
    default_base: Option<PathBuf>,
    env_value: Option<OsString>,
) -> Option<PathBuf> {
    env_value
        .filter(|value| !value.as_os_str().is_empty())
        .map(PathBuf::from)
        .or(default_base)
}

pub(crate) fn ensure_app_data_dir(base: Option<PathBuf>) -> Result<PathBuf> {
    let dir = app_data_dir(base);
    std::fs::create_dir_all(&dir)
        .with_context(|| format!("failed to create app data directory {}", dir.display()))?;
    Ok(dir)
}

fn app_data_dir(base: Option<PathBuf>) -> PathBuf {
    base.unwrap_or_else(|| PathBuf::from(".")).join("papyro")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn app_data_dir_uses_system_base_when_available() {
        let dir = app_data_dir(Some(PathBuf::from("base")));

        assert_eq!(dir, PathBuf::from("base").join("papyro"));
    }

    #[test]
    fn app_data_dir_falls_back_to_current_directory() {
        let dir = app_data_dir(None);

        assert_eq!(dir, PathBuf::from(".").join("papyro"));
    }

    #[test]
    fn ensure_app_data_dir_creates_papyro_directory() {
        let base = temp_path("create");
        let expected = base.join("papyro");

        let dir = ensure_app_data_dir(Some(base.clone())).expect("app data dir is created");

        assert_eq!(dir, expected);
        assert!(dir.is_dir());

        let _ = fs::remove_dir_all(base);
    }

    #[test]
    fn ensure_app_data_dir_reports_creation_failure() {
        let base = temp_path("file-base");
        fs::write(&base, "not a directory").expect("test base file is written");

        let error = ensure_app_data_dir(Some(base.clone())).expect_err("file base must fail");

        assert!(error
            .to_string()
            .contains("failed to create app data directory"));

        let _ = fs::remove_file(base);
    }

    #[test]
    fn app_data_base_dir_prefers_test_hook() {
        assert_eq!(
            app_data_base_dir_from_env(
                Some(PathBuf::from("system-data")),
                Some(OsString::from("isolated-data"))
            ),
            Some(PathBuf::from("isolated-data"))
        );
    }

    #[test]
    fn app_data_base_dir_ignores_empty_test_hook() {
        assert_eq!(
            app_data_base_dir_from_env(
                Some(PathBuf::from("system-data")),
                Some(OsString::from(""))
            ),
            Some(PathBuf::from("system-data"))
        );
    }

    fn temp_path(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time is after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "papyro-platform-{label}-{}-{nanos}",
            std::process::id()
        ))
    }
}
