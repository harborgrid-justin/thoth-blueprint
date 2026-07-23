//! A minimal ZIP archive writer/reader supporting only the "stored" (method
//! 0, uncompressed) entry type — just enough to produce and read back a KMZ
//! archive (a ZIP containing one `doc.kml` plus optional resource files).
//! Not a general-purpose ZIP implementation: no `Deflate` compression, no
//! ZIP64, no encryption, no directory entries.
//!
//! Not part of this crate's public API surface — [`kml`][crate::kml] is the
//! only consumer.

use crate::error::{InteropError, InteropResult};

const FORMAT: &str = "KMZ/ZIP";

/// CRC-32 (IEEE 802.3), computed byte-at-a-time with the standard reversed
/// polynomial `0xEDB88320` — the checksum every ZIP local/central file
/// header requires.
fn crc32(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFF_FFFF;
    for &byte in data {
        crc ^= byte as u32;
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xEDB8_8320 & mask);
        }
    }
    !crc
}

/// One file to store in a ZIP archive.
pub struct ZipEntry<'a> {
    pub name: &'a str,
    pub data: &'a [u8],
}

/// Write a ZIP archive containing the given entries, using the "stored"
/// (uncompressed) method.
pub fn write_zip(entries: &[ZipEntry]) -> Vec<u8> {
    let mut out = Vec::new();
    let mut central_directory = Vec::new();
    let mut local_offsets = Vec::with_capacity(entries.len());

    for entry in entries {
        let offset = out.len() as u32;
        local_offsets.push(offset);
        let crc = crc32(entry.data);
        let name_bytes = entry.name.as_bytes();

        // Local file header.
        out.extend(0x0403_4b50u32.to_le_bytes());
        out.extend(20u16.to_le_bytes()); // version needed
        out.extend(0u16.to_le_bytes()); // flags
        out.extend(0u16.to_le_bytes()); // method = stored
        out.extend(0u16.to_le_bytes()); // mod time
        out.extend(0u16.to_le_bytes()); // mod date
        out.extend(crc.to_le_bytes());
        out.extend((entry.data.len() as u32).to_le_bytes()); // compressed size
        out.extend((entry.data.len() as u32).to_le_bytes()); // uncompressed size
        out.extend((name_bytes.len() as u16).to_le_bytes());
        out.extend(0u16.to_le_bytes()); // extra field length
        out.extend(name_bytes);
        out.extend(entry.data);

        // Central directory header (buffered, written after all locals).
        central_directory.extend(0x0201_4b50u32.to_le_bytes());
        central_directory.extend(20u16.to_le_bytes()); // version made by
        central_directory.extend(20u16.to_le_bytes()); // version needed
        central_directory.extend(0u16.to_le_bytes()); // flags
        central_directory.extend(0u16.to_le_bytes()); // method
        central_directory.extend(0u16.to_le_bytes()); // mod time
        central_directory.extend(0u16.to_le_bytes()); // mod date
        central_directory.extend(crc.to_le_bytes());
        central_directory.extend((entry.data.len() as u32).to_le_bytes());
        central_directory.extend((entry.data.len() as u32).to_le_bytes());
        central_directory.extend((name_bytes.len() as u16).to_le_bytes());
        central_directory.extend(0u16.to_le_bytes()); // extra length
        central_directory.extend(0u16.to_le_bytes()); // comment length
        central_directory.extend(0u16.to_le_bytes()); // disk number start
        central_directory.extend(0u16.to_le_bytes()); // internal attrs
        central_directory.extend(0u32.to_le_bytes()); // external attrs
        central_directory.extend(offset.to_le_bytes());
        central_directory.extend(name_bytes);
    }

    let central_directory_offset = out.len() as u32;
    out.extend(&central_directory);

    // End of central directory record.
    out.extend(0x0605_4b50u32.to_le_bytes());
    out.extend(0u16.to_le_bytes()); // disk number
    out.extend(0u16.to_le_bytes()); // disk with central dir
    out.extend((entries.len() as u16).to_le_bytes());
    out.extend((entries.len() as u16).to_le_bytes());
    out.extend((central_directory.len() as u32).to_le_bytes());
    out.extend(central_directory_offset.to_le_bytes());
    out.extend(0u16.to_le_bytes()); // comment length

    out
}

/// A file read back out of a ZIP archive.
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractedEntry {
    pub name: String,
    pub data: Vec<u8>,
}

fn read_u32(data: &[u8], off: usize) -> InteropResult<u32> {
    data.get(off..off + 4)
        .map(|b| u32::from_le_bytes(b.try_into().unwrap()))
        .ok_or_else(|| InteropError::Malformed {
            format: FORMAT,
            offset: off,
            reason: "unexpected end of archive".to_string(),
        })
}

fn read_u16(data: &[u8], off: usize) -> InteropResult<u16> {
    data.get(off..off + 2)
        .map(|b| u16::from_le_bytes(b.try_into().unwrap()))
        .ok_or_else(|| InteropError::Malformed {
            format: FORMAT,
            offset: off,
            reason: "unexpected end of archive".to_string(),
        })
}

/// Read every stored (uncompressed) entry out of a ZIP archive by walking
/// local file headers directly (does not require/validate the central
/// directory, mirroring how real unzip implementations tolerate a missing
/// or truncated central directory as long as local headers are intact).
///
/// # Errors
/// [`InteropError::Malformed`] if a local file header's signature is
/// invalid, or a header/data segment is truncated.
/// [`InteropError::Unsupported`] if an entry declares a compression method
/// other than "stored".
pub fn read_zip(data: &[u8]) -> InteropResult<Vec<ExtractedEntry>> {
    let mut entries = Vec::new();
    let mut cursor = 0usize;
    while cursor + 4 <= data.len() {
        let sig = read_u32(data, cursor)?;
        if sig != 0x0403_4b50 {
            break; // reached the central directory (or end of local headers)
        }
        let method = read_u16(data, cursor + 8)?;
        let compressed_size = read_u32(data, cursor + 18)? as usize;
        let name_len = read_u16(data, cursor + 26)? as usize;
        let extra_len = read_u16(data, cursor + 28)? as usize;
        let name_start = cursor + 30;
        let name_end = name_start + name_len;
        let data_start = name_end + extra_len;
        let data_end = data_start + compressed_size;
        if data_end > data.len() {
            return Err(InteropError::Malformed {
                format: FORMAT,
                offset: cursor,
                reason: "local file entry runs past end of archive".to_string(),
            });
        }
        if method != 0 {
            return Err(InteropError::Unsupported {
                format: FORMAT,
                reason: format!("compression method {method} is not supported (only stored/0)"),
            });
        }
        let name = String::from_utf8_lossy(&data[name_start..name_end]).into_owned();
        entries.push(ExtractedEntry {
            name,
            data: data[data_start..data_end].to_vec(),
        });
        cursor = data_end;
    }
    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_multiple_entries() {
        let entries = vec![
            ZipEntry {
                name: "doc.kml",
                data: b"<kml/>",
            },
            ZipEntry {
                name: "images/icon.png",
                data: b"\x89PNG\r\n",
            },
        ];
        let zip = write_zip(&entries);
        let extracted = read_zip(&zip).unwrap();
        assert_eq!(extracted.len(), 2);
        assert_eq!(extracted[0].name, "doc.kml");
        assert_eq!(extracted[0].data, b"<kml/>");
        assert_eq!(extracted[1].name, "images/icon.png");
    }

    #[test]
    fn crc32_matches_known_vector() {
        // "123456789" -> 0xCBF43926 is the standard CRC-32 check value.
        assert_eq!(crc32(b"123456789"), 0xCBF4_3926);
    }

    #[test]
    fn truncated_archive_is_malformed() {
        let zip = write_zip(&[ZipEntry {
            name: "a",
            data: b"hello world",
        }]);
        // Local file header + name + data is 30 + 1 + 11 = 42 bytes; cut off
        // partway through the data payload itself (well before the central
        // directory that follows it).
        let err = read_zip(&zip[..35]).unwrap_err();
        assert!(matches!(err, InteropError::Malformed { .. }));
    }
}
