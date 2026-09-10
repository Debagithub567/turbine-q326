use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Vault has insufficient funds")]
    InsufficientFunds,

    #[msg("Unauthorized vault owner")]
    Unauthorized,
}
