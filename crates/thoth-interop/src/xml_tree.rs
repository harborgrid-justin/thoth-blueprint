//! A tiny generic XML document tree, shared by every XML-based format this
//! crate reads (LandXML, KML). Not a public API surface on its own — it
//! exists so `landxml`/`kml` don't each reinvent a streaming-event state
//! machine; they navigate the resulting [`XmlNode`] tree with ordinary
//! field/method access instead.
//!
//! Namespace prefixes are stripped from tag and attribute local names (LandXML
//! and KML documents in the wild inconsistently prefix elements), so callers
//! match on local names only (`"Point"`, not `"LandXML:Point"`).

use std::collections::BTreeMap;

use quick_xml::events::{BytesStart, Event};
use quick_xml::name::QName;
use quick_xml::reader::Reader;

use crate::error::{InteropError, InteropResult};

/// One element of a parsed XML document: its local tag name, attributes,
/// concatenated direct text content, and child elements in document order.
#[derive(Debug, Clone, Default)]
pub struct XmlNode {
    pub tag: String,
    pub attrs: BTreeMap<String, String>,
    pub text: String,
    pub children: Vec<XmlNode>,
    /// Byte offset of this element's opening tag, for error messages.
    pub offset: usize,
}

impl XmlNode {
    /// An attribute's value, if present.
    pub fn attr(&self, name: &str) -> Option<&str> {
        self.attrs.get(name).map(String::as_str)
    }

    /// This element's direct text content, trimmed.
    pub fn text_trim(&self) -> &str {
        self.text.trim()
    }

    /// The first child element with the given local tag name.
    pub fn child(&self, tag: &str) -> Option<&XmlNode> {
        self.children.iter().find(|c| c.tag == tag)
    }

    /// Every child element with the given local tag name, in document order.
    pub fn children_named<'a>(&'a self, tag: &'a str) -> impl Iterator<Item = &'a XmlNode> {
        self.children.iter().filter(move |c| c.tag == tag)
    }
}

fn local_name(qname: QName) -> String {
    let full = String::from_utf8_lossy(qname.as_ref()).into_owned();
    match full.rsplit_once(':') {
        Some((_, local)) => local.to_string(),
        None => full,
    }
}

fn read_attrs(
    format: &'static str,
    offset: usize,
    start: &BytesStart,
) -> InteropResult<BTreeMap<String, String>> {
    let mut out = BTreeMap::new();
    for attr in start.attributes() {
        let attr = attr.map_err(|e| InteropError::Xml {
            format,
            offset,
            reason: format!("invalid attribute: {e}"),
        })?;
        let key = local_name(attr.key);
        let value = attr
            .unescape_value()
            .map_err(|e| InteropError::Xml {
                format,
                offset,
                reason: format!("invalid attribute value: {e}"),
            })?
            .into_owned();
        out.insert(key, value);
    }
    Ok(out)
}

/// Parse a complete XML document into a tree rooted at its single document
/// element.
///
/// # Errors
/// [`InteropError::Xml`] if the document is not well-formed (unclosed tags,
/// invalid escapes, ...) or has no document element at all.
pub fn parse_xml_tree(format: &'static str, xml: &str) -> InteropResult<XmlNode> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut stack: Vec<XmlNode> = Vec::new();
    let mut root: Option<XmlNode> = None;
    let mut buf = Vec::new();

    loop {
        let offset = reader.buffer_position() as usize;
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let tag = local_name(e.name());
                let attrs = read_attrs(format, offset, &e)?;
                stack.push(XmlNode {
                    tag,
                    attrs,
                    text: String::new(),
                    children: Vec::new(),
                    offset,
                });
            }
            Ok(Event::Empty(e)) => {
                let tag = local_name(e.name());
                let attrs = read_attrs(format, offset, &e)?;
                let node = XmlNode {
                    tag,
                    attrs,
                    text: String::new(),
                    children: Vec::new(),
                    offset,
                };
                place(&mut stack, &mut root, node);
            }
            Ok(Event::End(_)) => {
                let node = stack.pop().ok_or_else(|| InteropError::Xml {
                    format,
                    offset,
                    reason: "closing tag with no matching open tag".to_string(),
                })?;
                place(&mut stack, &mut root, node);
            }
            Ok(Event::Text(t)) => {
                let txt = t.unescape().map_err(|e| InteropError::Xml {
                    format,
                    offset,
                    reason: format!("invalid text content: {e}"),
                })?;
                if let Some(top) = stack.last_mut() {
                    top.text.push_str(&txt);
                }
            }
            Ok(Event::CData(t)) => {
                let txt = String::from_utf8_lossy(t.as_ref()).into_owned();
                if let Some(top) = stack.last_mut() {
                    top.text.push_str(&txt);
                }
            }
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(e) => {
                return Err(InteropError::Xml {
                    format,
                    offset,
                    reason: e.to_string(),
                })
            }
        }
        buf.clear();
    }

    if !stack.is_empty() {
        return Err(InteropError::Xml {
            format,
            offset: reader.buffer_position() as usize,
            reason: format!("{} unclosed element(s) at end of document", stack.len()),
        });
    }

    root.ok_or_else(|| InteropError::Xml {
        format,
        offset: 0,
        reason: "document has no root element".to_string(),
    })
}

fn place(stack: &mut Vec<XmlNode>, root: &mut Option<XmlNode>, node: XmlNode) {
    if let Some(parent) = stack.last_mut() {
        parent.children.push(node);
    } else {
        *root = Some(node);
    }
}

/// Escape a string for use as XML text content (`&`, `<`, `>`).
pub fn escape_text(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Escape a string for use as a double-quoted XML attribute value.
pub fn escape_attr(s: &str) -> String {
    escape_text(s).replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_nested_elements_and_attributes() {
        let xml = r#"<Root a="1"><Child b="2">hello</Child><Child b="3"/></Root>"#;
        let root = parse_xml_tree("Test", xml).unwrap();
        assert_eq!(root.tag, "Root");
        assert_eq!(root.attr("a"), Some("1"));
        let children: Vec<_> = root.children_named("Child").collect();
        assert_eq!(children.len(), 2);
        assert_eq!(children[0].text_trim(), "hello");
        assert_eq!(children[0].attr("b"), Some("2"));
        assert_eq!(children[1].attr("b"), Some("3"));
    }

    #[test]
    fn strips_namespace_prefixes() {
        let xml = r#"<lx:LandXML xmlns:lx="http://example.com"><lx:Points/></lx:LandXML>"#;
        let root = parse_xml_tree("Test", xml).unwrap();
        assert_eq!(root.tag, "LandXML");
        assert!(root.child("Points").is_some());
    }

    #[test]
    fn unclosed_tag_is_an_error() {
        let xml = r#"<Root><Child></Root>"#;
        assert!(parse_xml_tree("Test", xml).is_err());
    }

    #[test]
    fn empty_document_is_an_error() {
        assert!(parse_xml_tree("Test", "").is_err());
    }
}
