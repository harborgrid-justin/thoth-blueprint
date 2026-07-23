//! Password hashing via Argon2id — the modern, memory-hard KDF recommended
//! by OWASP for password storage. Never store or compare plaintext
//! passwords.

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;

use super::AuthError;

/// Hash `password` with Argon2id and a freshly generated random salt,
/// returning the self-describing PHC string (`$argon2id$v=19$...`) that
/// [`verify_password`] can later check against.
pub fn hash_password(password: &str) -> Result<String, AuthError> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|err| AuthError::PasswordHash(err.to_string()))?;
    Ok(hash.to_string())
}

/// Check `password` against a previously hashed `password_hash`. The
/// underlying comparison (`argon2::password_hash::PasswordVerifier`) is
/// constant-time, so this doesn't leak timing information about how much of
/// the candidate matched.
pub fn verify_password(password: &str, password_hash: &str) -> Result<bool, AuthError> {
    let parsed =
        PasswordHash::new(password_hash).map_err(|err| AuthError::PasswordHash(err.to_string()))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashes_are_never_the_plaintext_password() {
        let hash = hash_password("correct horse battery staple").unwrap();
        assert_ne!(hash, "correct horse battery staple");
        assert!(hash.starts_with("$argon2id$"));
    }

    #[test]
    fn verifies_the_correct_password() {
        let hash = hash_password("hunter2").unwrap();
        assert!(verify_password("hunter2", &hash).unwrap());
    }

    #[test]
    fn rejects_an_incorrect_password() {
        let hash = hash_password("hunter2").unwrap();
        assert!(!verify_password("wrong-password", &hash).unwrap());
    }

    #[test]
    fn two_hashes_of_the_same_password_differ_by_salt() {
        let a = hash_password("hunter2").unwrap();
        let b = hash_password("hunter2").unwrap();
        assert_ne!(a, b);
        assert!(verify_password("hunter2", &a).unwrap());
        assert!(verify_password("hunter2", &b).unwrap());
    }

    #[test]
    fn rejects_a_malformed_hash() {
        let err = verify_password("hunter2", "not-a-valid-hash").unwrap_err();
        assert!(matches!(err, AuthError::PasswordHash(_)));
    }
}
