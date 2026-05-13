use pulldown_cmark::{Event, HeadingLevel, Options, Parser, Tag, TagEnd};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OutlineItem {
    pub level: u8,
    pub title: String,
    pub line_number: usize,
    pub anchor_id: String,
}

#[derive(Debug)]
struct HeadingDraft {
    level: u8,
    explicit_id: Option<String>,
    title: String,
    start_byte: usize,
}

pub fn extract_outline(markdown: &str) -> Vec<OutlineItem> {
    let line_starts = line_starts(markdown);
    let mut items = Vec::new();
    let mut anchors = AnchorRegistry::default();
    let mut heading = None::<HeadingDraft>;

    for (event, range) in Parser::new_ext(markdown, outline_options()).into_offset_iter() {
        match event {
            Event::Start(Tag::Heading { level, id, .. }) => {
                heading = Some(HeadingDraft {
                    level: heading_level(level),
                    explicit_id: id.map(|id| id.to_string()),
                    title: String::new(),
                    start_byte: range.start,
                });
            }
            Event::End(TagEnd::Heading(_)) => {
                let Some(heading) = heading.take() else {
                    continue;
                };
                let title = normalize_heading_text(&heading.title);
                if title.is_empty() {
                    continue;
                }

                let line_number = byte_to_line_number(&line_starts, heading.start_byte);
                let anchor_id = heading
                    .explicit_id
                    .filter(|id| !id.trim().is_empty())
                    .map(|id| anchors.unique_explicit(id.trim()))
                    .unwrap_or_else(|| anchors.unique_generated(&title, line_number));

                items.push(OutlineItem {
                    level: heading.level,
                    title,
                    line_number,
                    anchor_id,
                });
            }
            Event::Text(text)
            | Event::Code(text)
            | Event::InlineMath(text)
            | Event::DisplayMath(text) => {
                if let Some(heading) = heading.as_mut() {
                    heading.title.push_str(&text);
                }
            }
            Event::SoftBreak | Event::HardBreak => {
                if let Some(heading) = heading.as_mut() {
                    heading.title.push(' ');
                }
            }
            _ => {}
        }
    }

    items
}

fn outline_options() -> Options {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);
    options.insert(Options::ENABLE_MATH);
    options
}

fn heading_level(level: HeadingLevel) -> u8 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

fn normalize_heading_text(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn line_starts(markdown: &str) -> Vec<usize> {
    std::iter::once(0)
        .chain(
            markdown
                .bytes()
                .enumerate()
                .filter_map(|(index, byte)| (byte == b'\n').then_some(index + 1)),
        )
        .collect()
}

fn byte_to_line_number(line_starts: &[usize], byte: usize) -> usize {
    line_starts.partition_point(|start| *start <= byte)
}

#[derive(Debug, Default)]
struct AnchorRegistry {
    used: HashMap<String, usize>,
}

impl AnchorRegistry {
    fn unique_explicit(&mut self, id: &str) -> String {
        self.unique_id(id.to_string())
    }

    fn unique_generated(&mut self, title: &str, line_number: usize) -> String {
        let slug = slugify(title);
        let base = if slug.is_empty() {
            format!("section-{line_number}")
        } else {
            slug
        };
        self.unique_id(base)
    }

    fn unique_id(&mut self, base: String) -> String {
        let count = self.used.entry(base.clone()).or_insert(0);
        *count += 1;

        if *count == 1 {
            base
        } else {
            format!("{base}-{count}")
        }
    }
}

fn slugify(text: &str) -> String {
    let mut slug = String::new();
    let mut pending_separator = false;

    for character in text.chars().flat_map(char::to_lowercase) {
        if character.is_alphanumeric() {
            if pending_separator && !slug.is_empty() {
                slug.push('-');
            }
            slug.push(character);
            pending_separator = false;
        } else if !slug.is_empty() {
            pending_separator = true;
        }
    }

    slug
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(level: u8, title: &str, line_number: usize, anchor_id: &str) -> OutlineItem {
        OutlineItem {
            level,
            title: title.to_string(),
            line_number,
            anchor_id: anchor_id.to_string(),
        }
    }

    #[test]
    fn extract_outline_collects_atx_headings() {
        assert_eq!(
            extract_outline("# Title\n\n## Part\n### Detail ###"),
            vec![
                item(1, "Title", 1, "title"),
                item(2, "Part", 3, "part"),
                item(3, "Detail", 4, "detail"),
            ]
        );
    }

    #[test]
    fn extract_outline_collects_setext_headings() {
        assert_eq!(
            extract_outline("Title\n=====\n\nPart\n----\n\nBody"),
            vec![item(1, "Title", 1, "title"), item(2, "Part", 4, "part")]
        );
    }

    #[test]
    fn extract_outline_ignores_fenced_code() {
        assert_eq!(
            extract_outline("# Real\n```md\n# Not heading\n```\n## Next"),
            vec![item(1, "Real", 1, "real"), item(2, "Next", 5, "next")]
        );
    }

    #[test]
    fn extract_outline_rejects_invalid_or_empty_headings() {
        assert_eq!(extract_outline("#\n#NoSpace\n####### Too deep"), Vec::new());
    }

    #[test]
    fn extract_outline_normalizes_inline_markdown_titles() {
        assert_eq!(
            extract_outline("## **Bold** and [Link](https://example.test) `code` ~~gone~~"),
            vec![item(
                2,
                "Bold and Link code gone",
                1,
                "bold-and-link-code-gone"
            )]
        );
    }

    #[test]
    fn extract_outline_preserves_explicit_heading_ids() {
        assert_eq!(
            extract_outline("## Custom {#chosen-id}"),
            vec![item(2, "Custom", 1, "chosen-id")]
        );
    }

    #[test]
    fn extract_outline_deduplicates_anchor_ids() {
        assert_eq!(
            extract_outline("# Intro\n\n## Intro\n\n### Intro {#intro}"),
            vec![
                item(1, "Intro", 1, "intro"),
                item(2, "Intro", 3, "intro-2"),
                item(3, "Intro", 5, "intro-3"),
            ]
        );
    }

    #[test]
    fn extract_outline_generates_unicode_anchors() {
        assert_eq!(
            extract_outline("# 中文 标题"),
            vec![item(1, "中文 标题", 1, "中文-标题")]
        );
    }

    #[test]
    fn extract_outline_has_fallback_for_symbol_only_titles() {
        assert_eq!(
            extract_outline("# !!!"),
            vec![item(1, "!!!", 1, "section-1")]
        );
    }
}
