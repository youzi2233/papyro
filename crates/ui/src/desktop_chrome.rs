#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopPlatformKind {
    MacOs,
    Windows,
    Linux,
    Other,
}

impl DesktopPlatformKind {
    pub fn current() -> Self {
        if cfg!(target_os = "macos") {
            Self::MacOs
        } else if cfg!(target_os = "windows") {
            Self::Windows
        } else if cfg!(target_os = "linux") {
            Self::Linux
        } else {
            Self::Other
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::MacOs => "macos",
            Self::Windows => "windows",
            Self::Linux => "linux",
            Self::Other => "other",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopChromePolicy {
    pub platform: DesktopPlatformKind,
    pub native_window_controls: bool,
}

impl DesktopChromePolicy {
    pub fn current() -> Self {
        Self::for_platform(DesktopPlatformKind::current())
    }

    pub fn for_platform(platform: DesktopPlatformKind) -> Self {
        Self {
            platform,
            native_window_controls: matches!(platform, DesktopPlatformKind::MacOs),
        }
    }

    pub fn uses_custom_window_controls(self) -> bool {
        !self.native_window_controls
    }

    pub fn uses_native_window_controls(self) -> bool {
        self.native_window_controls
    }

    pub fn shell_class(self) -> &'static str {
        match self.platform {
            DesktopPlatformKind::MacOs => "mn-platform-macos mn-native-window-controls",
            DesktopPlatformKind::Windows => "mn-platform-windows mn-custom-window-controls",
            DesktopPlatformKind::Linux => "mn-platform-linux mn-custom-window-controls",
            DesktopPlatformKind::Other => "mn-platform-other mn-custom-window-controls",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn macos_uses_native_window_controls() {
        let policy = DesktopChromePolicy::for_platform(DesktopPlatformKind::MacOs);

        assert!(policy.uses_native_window_controls());
        assert!(!policy.uses_custom_window_controls());
        assert_eq!(
            policy.shell_class(),
            "mn-platform-macos mn-native-window-controls"
        );
    }

    #[test]
    fn non_macos_uses_custom_window_controls() {
        for platform in [
            DesktopPlatformKind::Windows,
            DesktopPlatformKind::Linux,
            DesktopPlatformKind::Other,
        ] {
            let policy = DesktopChromePolicy::for_platform(platform);

            assert!(policy.uses_custom_window_controls());
            assert!(policy.shell_class().contains("mn-custom-window-controls"));
        }
    }
}
